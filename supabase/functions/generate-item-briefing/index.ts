// Edge function: generate-item-briefing
// Gera briefings de TEXTO/LEGENDA e/ou VISUAL/IMAGEM para uma pauta específica
// Considera todo o contexto cadastrado: marca, persona, editoria, calendário e item.
// Usa Google Gemini API direta (GEMINI_API_KEY).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Kind = "text" | "image" | "both";

interface RequestBody {
  kind?: Kind;
  item: {
    title: string;
    theme?: string | null;
    scheduled_date?: string | null;
    platform?: string | null;
    format?: string | null;
    notes?: string | null;
  };
  calendar?: {
    name?: string | null;
    description?: string | null;
    user_input?: string | null;
    reference_month?: string | null;
  } | null;
  brand?: {
    name?: string | null;
    segment?: string | null;
    values?: string | null;
    keywords?: string | null;
    promise?: string | null;
    goals?: string | null;
    brand_color?: string | null;
  } | null;
  persona?: {
    name?: string | null;
    age?: string | null;
    main_goal?: string | null;
    challenges?: string | null;
    preferred_tone_of_voice?: string | null;
  } | null;
  theme?: {
    title?: string | null;
    description?: string | null;
    tone_of_voice?: string | null;
    target_audience?: string | null;
    color_palette?: string | null;
    objectives?: string | null;
    hashtags?: string | null;
  } | null;
}

function buildContext(b: RequestBody): string {
  const lines: string[] = [];

  if (b.brand?.name) {
    lines.push(`MARCA: ${b.brand.name}${b.brand.segment ? ` — ${b.brand.segment}` : ""}`);
    if (b.brand.promise) lines.push(`Promessa: ${b.brand.promise}`);
    if (b.brand.values) lines.push(`Valores: ${b.brand.values}`);
    if (b.brand.keywords) lines.push(`Palavras-chave: ${b.brand.keywords}`);
    if (b.brand.goals) lines.push(`Objetivos da marca: ${b.brand.goals}`);
    if (b.brand.brand_color) lines.push(`Cor da marca: ${b.brand.brand_color}`);
  }

  if (b.persona?.name) {
    lines.push(`PERSONA: ${b.persona.name}${b.persona.age ? ` (${b.persona.age})` : ""}`);
    if (b.persona.main_goal) lines.push(`Objetivo: ${b.persona.main_goal}`);
    if (b.persona.challenges) lines.push(`Desafios: ${b.persona.challenges}`);
    if (b.persona.preferred_tone_of_voice) lines.push(`Tom preferido: ${b.persona.preferred_tone_of_voice}`);
  }

  if (b.theme?.title) {
    lines.push(`EDITORIA: ${b.theme.title}`);
    if (b.theme.description) lines.push(`Descrição: ${b.theme.description}`);
    if (b.theme.tone_of_voice) lines.push(`Tom de voz: ${b.theme.tone_of_voice}`);
    if (b.theme.target_audience) lines.push(`Público-alvo: ${b.theme.target_audience}`);
    if (b.theme.color_palette) lines.push(`Paleta: ${b.theme.color_palette}`);
    if (b.theme.objectives) lines.push(`Objetivos da editoria: ${b.theme.objectives}`);
    if (b.theme.hashtags) lines.push(`Hashtags: ${b.theme.hashtags}`);
  }

  if (b.calendar?.name) {
    lines.push(`CALENDÁRIO: ${b.calendar.name}`);
    if (b.calendar.description) lines.push(`Descrição do calendário: ${b.calendar.description}`);
    if (b.calendar.user_input) lines.push(`Direção estratégica do mês: ${b.calendar.user_input}`);
    if (b.calendar.reference_month) {
      const d = new Date(b.calendar.reference_month);
      const monthLabel = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
      lines.push(`Mês de referência: ${monthLabel}`);
    }
  }

  lines.push(`PAUTA: ${b.item.title}`);
  if (b.item.theme) lines.push(`Tema da pauta: ${b.item.theme}`);
  if (b.item.scheduled_date) {
    const d = new Date(b.item.scheduled_date);
    lines.push(`Data de publicação: ${d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}`);
  }
  if (b.item.platform) lines.push(`Rede social: ${b.item.platform}`);
  if (b.item.format) lines.push(`Formato: ${b.item.format}`);
  if (b.item.notes) lines.push(`Observações: ${b.item.notes}`);

  return lines.join("\n");
}

const TEXT_SYSTEM = `Você é um copywriter brasileiro especialista em redes sociais. Escreva um BRIEFING DE TEXTO/LEGENDA (8 a 14 frases, até 1800 caracteres) para a pauta abaixo.

Inclua:
- Mensagem principal e ângulo da legenda.
- Tom de voz e estilo (alinhados à marca/persona/editoria).
- Estrutura sugerida: gancho de abertura, desenvolvimento, CTA.
- Sugestões de palavras-chave/temas a abordar e o que evitar.
- Considere o formato (Reels, Carrossel, Story, etc) e a rede social ao orientar a duração e o ritmo do texto.

REGRAS:
- Português do Brasil, linguagem natural, sem bullets.
- Não escreva a legenda final — escreva o BRIEFING para quem vai redigir.
- Não invente dados que não estão no contexto.`;

const IMAGE_SYSTEM = `Você é um diretor de arte brasileiro. Escreva um BRIEFING VISUAL/IMAGEM (8 a 14 frases, até 1800 caracteres) para a pauta abaixo.

Inclua:
- Conceito visual central e enquadramento.
- Cena/elementos principais e secundários.
- Paleta de cores (priorize a paleta da marca/editoria), iluminação e estilo fotográfico/ilustração.
- Tipografia e hierarquia de texto na imagem (se aplicável ao formato).
- Composição adequada ao formato (Reels 9:16, Carrossel 4:5, Feed 1:1, Story 9:16, etc) e à rede social.
- Mood e referências estéticas.

REGRAS:
- Português do Brasil, texto corrido, sem bullets.
- Não invente elementos da marca que não estão no contexto.
- Foque em direção visual clara para um designer/IA executar.`;

async function callGemini(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.85, maxOutputTokens: 1800 },
    }),
  });
  if (!response.ok) {
    const t = await response.text();
    console.error("Gemini API error:", response.status, t);
    if (response.status === 429) {
      throw new Error("RATE_LIMIT");
    }
    throw new Error("GEMINI_ERROR");
  }
  const data = await response.json();
  const out =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("").trim() || "";
  if (!out) throw new Error("EMPTY_RESPONSE");
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    if (!body?.item?.title) {
      return new Response(JSON.stringify({ error: "Pauta inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const kind: Kind = body.kind || "both";
    const context = buildContext(body);
    const userPrompt = `Contexto disponível:\n\n${context}\n\nEscreva o briefing solicitado.`;

    let text_briefing: string | undefined;
    let image_briefing: string | undefined;

    if (kind === "text" || kind === "both") {
      text_briefing = await callGemini(TEXT_SYSTEM, userPrompt, GEMINI_API_KEY);
    }
    if (kind === "image" || kind === "both") {
      image_briefing = await callGemini(IMAGE_SYSTEM, userPrompt, GEMINI_API_KEY);
    }

    return new Response(JSON.stringify({ text_briefing, image_briefing }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    const status = msg === "RATE_LIMIT" ? 429 : 500;
    const userMsg =
      msg === "RATE_LIMIT"
        ? "Limite de requisições do Gemini atingido. Tente em instantes."
        : "Não foi possível gerar o briefing com IA.";
    console.error("generate-item-briefing error:", e);
    return new Response(JSON.stringify({ error: userMsg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
