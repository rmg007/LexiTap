-- Migration: user-backups storage bucket RLS
--
-- Applied 2026-06-01. Creates the path-scoped policy that locks each user
-- to their own backup slot: {userId}/user.db. The bucket itself was created
-- via the Supabase Management API (private; 25 MB per-object file-size limit
-- set 2026-06-01, under the project-global 50 MB storage cap).
--
-- RLS is already enabled on storage.objects by Supabase by default.
-- This policy is the only access control on the user-backups bucket.

CREATE POLICY "Users can read/write own backups"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'user-backups'
  AND auth.uid()::text = (string_to_array(name, '/'))[1]
)
WITH CHECK (
  bucket_id = 'user-backups'
  AND auth.uid()::text = (string_to_array(name, '/'))[1]
);
