-- ============================================================
--  StudyLM — Full Schema Migration
--  Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ─── Tables ───────────────────────────────────────────────────────────────

create table profiles (
  id                uuid references auth.users(id) on delete cascade primary key,
  email             text        not null,
  full_name         text,
  avatar_url        text,
  role              text        not null default 'student' check (role in ('student', 'admin')),
  university        text,
  study_tokens      integer     not null default 1000,
  total_tokens_used integer     not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table notebooks (
  id          uuid        default uuid_generate_v4() primary key,
  user_id     uuid        not null references profiles(id) on delete cascade,
  title       text        not null,
  description text,
  emoji       text        not null default '📚',
  color       text        not null default '#4F46E5',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table sources (
  id          uuid        default uuid_generate_v4() primary key,
  notebook_id uuid        not null references notebooks(id) on delete cascade,
  user_id     uuid        not null references profiles(id) on delete cascade,
  title       text        not null,
  type        text        not null check (type in ('pdf', 'docx', 'txt', 'md', 'url', 'text')),
  content     text,
  file_url    text,
  word_count  integer,
  created_at  timestamptz not null default now()
);

create table ai_outputs (
  id          uuid        default uuid_generate_v4() primary key,
  notebook_id uuid        not null references notebooks(id) on delete cascade,
  user_id     uuid        not null references profiles(id) on delete cascade,
  type        text        not null check (type in (
                'summary', 'quiz', 'flashcards', 'mindmap',
                'studyguide', 'keyconcepts', 'podcast', 'chat_history'
              )),
  content     jsonb       not null,
  tokens_used integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (notebook_id, type)
);

create table chat_messages (
  id          uuid        default uuid_generate_v4() primary key,
  notebook_id uuid        not null references notebooks(id) on delete cascade,
  user_id     uuid        not null references profiles(id) on delete cascade,
  role        text        not null check (role in ('user', 'assistant')),
  content     text        not null,
  created_at  timestamptz not null default now()
);

create table token_transactions (
  id              uuid        default uuid_generate_v4() primary key,
  user_id         uuid        not null references profiles(id) on delete cascade,
  type            text        not null check (type in ('grant', 'spend', 'purchase', 'admin_grant')),
  amount          integer     not null,
  description     text,
  flutterwave_ref text,
  balance_after   integer,
  created_at      timestamptz not null default now()
);

create table payments (
  id               uuid        default uuid_generate_v4() primary key,
  user_id          uuid        not null references profiles(id) on delete cascade,
  flutterwave_ref  text        unique,
  amount_ngn       integer     not null,
  tokens_purchased integer     not null,
  status           text        not null default 'pending' check (status in ('pending', 'success', 'failed')),
  metadata         jsonb,
  created_at       timestamptz not null default now()
);
