-- Reload schema cache to ensure PostgREST sees the new columns
NOTIFY pgrst, 'reload schema';


-- 1. Profiles Table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure columns exist if table was already created
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles enable row level security;

-- Profiles Policies (drop if exist to avoid errors, then create)
drop policy if exists "Public profiles are viewable by everyone." on profiles;
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

drop policy if exists "Users can insert their own profile." on profiles;
create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

drop policy if exists "Users can update own profile." on profiles;
create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );


-- Function to handle new user signup and create a profile automatically
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call the function on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Enrollments Table
create table if not exists public.enrollments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id text not null,
  progress integer default 0,
  enrolled_at timestamp with time zone default timezone('utc'::text, now()) not null,
  expires_at timestamp with time zone not null,
  completed boolean default false,
  completed_at timestamp with time zone
);

-- Ensure columns exist if table was already created
alter table public.enrollments add column if not exists progress integer default 0;
alter table public.enrollments add column if not exists enrolled_at timestamp with time zone default timezone('utc'::text, now()) not null;
alter table public.enrollments add column if not exists expires_at timestamp with time zone;
alter table public.enrollments add column if not exists completed boolean default false;
alter table public.enrollments add column if not exists completed_at timestamp with time zone;

-- Turn on RLS for enrollments
alter table public.enrollments enable row level security;

-- Enrollments Policies
drop policy if exists "Users can view their own enrollments." on enrollments;
create policy "Users can view their own enrollments."
  on enrollments for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can insert their own enrollments." on enrollments;
create policy "Users can insert their own enrollments."
  on enrollments for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can update their own enrollments." on enrollments;
create policy "Users can update their own enrollments."
  on enrollments for update
  using ( auth.uid() = user_id );

-- 3. Lesson Progress Table
create table if not exists public.lesson_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id text not null,
  item_id text not null,
  completed boolean default false,
  playback_position integer default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, course_id, item_id)
);

-- Turn on RLS for lesson_progress
alter table public.lesson_progress enable row level security;

-- Lesson Progress Policies
drop policy if exists "Users can view their own progress." on lesson_progress;
create policy "Users can view their own progress."
  on lesson_progress for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can insert their own progress." on lesson_progress;
create policy "Users can insert their own progress."
  on lesson_progress for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can update their own progress." on lesson_progress;
create policy "Users can update their own progress."
  on lesson_progress for update
  using ( auth.uid() = user_id );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO anon;
