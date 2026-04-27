import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TemplateInput {
  briefingId?: string;
  brandId: string;
  themeId?: string | null;
  personaId?: string | null;
  platform?: string;
  objective?: string;
  contentType?: "organic" | "ads";
  idea: string;
  tone?: string[];
  additionalNotes?: string;
  mode?: "initial" | "more_alternatives";
  existingTemplates?: Array<{ title?: string; bigIdea?: string }>;
  count?: number;
}

const VALID_PLATFORMS = ["instagram", "facebook", "linkedin", "twitter", "tiktok"];
const VALID_VISUAL_STYLES = [
  "realistic",
  "animated",
  "cartoon",
  "anime",
  "watercolor",
  "oil_painting",
  "digital_art",
  "sketch",
  "minimalist",
  "vintage",
];
const VALID_ASPECT_RATIOS = ["1:1", "4:5", "5:4", "9:16", "16:9", "3:4", "4:3"];

function isLowQualityIdea(idea: string): { ok: boolean; reason?: string } {
  const trimmed = (idea || "").trim();
  if (trimmed.length < 30) {
    return { ok: false, reason: "A ideia precisa ter pelo menos 30 caracteres." };
  }
  // mostly repeated chars (xxx, aaa, ...)
  const unique = new Set(trimmed.toLowerCase().replace(/\s+/g, "")).size;
  const totalNoSpace = trimmed.replace(/\s+/g, "").length;
  if (totalNoSpace > 0 && unique / totalNoSpace < 0.2) {
    return { ok: false, reason: "A ideia parece conter caracteres repetidos sem sentido." };
  }
  if (/^([\.\-\_x\s]|teste|test)+$/i.test(trimmed)) {
    return { ok: false, reason: "Por favor, descreva uma ideia real para o conteúdo." };
  }
  return { ok: true };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate user via JWT
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const userId = userData.user.id;

    const supabase = createClient(supabaseUrl, supabaseService);

    const body = (await req.json()) as TemplateInput;
    const {
      briefingId,
      brandId,
      themeId,
      personaId,
      platform,
      objective,
      contentType = "organic",
      idea,
      tone = [],
      additionalNotes,
      mode = "initial",
      existingTemplates = [],
      count,
    } = body;

    // ---- Validation ----
    if (!brandId || typeof brandId !== "string") {
      return new Response(
        JSON.stringify({ error: "brandId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!idea || typeof idea !== "string") {
      return new Response(
        JSON.stringify({ error: "idea é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const ideaCheck = isLowQualityIdea(idea);
    if (!ideaCheck.ok) {
      return new Response(
        JSON.stringify({ error: ideaCheck.reason }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (platform && !VALID_PLATFORMS.includes(platform.toLowerCase())) {
      return new Response(
        JSON.stringify({ error: "Plataforma inválida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (idea.length > 4000 || (additionalNotes && additionalNotes.length > 2000)) {
      return new Response(
        JSON.stringify({ error: "Briefing muito longo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const numTemplates = mode === "more_alternatives"
      ? Math.min(Math.max(count ?? 2, 1), 3)
      : 1;

    // ---- Load context ----
    const { data: brand } = await supabase
      .from("brands")
      .select("name, segment, values, promise, keywords, goals, restrictions, brand_color")
      .eq("id", brandId)
      .maybeSingle();

    let theme: any = null;
    if (themeId) {
      const { data: themeData } = await supabase
        .from("strategic_themes")
        .select("title, description, tone_of_voice, target_audience, expected_action, best_formats, hashtags, color_palette")
        .eq("id", themeId)
        .maybeSingle();
      theme = themeData;
    }

    let persona: any = null;
    if (personaId) {
      const { data: personaData } = await supabase
        .from("personas")
        .select("name, gender, age, location, professional_context, beliefs_and_interests, main_goal, challenges, preferred_tone_of_voice, purchase_journey_stage, interest_triggers")
        .eq("id", personaId)
        .maybeSingle();
      persona = personaData;
    }

    // ---- Build prompt ----
    const platformLabel = platform || "instagram";
    const brandContext = brand
      ? `Marca: ${brand.name}\nSegmento: ${brand.segment ?? "n/a"}\nValores: ${brand.values ?? "n/a"}\nPromessa: ${brand.promise ?? "n/a"}\nPalavras-chave: ${brand.keywords ?? "n/a"}\nObjetivos: ${brand.goals ?? "n/a"}\nRestrições: ${brand.restrictions ?? "nenhuma"}\nCor da marca: ${brand.brand_color ?? "n/a"}`
      : "";
    const themeContext = theme
      ? `\n\nEditoria: ${theme.title}\nDescrição: ${theme.description}\nTom de voz: ${theme.tone_of_voice}\nPúblico-alvo: ${theme.target_audience}\nAção esperada: ${theme.expected_action}\nFormatos recomendados: ${theme.best_formats}`
      : "";
    const personaContext = persona
      ? `\n\nPersona: ${persona.name} — ${persona.gender}, ${persona.age}, ${persona.location}\nContexto profissional: ${persona.professional_context}\nObjetivo principal: ${persona.main_goal}\nDesafios: ${persona.challenges}\nTom preferido: ${persona.preferred_tone_of_voice}\nGatilhos de interesse: ${persona.interest_triggers}`
      : "";

    const avoidList = (existingTemplates || [])
      .map((t, i) => `${i + 1}. "${t.title || "—"}" — ${t.bigIdea || ""}`)
      .join("\n");

    const systemPrompt = `Você é um diretor de criação especialista em marketing digital brasileiro.
Sua função: a partir de um briefing, criar ${numTemplates} TEMPLATE(S) DE CONTEÚDO completos, prontos para virar uma postagem real.

CADA template DEVE conter:
- título chamativo
- formato adequado à plataforma (${platformLabel})
- "big idea" (conceito central em 1 frase)
- resumo (2-3 frases)
- legenda completa com gancho, corpo e CTA
- 5-10 hashtags relevantes
- CTA curto separado
- direção visual DETALHADA da imagem (não genérica): cenário, objetos, cores, iluminação, enquadramento, mood

Tipo de conteúdo: ${contentType === "ads" ? "ANÚNCIO PAGO (foco em conversão, gancho forte, CTA explícito)" : "CONTEÚDO ORGÂNICO (foco em conexão, valor e engajamento)"}

${mode === "more_alternatives" && avoidList ? `IMPORTANTE: já existem estes templates. Crie alternativas com ÂNGULOS DIFERENTES:\n${avoidList}\n` : ""}

Responda APENAS com um bloco JSON válido entre \`\`\`json ... \`\`\`, no formato:
\`\`\`json
{
  "templates": [
    {
      "title": "string",
      "format": "Reels|Carrossel|Post estático|Story|Vídeo curto",
      "bigIdea": "string",
      "summary": "string",
      "caption": "string completa pronta para publicar",
      "hashtags": ["#tag", ...],
      "cta": "string curta",
      "visualDirection": {
        "description": "descrição visual rica e específica em 2-4 frases",
        "visualStyle": "realistic|animated|cartoon|anime|watercolor|oil_painting|digital_art|sketch|minimalist|vintage",
        "mood": "string (ex: energético, sereno, profissional, vibrante)",
        "lighting": "string (ex: natural, dramática, suave, golden_hour)",
        "composition": "string (ex: centralizada, regra dos terços, simétrica)",
        "cameraAngle": "string (ex: eye_level, low_angle, top_down)",
        "colorPalette": "string descritiva (ex: tons quentes terrosos, contraste vibrante azul/laranja)",
        "aspectRatio": "1:1|4:5|9:16|16:9",
        "imageText": { "include": false, "content": "", "position": "center" }
      }
    }
  ]
}
\`\`\`
REGRAS:
- Responda EXATAMENTE ${numTemplates} template(s).
- Não invente fatos sobre a marca; use apenas o contexto fornecido.
- A legenda deve ser FINAL (não placeholder).
- A direção visual deve descrever uma cena concreta, não conceitos abstratos.`;

    const userPrompt = `${brandContext}${themeContext}${personaContext}

Plataforma: ${platformLabel}
Objetivo: ${objective || "engajamento"}
Tipo: ${contentType}
Tom de voz desejado: ${tone.length ? tone.join(", ") : "tom natural da marca"}
${additionalNotes ? `Notas adicionais: ${additionalNotes}` : ""}

BRIEFING / IDEIA INICIAL:
"""
${idea}
"""

Gere ${numTemplates} template(s) de conteúdo seguindo o esquema JSON exigido.`;

    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      return new Response(
        JSON.stringify({ error: "Service configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { temperature: 0.85, maxOutputTokens: 6000 },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini error", response.status, errText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({ error: "Falha ao gerar templates" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!rawText) {
      return new Response(
        JSON.stringify({ error: "Resposta vazia do serviço de IA" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: any;
    try {
      const match = rawText.match(/```json\s*([\s\S]*?)\s*```/i);
      const jsonStr = match ? match[1] : rawText;
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("JSON parse failed", e, rawText);
      return new Response(
        JSON.stringify({ error: "Resposta inválida do serviço de IA" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rawTemplates = Array.isArray(parsed?.templates) ? parsed.templates : [];
    const templates = rawTemplates.map((t: any, i: number) => {
      const vd = t?.visualDirection || {};
      const visualStyle = VALID_VISUAL_STYLES.includes(vd.visualStyle) ? vd.visualStyle : "realistic";
      const aspectRatio = VALID_ASPECT_RATIOS.includes(vd.aspectRatio) ? vd.aspectRatio : "1:1";
      return {
        id: crypto.randomUUID(),
        title: String(t?.title ?? `Template ${i + 1}`).slice(0, 200),
        format: String(t?.format ?? "Post estático").slice(0, 80),
        bigIdea: String(t?.bigIdea ?? "").slice(0, 400),
        summary: String(t?.summary ?? "").slice(0, 600),
        caption: String(t?.caption ?? "").slice(0, 3000),
        hashtags: Array.isArray(t?.hashtags) ? t.hashtags.slice(0, 15).map((h: any) => String(h)) : [],
        cta: String(t?.cta ?? "").slice(0, 200),
        visualDirection: {
          description: String(vd.description ?? "").slice(0, 1500),
          visualStyle,
          mood: String(vd.mood ?? "auto").slice(0, 80),
          lighting: String(vd.lighting ?? "natural").slice(0, 80),
          composition: String(vd.composition ?? "auto").slice(0, 80),
          cameraAngle: String(vd.cameraAngle ?? "eye_level").slice(0, 80),
          colorPalette: String(vd.colorPalette ?? "auto").slice(0, 200),
          aspectRatio,
          imageText: vd.imageText && typeof vd.imageText === "object"
            ? {
              include: Boolean(vd.imageText.include),
              content: String(vd.imageText.content ?? "").slice(0, 200),
              position: String(vd.imageText.position ?? "center").slice(0, 30),
            }
            : { include: false, content: "", position: "center" },
        },
      };
    });

    if (templates.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum template gerado. Tente refinar o briefing." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- Persist briefing (create or update) ----
    let savedBriefingId = briefingId ?? null;
    try {
      if (mode === "initial") {
        // Create or replace
        if (briefingId) {
          await supabase
            .from("content_briefings")
            .update({
              brand_id: brandId,
              theme_id: themeId ?? null,
              persona_id: personaId ?? null,
              platform: platform ?? null,
              objective: objective ?? null,
              content_type: contentType,
              idea,
              tone,
              additional_notes: additionalNotes ?? null,
              templates,
              status: "templates_generated",
              selected_template_id: templates[0]?.id ?? null,
            })
            .eq("id", briefingId)
            .eq("user_id", userId);
        } else {
          const { data: inserted } = await supabase
            .from("content_briefings")
            .insert({
              user_id: userId,
              team_id: userData.user?.user_metadata?.team_id ?? null,
              brand_id: brandId,
              theme_id: themeId ?? null,
              persona_id: personaId ?? null,
              platform: platform ?? null,
              objective: objective ?? null,
              content_type: contentType,
              idea,
              tone,
              additional_notes: additionalNotes ?? null,
              templates,
              status: "templates_generated",
              selected_template_id: templates[0]?.id ?? null,
            })
            .select("id")
            .single();
          savedBriefingId = inserted?.id ?? null;
        }
      } else if (mode === "more_alternatives" && briefingId) {
        // Append to existing templates
        const { data: existing } = await supabase
          .from("content_briefings")
          .select("templates")
          .eq("id", briefingId)
          .eq("user_id", userId)
          .maybeSingle();
        const merged = [
          ...((existing?.templates as any[]) ?? []),
          ...templates,
        ];
        await supabase
          .from("content_briefings")
          .update({ templates: merged })
          .eq("id", briefingId)
          .eq("user_id", userId);
      }
    } catch (persistErr) {
      console.warn("Briefing persistence failed (non-fatal):", persistErr);
    }

    return new Response(
      JSON.stringify({ briefingId: savedBriefingId, templates }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
