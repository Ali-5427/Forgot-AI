-- Migration: 005_groups.sql
-- Description: Adds user-defined groups (collections) for organizing items.

CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#808080',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Allow anonymous fallback if needed (some users might not be fully signed in but still have a library_id)
-- If your app heavily relies on library_id (strings) rather than auth.users(id), you might want to use library_id TEXT instead of user_id UUID.
-- But since users can log in, we will use library_id to support guest users too.
ALTER TABLE groups ADD COLUMN IF NOT EXISTS library_id TEXT;
CREATE INDEX IF NOT EXISTS idx_groups_library_id ON groups(library_id);

ALTER TABLE items ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS group_name TEXT;
ALTER TABLE items ADD COLUMN IF NOT EXISTS group_color TEXT;

-- Setup RLS
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

-- If using authenticated users:
CREATE POLICY "Users can manage their own groups" 
ON groups FOR ALL 
USING (user_id = auth.uid() OR library_id = current_setting('request.headers')::json->>'x-library-id' ) 
WITH CHECK (user_id = auth.uid() OR library_id = current_setting('request.headers')::json->>'x-library-id');

