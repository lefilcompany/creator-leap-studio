import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STYLE_INSTRUCTION =
  "Ultra realistic professional headshot portrait, 4k photography, 85mm lens, " +
  "soft natural studio lighting, shallow depth of field background blur, " +
  "looking directly at camera, neutral friendly expression, shoulders-up framing, " +
  "square 1:1 composition, vibrant true-to-life colors, sharp eyes. " +
  "No text, no watermark, no logo, no graphics overlay.";

function buildSubjectDescription(t: {
  gender: string;
  age: string;
  location: string;
  professional_context?: string | null;
  short_description?: string | null;
}): string {
  const g = (t.gender || "").toLowerCase();
  const isFemale = g.includes("fem") || g.includes("mulher");
  const isMale = g.includes("mas") || g.includes("homem");
  const subject = isFemale
    ? "Brazilian woman"
    : isMale
    ? "Brazilian man"
    : "Brazilian person";
  const ageNum = parseInt((t.age || "").replace(/\D/g, ""), 10);
  const ageStr = ageNum ? `${ageNum} years old` : t.age;
  const ctx = [t.professional_context, t.short_description]
    .filter(Boolean)
    .join(". ");
  return `${subject}, ${ageStr}, located in ${t.location}. Context: ${ctx}. Natural, authentic, diverse appearance.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const templateIds: string[] | undefined = body.template_ids;
    const force: boolean = body.force === true;

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Fetch templates that need an avatar
    let q = supabase
      .from("persona_templates")
      .select(
        "id, name, gender, age, location, professional_context, short_description, avatar_url"
      );
    if (templateIds && templateIds.length) q = q.in("id", templateIds);
    if (!force) q = q.is("avatar_url", null);
    const { data: templates, error: fetchErr } = await q;
    if (fetchErr) throw fetchErr;

    const results: Array<{ id: string; status: string; url?: string; error?: string }> = [];

    for (const t of templates || []) {
      try {
        const prompt = `${STYLE_INSTRUCTION} Subject: ${buildSubjectDescription(t)}`;
        const geminiUrl =
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`;

        const r = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
          }),
        });

        if (!r.ok) {
          const errText = await r.text();
          throw new Error(`Gemini ${r.status}: ${errText.slice(0, 300)}`);
        }

        const data = await r.json();
        const parts = data?.candidates?.[0]?.content?.parts || [];
        const imgPart = parts.find((p: any) => p.inlineData?.data);
        if (!imgPart) throw new Error("No image returned");
        const base64 = imgPart.inlineData.data as string;
        const mimeType = imgPart.inlineData.mimeType || "image/png";
        const ext = mimeType.includes("jpeg") ? "jpg" : "png";
        const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

        const filePath = `${t.id}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("persona-avatars")
          .upload(filePath, bytes, { contentType: mimeType, upsert: true });
        if (upErr) throw upErr;

        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/persona-avatars/${filePath}`;
        const { error: updErr } = await supabase
          .from("persona_templates")
          .update({ avatar_url: publicUrl })
          .eq("id", t.id);
        if (updErr) throw updErr;

        results.push({ id: t.id, status: "ok", url: publicUrl });
      } catch (e) {
        results.push({
          id: t.id,
          status: "error",
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
