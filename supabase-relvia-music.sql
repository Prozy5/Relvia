Exit code: 0
Wall time: 1.4 seconds
Output:
-- Relvia Music + Relvia Records
-- Run this once in Supabase Dashboard â†’ SQL Editor.
-- Admins are added manually: insert into public.user_roles (user_id, role) values ('AUTH-USER-UUID', 'label_admin');

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.user_role as enum ('listener', 'artist', 'label_admin');
create type public.release_kind as enum ('single', 'ep', 'album', 'playlist', 'live_session');
create type public.release_status as enum ('draft', 'scheduled', 'published', 'archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle citext unique,
  display_name text not null default 'Relvia listener',
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Kept separate from profiles so users cannot make themselves label admins.
create table public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.user_role not null default 'listener',
  created_at timestamptz not null default now()
);

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid unique references public.profiles(id) on delete set null,
  stage_name text not null unique,
  slug text not null unique,
  bio text,
  image_url text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.releases (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete restrict,
  title text not null,
  slug text not null unique,
  release_type public.release_kind not null default 'single',
  status public.release_status not null default 'draft',
  cover_url text,
  description text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  title text not null,
  track_number integer not null default 1 check (track_number > 0),
  duration_seconds integer not null check (duration_seconds > 0),
  audio_url text not null,
  lyrics text,
  is_explicit boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (release_id, track_number)
);

create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  cover_url text,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.playlist_tracks (
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  position integer not null check (position > 0),
  added_at timestamptz not null default now(),
  primary key (playlist_id, track_id),
  unique (playlist_id, position)
);

create table public.saved_tracks (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  track_id uuid not null references public.tracks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, track_id)
);

create table public.artist_follows (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, artist_id)
);

create table public.play_events (
  id bigint generated always as identity primary key,
  profile_id uuid references public.profiles(id) on delete set null,
  track_id uuid not null references public.tracks(id) on delete cascade,
  played_seconds integer not null default 0 check (played_seconds >= 0),
  created_at timestamptz not null default now()
);

create index releases_discovery_idx on public.releases (status, published_at desc);
create index tracks_release_idx on public.tracks (release_id, track_number);
create index playlists_owner_idx on public.playlists (owner_id);
create index play_events_profile_idx on public.play_events (profile_id, created_at desc);

create or replace function public.is_label_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles
    where user_id = (select auth.uid()) and role = 'label_admin'
  );
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger releases_set_updated_at before update on public.releases for each row execute function public.set_updated_at();
create trigger playlists_set_updated_at before update on public.playlists for each row execute function public.set_updated_at();

-- Create a listener profile automatically on Supabase Auth sign-up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'Relvia listener'));
  insert into public.user_roles (user_id) values (new.id);
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.artists enable row level security;
alter table public.releases enable row level security;
alter table public.tracks enable row level security;
alter table public.playlists enable row level security;
alter table public.playlist_tracks enable row level security;
alter table public.saved_tracks enable row level security;
alter table public.artist_follows enable row level security;
alter table public.play_events enable row level security;

create policy "Profiles are public" on public.profiles for select using (true);
create policy "Users create own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy "Users update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Artists are public" on public.artists for select using (true);
create policy "Artists manage their profile" on public.artists for update to authenticated using (profile_id = (select auth.uid()) or (select public.is_label_admin())) with check (profile_id = (select auth.uid()) or (select public.is_label_admin()));
create policy "Label admins create artists" on public.artists for insert to authenticated with check ((select public.is_label_admin()));

create policy "Published releases are public" on public.releases for select using (status = 'published' or (select public.is_label_admin()) or artist_id in (select id from public.artists where profile_id = (select auth.uid())));
create policy "Artists create releases" on public.releases for insert to authenticated with check ((select public.is_label_admin()) or artist_id in (select id from public.artists where profile_id = (select auth.uid())));
create policy "Artists update releases" on public.releases for update to authenticated using ((select public.is_label_admin()) or artist_id in (select id from public.artists where profile_id = (select auth.uid()))) with check ((select public.is_label_admin()) or artist_id in (select id from public.artists where profile_id = (select auth.uid())));

create policy "Published tracks are public" on public.tracks for select using (is_published and exists (select 1 from public.releases r where r.id = release_id and r.status = 'published') or (select public.is_label_admin()) or release_id in (select r.id from public.releases r join public.artists a on a.id = r.artist_id where a.profile_id = (select auth.uid())));
create policy "Artists manage tracks" on public.tracks for all to authenticated using ((select public.is_label_admin()) or release_id in (select r.id from public.releases r join public.artists a on a.id = r.artist_id where a.profile_id = (select auth.uid()))) with check ((select public.is_label_admin()) or release_id in (select r.id from public.releases r join public.artists a on a.id = r.artist_id where a.profile_id = (select auth.uid())));

create policy "Public playlists are visible" on public.playlists for select using (is_public or owner_id = (select auth.uid()));
create policy "Users manage own playlists" on public.playlists for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Playlist tracks follow playlist visibility" on public.playlist_tracks for select using (exists (select 1 from public.playlists p where p.id = playlist_id and (p.is_public or p.owner_id = (select auth.uid()))));
create policy "Owners manage playlist tracks" on public.playlist_tracks for all to authenticated using (exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = (select auth.uid()))) with check (exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = (select auth.uid())));
create policy "Users manage saved tracks" on public.saved_tracks for all to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "Users manage artist follows" on public.artist_follows for all to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));
create policy "Users manage own play history" on public.play_events for all to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()));

-- Public assets for an open streaming MVP. Change public = false and use signed URLs if releases become paid or private.
insert into storage.buckets (id, name, public) values ('relvia-music', 'relvia-music', true) on conflict (id) do update set public = true;
create policy "Anyone can stream public music" on storage.objects for select using (bucket_id = 'relvia-music');
create policy "Label admins upload music assets" on storage.objects for insert to authenticated with check (bucket_id = 'relvia-music' and (select public.is_label_admin()));
create policy "Label admins update music assets" on storage.objects for update to authenticated using (bucket_id = 'relvia-music' and (select public.is_label_admin())) with check (bucket_id = 'relvia-music' and (select public.is_label_admin()));
create policy "Label admins delete music assets" on storage.objects for delete to authenticated using (bucket_id = 'relvia-music' and (select public.is_label_admin()));

