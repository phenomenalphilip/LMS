-- Reload schema cache to ensure PostgREST sees the new columns
NOTIFY pgrst, 'reload schema';


-- 1. Profiles Table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure columns exist if table was already created
alter table public.profiles add column if not exists username text;
alter table public.profiles drop constraint if exists profiles_username_key;
alter table public.profiles add constraint profiles_username_key unique (username);
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists industry text;
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists learning_goal text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists timezone text;
alter table public.profiles add column if not exists is_public boolean default true;
alter table public.profiles add column if not exists linkedin text;
alter table public.profiles add column if not exists twitter text;
alter table public.profiles add column if not exists website text;
alter table public.profiles add column if not exists last_read_notifications_at timestamp with time zone;
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

-- 4. Payment Methods Table
create table if not exists public.payment_methods (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  label text not null,
  provider text not null default 'Card',
  cardholder_name text,
  card_last4 text,
  card_expiry text,
  card_type text,
  -- Tokenization fields (server-side only, encrypted)
  authorization_token text,         -- AES-256-GCM encrypted authorization_code / Flutterwave token
  paystack_customer_code text,      -- Paystack customer code for reuse
  flw_transaction_id text,          -- Flutterwave transaction ID
  is_tokenized boolean default false, -- true = real reusable token captured
  is_default boolean default false,
  last_used_at timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.payment_methods add column if not exists cardholder_name text;
alter table public.payment_methods add column if not exists card_last4 text;
alter table public.payment_methods add column if not exists card_expiry text;
alter table public.payment_methods add column if not exists card_type text;
alter table public.payment_methods add column if not exists authorization_token text;
alter table public.payment_methods add column if not exists paystack_customer_code text;
alter table public.payment_methods add column if not exists flw_transaction_id text;
alter table public.payment_methods add column if not exists is_tokenized boolean default false;


alter table public.payment_methods enable row level security;

drop policy if exists "Users can view their own payment methods." on payment_methods;
create policy "Users can view their own payment methods."
  on payment_methods for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can insert their own payment methods." on payment_methods;
create policy "Users can insert their own payment methods."
  on payment_methods for insert
  with check ( auth.uid() = user_id );

drop policy if exists "Users can update their own payment methods." on payment_methods;
create policy "Users can update their own payment methods."
  on payment_methods for update
  using ( auth.uid() = user_id );

drop policy if exists "Users can delete their own payment methods." on payment_methods;
create policy "Users can delete their own payment methods."
  on payment_methods for delete
  using ( auth.uid() = user_id );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO anon;


-- 5. Payment Transactions Table
create table if not exists public.payment_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id text not null,
  course_title text not null,
  amount numeric not null,
  currency text not null default 'NGN',
  provider text not null,
  reference text,
  status text not null default 'success',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.payment_transactions enable row level security;

drop policy if exists "Users can view their own transactions." on payment_transactions;
create policy "Users can view their own transactions."
  on payment_transactions for select
  using ( auth.uid() = user_id );

drop policy if exists "Users can insert their own transactions." on payment_transactions;
create policy "Users can insert their own transactions."
  on payment_transactions for insert
  with check ( auth.uid() = user_id );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_transactions TO anon;

NOTIFY pgrst, 'reload schema';
