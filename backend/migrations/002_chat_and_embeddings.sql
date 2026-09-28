-- Migration: 002_chat_and_embeddings.sql
-- Description: Adds vector search, conversational history, and hybrid search functions.

-- 1. Enable pgvector
create extension if not exists vector;

-- 2. Update items table
alter table items alter column embedding type vector(2048);

alter table items add column if not exists fts tsvector generated always as (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(keywords::text, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(searchable_text, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(extracted_text, '')), 'D')
) stored;

create index if not exists items_fts_idx on items using gin (fts);
-- Skipped hnsw index because 2048 dimensions > 2000 limit

-- 3. Create conversations table
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  summary text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_conversations_user_id on conversations(user_id, updated_at desc);

alter table conversations enable row level security;
create policy "Users can manage their own conversations" on conversations
  for all using (auth.uid() = user_id);

-- 4. Create messages table
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text check (role in ('user', 'assistant')),
  content text not null,
  cited_item_ids uuid[] default '{}',
  created_at timestamptz default now()
);

create index if not exists idx_messages_conversation_id on messages(conversation_id, created_at);

alter table messages enable row level security;
create policy "Users can manage messages in their conversations" on messages
  for all using (
    exists (
      select 1 from conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

-- 5. Hybrid Search Function (Reciprocal Rank Fusion)
create or replace function hybrid_search_items(
  p_library text,
  p_query text,
  p_embedding vector(2048),
  p_limit int
)
returns table (id uuid, score float)
language plpgsql
as $$
begin
  return query
  with full_text as (
    select items.id, ts_rank(items.fts, websearch_to_tsquery('english', p_query)) as text_score
    from items
    where items.library_id = p_library
      and items.status = 'ready'
      and (p_query = '' or items.fts @@ websearch_to_tsquery('english', p_query))
  ),
  semantic as (
    select items.id, 1 - (items.embedding <=> p_embedding) as vector_score
    from items
    where items.library_id = p_library
      and items.status = 'ready'
      and p_embedding is not null
  ),
  ranked_text as (
    select full_text.id, row_number() over (order by full_text.text_score desc) as rnk
    from full_text
    where full_text.text_score > 0
  ),
  ranked_semantic as (
    select semantic.id, row_number() over (order by semantic.vector_score desc) as rnk
    from semantic
  )
  select
    coalesce(rt.id, rs.id) as id,
    coalesce(1.0 / (60 + rt.rnk), 0.0) + coalesce(1.0 / (60 + rs.rnk), 0.0) as score
  from ranked_text rt
  full outer join ranked_semantic rs on rt.id = rs.id
  order by score desc
  limit p_limit;
end;
$$;



