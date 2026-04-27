// Edge function: suggest-calendar-briefing
// Gera uma ideia de briefing de calendário com base no contexto (marca/persona/editoria)
// Usa Google Gemini API direta (GEMINI_API_KEY)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  brand?: { name?: string; segment?: string; values?: string; keywords?: string } | null;
  persona?: { name?: string; main_goal?: string; challenges?: string } | null;
  theme?: { title?: string; description?: string } | null;
  reference_month?: string;
  hint?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not configured");

    const refMonth = body.reference_month
      ? new Date(body.reference_month)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthLabel = refMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

    const contextLines: string[] = [];
    if (body.brand?.name) {
      contextLines.push(
        `MARCA: ${body.brand.name}${body.brand.segment ? ` (${body.brand.segment})` : ""}`
      );
      if (body.brand.values) contextLines.push(`Valores: ${body.brand.values}`);
      if (body.brand.keywords) contextLines.push(`Palavras-chave: ${body.brand.keywords}`);
    }
    if (body.persona?.name) {
      contextLines.push(`PERSONA: ${body.persona.name}`);
      if (body.persona.main_goal) contextLines.push(`Objetivo: ${body.persona.main_goal}`);
      if (body.persona.challenges) contextLines.push(`Desafios: ${body.persona.challenges}`);
    }
    if (body.theme?.title) {
      contextLines.push(`EDITORIA: ${body.theme.title}`);
      if (body.theme.description) contextLines.push(`Descrição: ${body.theme.description}`);
    }
    if (body.hint && body.hint.trim().length > 0) {
      contextLines.push(`PISTA DO USUÁRIO: ${body.hint}`);
    }

    const systemPrompt = `Você é um estrategista de marketing de conteúdo brasileiro. Sua tarefa é escrever um briefing detalhado (entre 8 e 15 frases, até 2500 caracteres) descrevendo o que a marca quer comunicar no mês, para quem, com qual abordagem e por quê.

REGRAS:
- Linguagem natural, direta, em português do Brasil.
- Mencione objetivo de comunicação, abordagem (educativo/bastidores/promoção/etc) e tom.
- Se houver pista do usuário (ex: data comemorativa, campanha), incorpore.
- Não use bullet points. Apenas texto corrido.
- Não inclua títulos de pautas, apenas a direção estratégica.`;

    const userPrompt = `${contextLines.join("\n") || "(sem contexto fornecido — gere algo genérico mas útil)"}

Mês de referência: ${monthLabel}

Escreva o briefing.`;

    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 500,
        },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Gemini API error:", response.status, t);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições do Gemini atingido. Tente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ error: "Erro na IA Gemini" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const briefing =
      data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("").trim() ||
      "";

    if (!briefing) {
      console.error("Gemini sem texto:", JSON.stringify(data).slice(0, 500));
      throw new Error("IA não retornou um briefing");
    }

    return new Response(JSON.stringify({ briefing }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-calendar-briefing error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
