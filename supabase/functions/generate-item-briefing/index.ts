// Edge function: generate-item-briefing
// Gera briefings de TEXTO/LEGENDA e/ou VISUAL/IMAGEM para uma pauta específica
// Roda em background usando EdgeRuntime.waitUntil — mesmo se o cliente sair da página
// o resultado é PERSISTIDO direto em calendar_items.text_briefing/image_briefing.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Kind = "text" | "image" | "both";

interface RequestBody {
  // Modo recomendado: passar apenas item_id e kind. A função busca o contexto sozinha
  // e persiste o resultado direto no banco em background.
  item_id?: string;
  kind?: Kind;

  // Modo legado/sincrono: o cliente passa o contexto e recebe o briefing no payload.
  item?: {
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
  brand?: any;
  persona?: any;
  theme?: any;
}

function buildContext(b: {
  item: any;
  calendar?: any;
  brand?: any;
  persona?: any;
  theme?: any;
}): string {
  const lines: string[] = [];

  if (b.calendar?.user_input && String(b.calendar.user_input).trim().length > 0) {
    lines.push("===== BRIEFING PRINCIPAL DO CALENDÁRIO (FONTE DA VERDADE) =====");
    lines.push(String(b.calendar.user_input).trim());
    lines.push("===== FIM DO BRIEFING PRINCIPAL =====");
    lines.push("");
    lines.push("Use o briefing acima como direção central e não-negociável. Todo o briefing gerado abaixo deve ser uma extensão fiel desta orientação.");
    lines.push("");
  }

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

const TEXT_SYSTEM = `# AGENTE: COPYWRITER ESPECIALISTA EM BRIEFING DE TEXTO

Você é um(a) copywriter sênior brasileiro(a), com background em agências de publicidade e marketing de conteúdo. É especialista em copywriting para redes sociais, publicidade digital e direct response. Domina frameworks como AIDA, PAS (Problema-Agitação-Solução), 4Ps de copy, storytelling, ganchos de retenção, hierarquia de leitura, e melhores práticas por plataforma (Instagram, TikTok, LinkedIn, Facebook, YouTube).

SUA MISSÃO: escrever um BRIEFING DE TEXTO/LEGENDA detalhado e completo (pode ter até ~5000 palavras se necessário, sem cortar ideias) para a pauta abaixo. Você NÃO está escrevendo a legenda final — está orientando o redator que vai executá-la.

REGRA DE OURO — FIDELIDADE AO BRIEFING PRINCIPAL:
- O contexto contém um bloco "BRIEFING PRINCIPAL DO CALENDÁRIO (FONTE DA VERDADE)".
- Trate-o como direção INEGOCIÁVEL: tom, posicionamento, objetivos, temas, restrições e linguagem ali definidos DEVEM ser preservados.
- Não suavize, não reescreva, não substitua e não ignore nenhuma instrução desse bloco.
- Se o briefing principal disser algo específico (ex: foco em determinado produto, abordagem, palavra-chave, ângulo), reflita isso explicitamente no briefing gerado.

Inclua:
- Mensagem principal e ângulo da legenda (alinhados ao briefing principal).
- Objetivo de comunicação da peça (ex: gerar consideração, conversão, autoridade, engajamento) e qual emoção/ação esperada do leitor.
- Tom de voz e estilo (alinhados à marca/persona/editoria e ao briefing principal).
- Estrutura sugerida: gancho de abertura (com exemplos de variações), desenvolvimento, CTA específico.
- Sugestões de palavras-chave/temas a abordar e o que evitar.
- Considere o formato (Reels, Carrossel, Story, etc) e a rede social ao orientar a duração, ritmo do texto e melhores práticas de copy daquela plataforma.
- Se for carrossel/reels, sugira como o texto deve dialogar com cada slide/cena.

REGRAS:
- Português do Brasil, linguagem natural, sem bullets.
- Não escreva a legenda final — escreva o BRIEFING para quem vai redigir.
- Não invente dados que não estão no contexto.`;

const IMAGE_SYSTEM = `# AGENTE: DIRETOR(A) DE ARTE / DESIGNER DE ANÚNCIOS E REDES SOCIAIS

Você é um(a) diretor(a) de arte e designer brasileiro(a) sênior, especialista em criação de conteúdo visual para anúncios pagos (Meta Ads, TikTok Ads, Google Display) e redes sociais orgânicas. Tem domínio técnico avançado em:
- Composição visual (regra dos terços, leading lines, ponto focal, hierarquia visual, equilíbrio, contraste).
- Fotografia (ângulos de câmera: top-down, low angle, eye level, dutch angle; lentes; profundidade de campo; bokeh).
- Iluminação (natural, golden hour, hard light, soft light, rim light, backlight, studio key/fill/back, mood lighting).
- Tipografia para imagem (hierarquia, headline hero, peso, contraste, legibilidade em mobile).
- Especificações por formato e plataforma (Reels/Story 9:16, Feed 1:1 e 4:5, YouTube 16:9, Carrossel, thumbnails) e safe zones.
- Métricas e melhores práticas de performance criativa: hook visual nos primeiros frames, contraste para stop-the-scroll, CTR, retenção, padrões que performam em ads vs orgânico.
- Estilos visuais (editorial, lifestyle, produto em estúdio, UGC, flat lay, 3D, ilustração, minimalismo, maximalismo).

SUA MISSÃO: escrever um BRIEFING VISUAL/IMAGEM detalhado e completo (pode ter até ~5000 palavras se necessário, sem cortar ideias) para a pauta abaixo, pronto para ser executado por um designer humano OU por uma IA generativa de imagem.

REGRA DE OURO — FIDELIDADE AO BRIEFING PRINCIPAL:
- O contexto contém um bloco "BRIEFING PRINCIPAL DO CALENDÁRIO (FONTE DA VERDADE)".
- Trate-o como direção INEGOCIÁVEL: estilo, mood, referências, restrições visuais e elementos ali mencionados DEVEM ser preservados.
- Não suavize, não reescreva, não substitua e não ignore nenhuma instrução desse bloco.
- Se o briefing principal mencionar algo visual específico (cores, ambientação, pessoas, produto, estética), reflita isso explicitamente no briefing visual gerado.

Inclua:
- Conceito visual central, ponto focal e enquadramento (alinhados ao briefing principal).
- Cena/elementos principais e secundários, props, cenário, personagens (se houver) e direção de ação.
- Ângulo de câmera, lente sugerida e profundidade de campo.
- Iluminação detalhada (tipo, direção, intensidade, mood).
- Paleta de cores (priorize a paleta da marca/editoria), tratamento de cor e contraste.
- Tipografia e hierarquia de texto na imagem (se aplicável ao formato): headline, sub, CTA, peso e proporção.
- Composição adequada ao formato (Reels 9:16, Carrossel 4:5, Feed 1:1, Story 9:16, etc), respeitando safe zones da plataforma.
- Considerações de performance: como o visual cria stop-the-scroll, hook nos primeiros frames, leitura em mobile.
- Mood e referências estéticas (descreva visualmente, não cite marcas/fotógrafos por nome se não estiverem no contexto).

REGRAS:
- Português do Brasil, texto corrido, sem bullets.
- Não invente elementos da marca que não estão no contexto.
- Foque em direção visual clara, técnica e acionável.`;

async function callGemini(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.85, maxOutputTokens: 65536 },
    }),
  });
  if (!response.ok) {
    const t = await response.text();
    console.error("Gemini API error:", response.status, t);
    if (response.status === 429) throw new Error("RATE_LIMIT");
    throw new Error("GEMINI_ERROR");
  }
  const data = await response.json();
  const out =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text || "")
      .join("")
      .trim() || "";
  if (!out) throw new Error("EMPTY_RESPONSE");
  return out;
}

