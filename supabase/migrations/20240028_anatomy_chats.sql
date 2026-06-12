-- Anatomy chat history: stores each AI explanation session from the 3D Anatomy Explorer
create table if not exists anatomy_chats (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade not null,
  mesh_name    text not null,
  part_name    text not null,
  part_system  text not null default 'reference',
  model_key    text not null default 'skeleton',
  ai_response  text not null,
  chat_history jsonb not null default '[]',
  created_at   timestamptz default now() not null
);

alter table anatomy_chats enable row level security;

create policy "Users can read own anatomy chats"
  on anatomy_chats for select using (auth.uid() = user_id);

create policy "Users can insert own anatomy chats"
  on anatomy_chats for insert with check (auth.uid() = user_id);

create policy "Users can update own anatomy chats"
  on anatomy_chats for update using (auth.uid() = user_id);

create policy "Users can delete own anatomy chats"
  on anatomy_chats for delete using (auth.uid() = user_id);

create index anatomy_chats_user_created on anatomy_chats (user_id, created_at desc);
