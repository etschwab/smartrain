-- Security fix: closes a privilege-escalation hole in public.team_members RLS.
--
-- "team_members_insert_self_with_invite" and "team_members_update_self_with_invite"
-- (added in 202604250001_smartrain_invite_join_fixes.sql) let any authenticated
-- user INSERT or UPDATE their own team_members row - including the `role`
-- column - as long as *some* active invite existed for that team, regardless
-- of which role that invite actually grants. Anyone holding any active invite
-- link for a team (invite links are meant to be shared, that's their purpose)
-- could call the Supabase REST API directly with the public anon key and set
-- role = 'owner' on themselves, fully bypassing the app.
--
-- The real join flow has never used these policies: app/(marketing)/join/[inviteCode]
-- and lib/actions/team-actions.ts's joinTeamAction() call the SECURITY DEFINER
-- join_team_with_invite() RPC (added the next day, in
-- 202604260002_smartrain_rpc_team_invites.sql), which correctly sets
-- role = invite_record.role - the invite's own role, not user input. That RPC
-- bypasses RLS by design (SECURITY DEFINER) and does not depend on these
-- policies, so dropping them removes attack surface without touching any
-- feature that actually works today.

drop policy if exists "team_members_insert_self_with_invite" on public.team_members;
drop policy if exists "team_members_update_self_with_invite" on public.team_members;
