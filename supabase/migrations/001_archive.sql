-- SIGNAL//ARCHIVE initial schema — apply once in Supabase SQL editor.
-- Requires an existing Supabase project with Auth enabled.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name varchar(40) not null check (char_length(trim(display_name)) >= 2),
  created_at timestamptz not null default now()
);

create or replace function public.create_archive_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare chosen_name text;
begin
  chosen_name := left(trim(coalesce(new.raw_user_meta_data->>'display_name','')),40);
  if char_length(chosen_name) < 2 then chosen_name := 'ARCHIVE CREATOR'; end if;
  insert into public.profiles (id, display_name) values (new.id, chosen_name)
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_archive_user_created on auth.users;
create trigger on_archive_user_created after insert on auth.users
  for each row execute function public.create_archive_profile();

create table if not exists public.archive_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.wallpapers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title varchar(90) not null check (char_length(trim(title)) between 3 and 90),
  description varchar(500),
  source_path text not null unique,
  published_path text unique,
  width integer not null check (width between 800 and 16000),
  height integer not null check (height between 600 and 16000),
  mime_type varchar(32) not null check (mime_type in ('image/jpeg','image/png','image/webp','image/avif')),
  byte_size bigint not null check (byte_size between 1 and 12582912),
  rights_attested boolean not null default false check (rights_attested),
  status varchar(12) not null default 'pending' check (status in ('pending','processing','approved','rejected')),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  constraint valid_private_path check (
    split_part(source_path,'/',1) = owner_id::text
    and source_path ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.(jpg|png|webp|avif)$'
  ),
  constraint valid_publishing_state check (
    (status = 'approved' and published_path is not null and published_at is not null)
    or (status <> 'approved' and published_path is null and published_at is null)
  )
);
create index if not exists wallpapers_public_feed on public.wallpapers(published_at desc) where status = 'approved';
create index if not exists wallpapers_pending_queue on public.wallpapers(created_at asc) where status = 'pending';
create index if not exists wallpapers_owner_feed on public.wallpapers(owner_id, created_at desc);

create table if not exists public.wallpaper_reports (
  id uuid primary key default gen_random_uuid(),
  wallpaper_id uuid not null references public.wallpapers(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason varchar(400) not null check (char_length(trim(reason)) between 10 and 400),
  status varchar(12) not null default 'pending' check (status in ('pending','resolved','dismissed')),
  created_at timestamptz not null default now(),
  unique (wallpaper_id, reporter_id)
);
create index if not exists reports_pending_idx on public.wallpaper_reports(created_at asc) where status='pending';

create table if not exists public.moderation_audit (
  id bigint generated always as identity primary key,
  wallpaper_id uuid references public.wallpapers(id) on delete set null,
  actor_id uuid not null,
  action varchar(12) not null check (action in ('approve','reject','unpublish')),
  occurred_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.wallpapers enable row level security;
alter table public.archive_admins enable row level security;
alter table public.wallpaper_reports enable row level security;
alter table public.moderation_audit enable row level security;

create policy "Public creator display names" on public.profiles
  for select to anon, authenticated using (true);
create policy "Members update own display names" on public.profiles
  for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Published wallpapers or own submissions" on public.wallpapers
  for select to anon, authenticated using (status = 'approved' or owner_id = (select auth.uid()));
create policy "Authenticated members can submit pending images" on public.wallpapers
  for insert to authenticated with check (
    owner_id = (select auth.uid())
    and status = 'pending'
    and published_path is null and published_at is null
    and rights_attested = true
  );
create policy "Members can report published wallpapers" on public.wallpaper_reports
  for insert to authenticated with check (
    reporter_id = (select auth.uid())
    and exists(select 1 from public.wallpapers w where w.id=wallpaper_id and w.status='approved')
  );
create policy "Members can see own reports" on public.wallpaper_reports
  for select to authenticated using (reporter_id=(select auth.uid()));
-- No client-side UPDATE/DELETE policy. Moderation is exclusively server-side.
-- No client access to archive_admins or moderation_audit. The server uses a secret service role.

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('wallpaper-submissions','wallpaper-submissions',false,12582912,
  array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('wallpaper-public','wallpaper-public',true,12582912,
  array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public=true, file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

create policy "Members upload only to their private folder" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'wallpaper-submissions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Members read their own staged images" on storage.objects
  for select to authenticated using (
    bucket_id = 'wallpaper-submissions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "Members clean up their own staged images" on storage.objects
  for delete to authenticated using (
    bucket_id = 'wallpaper-submissions'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
-- wallpaper-public is a public-read bucket. No policy permits user uploads to it.
-- Only a server configured with SUPABASE_SERVICE_ROLE_KEY may publish images.
