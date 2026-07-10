// Edge function: image-edit-chat
// Conversational assistant that helps the user refine an image edit request.
// Given a chat history (user <-> assistant), it either asks another clarifying
// question OR returns a final refined prompt ready to be sent to edit-image.
//
// Response JSON:
//   { status: "ask",   message: string }
//   { status: "ready", message: string, refinedPrompt: string }

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é o **Assistente de Ajuste de Imagem** do Creator.

Seu papel: conversar com o usuário em português brasileiro para descobrir, com precisão, o que ele quer mudar na imagem gerada. Você NUNCA edita a imagem — apenas coleta a informação necessária para que outro modelo edite depois.

REGRAS:
1. Comece (ou continue) sempre de forma curta, amigável e objetiva. Uma pergunta por vez.
2. Se o pedido do usuário for vago ("tira o texto", "muda a cor", "melhora o fundo"), faça UMA pergunta clarificadora para eliminar ambiguidade. Exemplos de ambiguidade:
   - "tirar o texto" → qual texto especificamente? (título, subtítulo, rodapé, marca d'água, todos?)
   - "mudar a cor" → cor de que elemento? para qual cor?
   - "trocar o fundo" → por qual fundo? (cor sólida, gradiente, cenário específico)
   - "mudar a pessoa" → o que mudar nela? (roupa, expressão, posição, remover)
3. Nunca peça mais de 2 rodadas de perguntas. Se depois de 2 respostas ainda estiver ambíguo, assuma a interpretação mais provável e siga.
4. Quando tiver informação SUFICIENTE para uma instrução de edição precisa, PARE de perguntar e finalize.
5. Não invente elementos que o usuário não pediu. Se ele disse "tira o texto do rodapé", não altere mais nada.

FORMATO DE SAÍDA (obrigatório):
Responda SEMPRE com um único objeto JSON, sem markdown, sem \`\`\`, sem texto fora do JSON:

Para continuar perguntando:
{"status":"ask","message":"pergunta curta em pt-BR"}

Para finalizar:
{"status":"ready","message":"resumo curto do ajuste em pt-BR","refinedPrompt":"instrução clara e detalhada para o modelo de edição de imagem, em português, descrevendo exatamente o que mudar e o que preservar"}

O refinedPrompt deve:
- Ser uma instrução de edição direta e específica.
- Sempre incluir "Preserve todo o resto da imagem inalterado." no final.
- Nunca conter perguntas.`;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  // Try direct parse first
  try {
    return JSON.parse(trimmed);
  } catch {
    /* fallthrough */
  }
  // Strip markdown code fences if present
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim());
    } catch {
      /* fallthrough */
    }
  }
  // Fallback: first {...} block
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      /* fallthrough */
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];

    // First-turn: return the opening question deterministically (no model call needed).
    if (messages.length === 0) {
      return new Response(
        JSON.stringify({
          status: "ask",
          message:
            "Claro! O que você gostaria de ajustar nesta imagem? Descreva com o máximo de detalhe possível (elemento, cor, posição, texto…).",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const geminiContents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: geminiContents,
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 512,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("[image-edit-chat] Gemini error", response.status, errText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = extractJson(text) as
      | { status?: string; message?: string; refinedPrompt?: string }
      | null;

    if (!parsed || (parsed.status !== "ask" && parsed.status !== "ready")) {
      // Fallback: treat as ask
      return new Response(
        JSON.stringify({
          status: "ask",
          message: text?.trim() ||
            "Pode me dar mais detalhes sobre o que gostaria de ajustar?",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (parsed.status === "ready" && !parsed.refinedPrompt) {
      return new Response(
        JSON.stringify({
          status: "ask",
          message: parsed.message || "Pode confirmar o que devo ajustar?",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        status: parsed.status,
        message: parsed.message ?? "",
        ...(parsed.status === "ready" ? { refinedPrompt: parsed.refinedPrompt } : {}),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[image-edit-chat] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro desconhecido",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
