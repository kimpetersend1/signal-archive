-- Run AFTER creating and verifying your initial owner account.
-- Replace the placeholder with the real Auth user UUID from Supabase Dashboard > Authentication > Users.
-- Do not grant the role to an unknown user.
insert into public.archive_admins (user_id)
values ('00000000-0000-0000-0000-000000000000')
on conflict (user_id) do nothing;
-- IMPORTANT: Do not execute with the placeholder UUID. It will fail the foreign key check.
