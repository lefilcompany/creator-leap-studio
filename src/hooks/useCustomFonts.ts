import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CustomFont {
  id: string;
  user_id: string;
  team_id: string | null;
  family_name: string;
  display_name: string;
  file_url: string;
  storage_path: string;
  format: string;
  file_size: number;
  created_at: string;
}

const ALLOWED_EXTENSIONS = ["ttf", "otf", "woff", "woff2"] as const;
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const loadedFamilies = new Set<string>();

/**
 * Register a custom font in the document so it can be used in CSS / canvas.
 * Idempotent: each family is only loaded once per page session.
 */
export async function ensureFontLoaded(family: string, url: string): Promise<void> {
  if (loadedFamilies.has(family)) return;
  try {
    const face = new FontFace(family, `url(${url})`);
    const loaded = await face.load();
    (document as any).fonts.add(loaded);
    loadedFamilies.add(family);
  } catch (err) {
    console.warn("[useCustomFonts] Failed to load font", family, err);
  }
}

function sanitizeName(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9 _-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60) || "Custom Font";
}

export function useCustomFonts() {
  const [fonts, setFonts] = useState<CustomFont[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchFonts = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("custom_fonts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      setFonts([]);
    } else {
      setFonts((data || []) as CustomFont[]);
      // Pre-register every font so previews and the canvas measure correctly.
      for (const f of data || []) {
        ensureFontLoaded(f.family_name, f.file_url);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFonts();
  }, [fetchFonts]);

  const uploadFont = useCallback(async (file: File): Promise<CustomFont | null> => {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext as any)) {
      toast.error("Formato inválido. Envie .ttf, .otf, .woff ou .woff2");
      return null;
    }
    if (file.size > MAX_SIZE) {
      toast.error("Arquivo muito grande (limite 5 MB)");
      return null;
    }

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      toast.error("Faça login para enviar uma fonte");
      return null;
    }

    setUploading(true);
    try {
      const display = sanitizeName(file.name);
      const fontId = crypto.randomUUID();
      const family = `Custom-${fontId.slice(0, 8)}`;
      const path = `${user.id}/${fontId}.${ext}`;

      const { error: upErr } = await supabase
        .storage
        .from("custom-fonts")
        .upload(path, file, { contentType: file.type || `font/${ext}`, upsert: false });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("custom-fonts").getPublicUrl(path);

      // Determine the team_id from the user's profile so team mates can see the font too.
      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("id", user.id)
        .maybeSingle();

      const insertPayload = {
        id: fontId,
        user_id: user.id,
        team_id: profile?.team_id ?? null,
        family_name: family,
        display_name: display,
        file_url: pub.publicUrl,
        storage_path: path,
        format: ext,
        file_size: file.size,
      };

      const { data: inserted, error: insErr } = await supabase
        .from("custom_fonts")
        .insert(insertPayload)
        .select("*")
        .single();
      if (insErr) throw insErr;

      await ensureFontLoaded(family, pub.publicUrl);
      const row = inserted as CustomFont;
      setFonts((prev) => [row, ...prev]);
      toast.success(`Fonte "${display}" enviada`);
      return row;
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Falha ao enviar fonte");
      return null;
    } finally {
      setUploading(false);
    }
  }, []);

  return { fonts, loading, uploading, uploadFont, refresh: fetchFonts };
}
