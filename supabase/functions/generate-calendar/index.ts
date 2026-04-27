// Edge function: generate-calendar
// Gera lista de pautas (title, theme, scheduled_date) usando Gemini API direto.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RequestBody {
  brand?: { name?: string; segment?: string; values?: string; keywords?: string } | null;
  persona?: { name?: string; main_goal?: string; challenges?: string } | null;
  theme?: { title?: string; description?: string } | null;
  user_input: string;
  reference_month?: string; // YYYY-MM-01
  count?: number;
}

interface Pauta {
  title: string;
  theme: string;
  scheduled_date: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Configuração do servidor: chave do Gemini ausente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.user_input || body.user_input.trim().length < 5) {
      return new Response(
        JSON.stringify({ error: "Descreva o objetivo do calendário (mínimo 5 caracteres)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const count = Math.min(Math.max(body.count ?? 8, 3), 20);
    const refMonth = body.reference_month
      ? new Date(body.reference_month)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthLabel = refMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    const yearMonth = `${refMonth.getFullYear()}-${String(refMonth.getMonth() + 1).padStart(2, "0")}`;

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

    const systemPrompt = `Você é um estrategista de marketing de conteúdo brasileiro. Sua tarefa é gerar um calendário editorial com pautas criativas, relevantes e alinhadas ao contexto da marca.

REGRAS:
- Gere exatamente ${count} pautas únicas e variadas.
- Cada pauta tem um título curto e impactante (máx 80 caracteres).
- O tema (theme) é uma categoria curta (ex: "Bastidores", "Educativo", "Promoção", "Depoimento").
- Distribua as datas dentro do mês ${monthLabel} (use o prefixo ${yearMonth}-DD), evitando finais de semana se possível.
- A primeira pauta perto do início do mês, a última perto do fim.
- Datas em formato ISO YYYY-MM-DD.
- Responda APENAS com JSON válido no formato:
{"items":[{"title":"...","theme":"...","scheduled_date":"YYYY-MM-DD"}, ...]}
Sem texto adicional, sem markdown, sem cercas de código.`;

    const userPrompt = `${contextLines.join("\n")}

BRIEFING DO USUÁRIO:
${body.user_input}

Mês de referência: ${monthLabel}
Quantidade de pautas: ${count}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 2500,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições do Gemini atingido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: `Erro na IA Gemini: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error("Gemini sem texto:", JSON.stringify(data).slice(0, 500));
      throw new Error("IA não retornou conteúdo");
    }

    let parsed: { items?: Pauta[] };
    try {
      parsed = JSON.parse(text);
    } catch {
      // tenta extrair bloco JSON
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Resposta da IA não é JSON válido");
      parsed = JSON.parse(match[0]);
    }

    const items: Pauta[] = (parsed.items || []).filter(
      (i) => i && i.title && i.theme && i.scheduled_date
    );
    if (items.length === 0) throw new Error("IA não retornou pautas válidas");

    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-calendar error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
