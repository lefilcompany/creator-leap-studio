// Edge function: generate-calendar
// Recebe contexto (marca/persona/editoria + briefing livre) e devolve uma lista de pautas
// Cada pauta contém: title, theme, scheduled_date (YYYY-MM-DD)

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
- Cada pauta deve ter um título curto e impactante (máx 80 caracteres).
- O tema (theme) é uma categoria curta (ex: "Bastidores", "Educativo", "Promoção", "Depoimento").
- Distribua as datas dentro do mês de ${monthLabel}, evitando finais de semana se possível.
- A primeira data deve ser próxima do início do mês, a última próxima do fim.
- Datas em formato ISO YYYY-MM-DD.`;

    const userPrompt = `${contextLines.join("\n")}

BRIEFING DO USUÁRIO:
${body.user_input}

Mês de referência: ${monthLabel}
Quantidade de pautas: ${count}`;

    const tool = {
      type: "function",
      function: {
        name: "generate_calendar_items",
        description: "Retorna a lista de pautas do calendário editorial.",
        parameters: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  theme: { type: "string" },
                  scheduled_date: { type: "string", description: "Data ISO YYYY-MM-DD" },
                },
                required: ["title", "theme", "scheduled_date"],
                additionalProperties: false,
              },
            },
          },
          required: ["items"],
          additionalProperties: false,
        },
      },
    };

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "generate_calendar_items" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições atingido. Tente novamente em instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos no workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro na IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("Resposta da IA sem tool_call");

    const parsed = JSON.parse(toolCall.function.arguments);
    const items: Pauta[] = parsed.items || [];

    if (items.length === 0) throw new Error("IA não retornou pautas");

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
