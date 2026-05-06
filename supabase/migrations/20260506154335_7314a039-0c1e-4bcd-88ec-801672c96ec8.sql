DROP POLICY IF EXISTS "Workspace owner upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Workspace owner update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Workspace owner delete avatars" ON storage.objects;

CREATE POLICY "Workspace owner upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'workspace-avatars'
  AND EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id::text = (storage.foldername(storage.objects.name))[1]
      AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "Workspace owner update avatars"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'workspace-avatars'
  AND EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id::text = (storage.foldername(storage.objects.name))[1]
      AND w.owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'workspace-avatars'
  AND EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id::text = (storage.foldername(storage.objects.name))[1]
      AND w.owner_id = auth.uid()
  )
);

CREATE POLICY "Workspace owner delete avatars"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'workspace-avatars'
  AND EXISTS (
    SELECT 1
    FROM public.workspaces w
    WHERE w.id::text = (storage.foldername(storage.objects.name))[1]
      AND w.owner_id = auth.uid()
  )
);