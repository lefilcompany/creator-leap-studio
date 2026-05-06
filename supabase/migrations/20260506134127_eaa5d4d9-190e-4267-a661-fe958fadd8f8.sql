
INSERT INTO storage.buckets (id, name, public) VALUES ('workspace-avatars', 'workspace-avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Workspace avatars public read" ON storage.objects FOR SELECT USING (bucket_id = 'workspace-avatars');
CREATE POLICY "Workspace owner upload avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'workspace-avatars'
  AND EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id::text = (storage.foldername(name))[1] AND w.owner_id = auth.uid())
);
CREATE POLICY "Workspace owner update avatars" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'workspace-avatars'
  AND EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id::text = (storage.foldername(name))[1] AND w.owner_id = auth.uid())
);
CREATE POLICY "Workspace owner delete avatars" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'workspace-avatars'
  AND EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id::text = (storage.foldername(name))[1] AND w.owner_id = auth.uid())
);