// Cliente admin para persistência (RLS-bypass) — usado apenas para escrever
// o resultado da IA na própria pauta cujo id foi validado a partir do JWT.
function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

async function loadContextById(itemId: string) {
  const admin = adminClient();
  const { data: item, error: itemErr } = await admin
    .from("calendar_items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();
  if (itemErr || !item) throw new Error("Pauta não encontrada");

  const { data: cal } = await admin
    .from("content_calendars")
    .select("name, description, user_input, reference_month, brand_id, persona_id, theme_id")
    .eq("id", item.calendar_id)
    .maybeSingle();

  const [brandRes, personaRes, themeRes] = await Promise.all([
    cal?.brand_id
      ? admin
          .from("brands")
          .select("name, segment, values, keywords, promise, goals, brand_color")
          .eq("id", cal.brand_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    cal?.persona_id
      ? admin
          .from("personas")
          .select("name, age, main_goal, challenges, preferred_tone_of_voice")
          .eq("id", cal.persona_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    cal?.theme_id
      ? admin
          .from("strategic_themes")
          .select("title, description, tone_of_voice, target_audience, color_palette, objectives, hashtags")
          .eq("id", cal.theme_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const meta = (item.metadata || {}) as Record<string, any>;
  return {
    item: {
      id: item.id,
      title: item.title,
      theme: item.theme,
      scheduled_date: item.scheduled_date,
      platform: meta.platform ?? null,
      format: meta.format ?? null,
      notes: item.notes,
    },
    rawItem: item,
    calendar: cal
      ? {
          name: cal.name,
          description: cal.description,
          user_input: cal.user_input,
          reference_month: cal.reference_month,
        }
      : null,
    brand: brandRes?.data ?? null,
    persona: personaRes?.data ?? null,
    theme: themeRes?.data ?? null,
  };
}

async function setStatus(
  itemId: string,
  status: "pending" | "done" | "error",
  kind: Kind,
  extra: Record<string, any> = {},
) {
  const admin = adminClient();
  const { data: cur } = await admin
    .from("calendar_items")
    .select("metadata")
    .eq("id", itemId)
    .maybeSingle();
  const meta = ((cur?.metadata as any) || {}) as Record<string, any>;
  meta.briefing_generation = {
    ...(meta.briefing_generation || {}),
    status,
    kind,
    updated_at: new Date().toISOString(),
    ...extra,
  };
  await admin.from("calendar_items").update({ metadata: meta }).eq("id", itemId);
}

async function runGeneration(itemId: string, kind: Kind) {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    await setStatus(itemId, "error", kind, { error: "GEMINI_API_KEY ausente" });
    return;
  }
  try {
    await setStatus(itemId, "pending", kind);
    const ctx = await loadContextById(itemId);
    const userPrompt = `Contexto disponível:\n\n${buildContext(ctx)}\n\nEscreva o briefing solicitado.`;

    const updates: Record<string, any> = {};
    if (kind === "text" || kind === "both") {
      updates.text_briefing = await callGemini(TEXT_SYSTEM, userPrompt, GEMINI_API_KEY);
    }
    if (kind === "image" || kind === "both") {
      updates.image_briefing = await callGemini(IMAGE_SYSTEM, userPrompt, GEMINI_API_KEY);
    }

    const admin = adminClient();
    await admin.from("calendar_items").update(updates).eq("id", itemId);
    await setStatus(itemId, "done", kind);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("Background briefing error:", msg);
    await setStatus(itemId, "error", kind, { error: msg });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    const kind: Kind = body.kind || "both";

    // ===== Modo background (recomendado): persistente, resiste a sair da página =====
    if (body.item_id) {
      // Marca pendente IMEDIATAMENTE para a UI mostrar feedback e dispara em background.
      await setStatus(body.item_id, "pending", kind);

      // EdgeRuntime.waitUntil mantém a tarefa viva mesmo após responder ao cliente.
      // @ts-ignore EdgeRuntime é provido pelo runtime do Supabase
      EdgeRuntime.waitUntil(runGeneration(body.item_id, kind));

      return new Response(
        JSON.stringify({ accepted: true, mode: "background", kind }),
        { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ===== Modo síncrono legado (compat) =====
    if (!body?.item?.title) {
      return new Response(JSON.stringify({ error: "Pauta inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const userPrompt = `Contexto disponível:\n\n${buildContext({
      item: body.item,
      calendar: body.calendar,
      brand: body.brand,
      persona: body.persona,
      theme: body.theme,
    })}\n\nEscreva o briefing solicitado.`;

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
