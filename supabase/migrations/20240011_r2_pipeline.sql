-- R2 document pipeline: extend sources + add source_chunks

-- ── Enable pgvector (for future semantic search) ───────────────────────────
create extension if not exists vector with schema extensions;

-- ── Extend sources table ────────────────────────────────────────────────────
alter table sources
  add column if not exists file_path          text,
  add column if not exists processing_status  text not null default 'ready'
    check (processing_status in ('pending', 'processing', 'ready', 'error')),
  add column if not exists error_message      text,
  add column if not exists chunk_count        integer default 0,
  add column if not exists updated_at         timestamptz default now();

-- Existing rows already have content extracted, so mark them ready
update sources set processing_status = 'ready' where processing_status = 'ready';

-- ── source_chunks: stores extracted text in digestible pieces ───────────────
create table if not exists source_chunks (
  id          uuid        default uuid_generate_v4() primary key,
  source_id   uuid        not null references sources(id)   on delete cascade,
  notebook_id uuid        not null references notebooks(id) on delete cascade,
  user_id     uuid        not null references profiles(id)  on delete cascade,
  chunk_index integer     not null,
  content     text        not null,
  token_count integer     not null default 0,
  -- vector(1536) ready for OpenAI / Cohere embeddings when wired up
  embedding   extensions.vector(1536),
  created_at  timestamptz not null default now(),
  unique (source_id, chunk_index)
);

alter table source_chunks enable row level security;

create policy "Users manage own chunks"
  on source_chunks for all using (auth.uid() = user_id);

create index if not exists idx_source_chunks_source_id   on source_chunks (source_id);
create index if not exists idx_source_chunks_notebook_id on source_chunks (notebook_id);
create index if not exists idx_source_chunks_user_id     on source_chunks (user_id);

-- ── Vector similarity search RPC (ready for when embeddings are live) ───────
create or replace function match_chunks(
  query_embedding extensions.vector(1536),
  match_notebook  uuid,
  match_count     int default 10
)
returns table (
  id         uuid,
  source_id  uuid,
  content    text,
  similarity float
)
language sql stable as $$
  select
    sc.id,
    sc.source_id,
    sc.content,
    1 - (sc.embedding <=> query_embedding) as similarity
  from source_chunks sc
  where sc.notebook_id = match_notebook
    and sc.embedding is not null
  order by sc.embedding <=> query_embedding
  limit match_count;
$$;
