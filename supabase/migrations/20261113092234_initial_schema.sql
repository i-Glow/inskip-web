-- Initial schema: challenges, ideas, scores (see docs/architecture.md sections 2 and 3).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.idea_status as enum ('new', 'ai_scored', 'reviewed', 'duplicate');
create type public.criterion as enum ('impact', 'feasibility', 'alignment', 'innovation');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) default auth.uid(),
  title text not null,                 -- defaults to the uploaded file name
  source_filename text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  external_id text not null,           -- CSV: id
  submitted_on date,                   -- CSV: date_depot (parsed)
  submitted_on_raw text,               -- CSV: date_depot (as received)
  author_first_name text,              -- CSV: prenom
  author_last_name text,               -- CSV: nom
  direction text,                      -- CSV: direction
  site text,                           -- CSV: site
  theme text,                          -- CSV: theme
  title text not null,                 -- CSV: titre
  description text not null,           -- CSV: description
  expected_benefits text,              -- CSV: benefices_attendus
  budget_raw text,                     -- CSV: budget_estime (as received)
  budget_eur numeric,                  -- CSV: budget_estime (parsed)
  -- Normalised title + description, used for exact duplicate detection.
  content_key text generated always as (
    lower(regexp_replace(trim(title) || ' ' || trim(description), '\s+', ' ', 'g'))
  ) stored,
  status public.idea_status not null default 'new',
  duplicate_of uuid references public.ideas (id) on delete set null,
  shortlisted boolean not null default false,
  shortlist_rank int,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (challenge_id, external_id)
);
create index on public.ideas (challenge_id);
create index on public.ideas (challenge_id, content_key);

create table public.scores (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas (id) on delete cascade,
  criterion public.criterion not null,
  ai_score int check (ai_score between 1 and 5),
  ai_justification text,
  ai_model text,                       -- 'mock-v1' in V1
  ai_generated_at timestamptz,
  final_score int check (final_score between 1 and 5),
  final_justification text,
  updated_at timestamptz default now(),
  unique (idea_id, criterion)
);
create index on public.scores (idea_id);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger challenges_set_updated_at
  before update on public.challenges
  for each row execute function public.set_updated_at();

create trigger ideas_set_updated_at
  before update on public.ideas
  for each row execute function public.set_updated_at();

create trigger scores_set_updated_at
  before update on public.scores
  for each row execute function public.set_updated_at();

-- Touching an idea bumps its challenge's updated_at ("last update" in the list).
create function public.touch_challenge_from_idea()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_challenge_id uuid;
begin
  if tg_op = 'DELETE' then
    v_challenge_id := old.challenge_id;
  else
    v_challenge_id := new.challenge_id;
  end if;

  update public.challenges set updated_at = now() where id = v_challenge_id;
  return null;
end;
$$;

-- Touching a score bumps the challenge of its idea.
create function public.touch_challenge_from_score()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_idea_id uuid;
begin
  if tg_op = 'DELETE' then
    v_idea_id := old.idea_id;
  else
    v_idea_id := new.idea_id;
  end if;

  update public.challenges c
     set updated_at = now()
    from public.ideas i
   where i.id = v_idea_id
     and c.id = i.challenge_id;
  return null;
end;
$$;

create trigger ideas_touch_challenge
  after insert or update or delete on public.ideas
  for each row execute function public.touch_challenge_from_idea();

create trigger scores_touch_challenge
  after insert or update or delete on public.scores
  for each row execute function public.touch_challenge_from_score();

-- ---------------------------------------------------------------------------
-- View: per-idea score averages (runs with the caller's RLS)
-- ---------------------------------------------------------------------------
create view public.idea_averages
with (security_invoker = true) as
select
  s.idea_id,
  avg(s.ai_score)                                          as ai_average,
  avg(coalesce(s.final_score, s.ai_score))                 as final_average,
  count(coalesce(s.final_score, s.ai_score))               as scored_criteria_count
from public.scores s
group by s.idea_id;

-- ---------------------------------------------------------------------------
-- RPC: flag exact duplicates within a challenge (F6)
-- Original = earliest by submitted_on (nulls last), then external_id.
-- Returns the number of ideas in 'duplicate' state in the challenge afterwards.
-- ---------------------------------------------------------------------------
create function public.flag_exact_duplicates(p_challenge_id uuid)
returns int
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count int;
begin
  with ranked as (
    select
      i.id,
      first_value(i.id) over w as original_id,
      count(*) over (partition by i.content_key) as group_size
    from public.ideas i
    where i.challenge_id = p_challenge_id
    window w as (
      partition by i.content_key
      order by i.submitted_on asc nulls last, i.external_id asc, i.id asc
    )
  )
  update public.ideas t
     set duplicate_of = r.original_id,
         status = 'duplicate'
    from ranked r
   where t.id = r.id
     and r.group_size > 1
     and r.id <> r.original_id
     and t.duplicate_of is distinct from r.original_id;

  select count(*) into v_count
    from public.ideas
   where challenge_id = p_challenge_id
     and status = 'duplicate';

  return v_count;
end;
$$;

revoke execute on function public.flag_exact_duplicates(uuid) from anon, public;
grant execute on function public.flag_exact_duplicates(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security: owner-only, authenticated role only
-- ---------------------------------------------------------------------------
alter table public.challenges enable row level security;
alter table public.ideas enable row level security;
alter table public.scores enable row level security;

create policy challenges_owner_all on public.challenges
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy ideas_owner_all on public.ideas
  for all to authenticated
  using (
    exists (
      select 1 from public.challenges c
      where c.id = challenge_id and c.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.challenges c
      where c.id = challenge_id and c.owner_id = (select auth.uid())
    )
  );

create policy scores_owner_all on public.scores
  for all to authenticated
  using (
    exists (
      select 1
      from public.ideas i
      join public.challenges c on c.id = i.challenge_id
      where i.id = idea_id and c.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.ideas i
      join public.challenges c on c.id = i.challenge_id
      where i.id = idea_id and c.owner_id = (select auth.uid())
    )
  );

-- Nothing is readable by anon.
revoke all on public.challenges from anon;
revoke all on public.ideas from anon;
revoke all on public.scores from anon;
revoke all on public.idea_averages from anon;
