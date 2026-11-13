import { createClient } from 'jsr:@supabase/supabase-js@2'

/** Client scoped to the caller: RLS applies with the request's JWT. */
export function userClient(req: Request) {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false },
  })
}
