Exit code: 0
Wall time: 1.6 seconds
Output:
-- Relvia Live â€” Founding Creator Applications
-- Run after supabase-relvia-music.sql (it uses public.is_label_admin()).

create type public.application_status as enum ('submitted', 'reviewing', 'shortlisted', 'accepted', 'declined');

create table public.live_creator_applications (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  username text not null,
  platform text not null,
  followers integer not null check (followers >= 0),
  average_viewers integer check (average_viewers >= 0),
  content_description text not null,
  why_relvia text not null,
  social_links text not null,
  contact_email text not null,
  status public.application_status not null default 'submitted',
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index live_creator_applications_status_idx on public.live_creator_applications (status, created_at desc);
create trigger live_creator_applications_set_updated_at before update on public.live_creator_applications for each row execute function public.set_updated_at();
alter table public.live_creator_applications enable row level security;

-- Anyone can submit; applications are never publicly readable.
create policy "Anyone can submit a creator application"
on public.live_creator_applications for insert to anon, authenticated with check (true);
create policy "Label admins review creator applications"
on public.live_creator_applications for select to authenticated using ((select public.is_label_admin()));
create policy "Label admins update creator applications"
on public.live_creator_applications for update to authenticated using ((select public.is_label_admin())) with check ((select public.is_label_admin()));

