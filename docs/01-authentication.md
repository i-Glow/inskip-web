[← Back to PRD](../PRD.md)

# F1 — Authentication (magic link)

**Depends on:** none

## Requirements

- Login page with a single email field; Supabase Auth `signInWithOtp`.
- `/auth/callback` finalizes the session and redirects to the challenge list.
- Session persisted; logout in the header.
- All data scoped to the logged-in user via RLS ([architecture §3](../architecture.md#3-row-level-security)).

## Acceptance

After logging in from another browser, the user sees all their challenges and scores.

## Implementation notes

- Tables: none of its own; all tables rely on RLS keyed on `auth.uid()`.
- Front: `pages/LoginPage.tsx`, `pages/AuthCallbackPage.tsx`, `hooks/useAuth.ts`, `components/layout/ProtectedRoute.tsx`, `lib/supabase.ts`.
- Config: Supabase Auth site URL and redirect URL (`/auth/callback`), custom SMTP recommended.
