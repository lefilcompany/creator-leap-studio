import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function cleanInput(text: string | string[] | undefined | null): string {
  if (!text) return "";
  if (Array.isArray(text)) {
    return text.map(item => cleanInput(item)).join(", ");
  }
  const textStr = String(text);
  let cleanedText = textStr.replace(/[<>{}[\]"'`]/g, "");
  cleanedText = cleanedText.replace(/\s+/g, " ").trim();
  return cleanedText;
}

function buildCaptionPrompt(formData: any): string {
  const cleanedTones = Array.isArray(formData.tone)
    ? formData.tone.map(cleanInput).join(", ")
    : cleanInput(formData.tone);

  return `
# CONTEXTO ESTRATÉGICO
- **Marca/Empresa**: ${cleanInput(formData.brand)}
- **Tema Central**: ${cleanInput(formData.theme)}
- **Plataforma de Publicação**: ${cleanInput(formData.platform)}
- **Objetivo Estratégico**: ${cleanInput(formData.objective)}
- **Descrição Visual da Imagem**: ${cleanInput(formData.description)}
- **Persona Específica**: ${cleanInput(formData.persona) || "Não especificada"}
- **Tom de Voz/Comunicação**: ${cleanedTones || "Não especificado"}
- **Informações Complementares**: ${cleanInput(formData.additionalInfo) || "Não informado"}

# SUA MISSÃO COMO COPYWRITER ESPECIALISTA
Você é um copywriter especialista em redes sociais com mais de 10 anos de experiência criando conteúdos virais e de alto engajamento. Sua tarefa é criar uma legenda COMPLETA e ENVOLVENTE para ${cleanInput(formData.platform)}, seguindo as melhores práticas de marketing digital, storytelling e copywriting.

# ESTRUTURA IDEAL DA LEGENDA

## ABERTURA IMPACTANTE (1-2 linhas)
- Hook que desperta curiosidade ou emoção
- Pode ser uma pergunta, declaração ousada, ou estatística impressionante
- Deve conectar diretamente com a imagem

## DESENVOLVIMENTO (2-3 parágrafos)
- Conte uma história envolvente relacionada ao tema
- Agregue valor: insights, dicas ou informações relevantes
- Mantenha conexão emocional com o público

## CALL-TO-ACTION PODEROSO (1-2 linhas)
- Comando claro e específico
- Use verbos de ação: "Descubra", "Experimente", "Transforme", "Acesse"
- Inclua senso de urgência quando apropriado

## ELEMENTOS VISUAIS E INTERATIVOS
- Use emojis estrategicamente (máximo 3 por parágrafo)
- Adicione elementos que incentivem interação
- Inclua pelo menos 1 pergunta para engajamento

# DIRETRIZES DE LINGUAGEM E ESTILO

## Para Instagram/Facebook:
- Máximo 2.200 caracteres
- Primeiro parágrafo até 125 caracteres (antes do "ver mais")
- Use quebras de linha estratégicas
- Linguagem conversacional e próxima

## Para LinkedIn:
- Máximo 3.000 caracteres
- Tom mais profissional mas ainda humano
- Inclua insights e valor educacional
- Use dados quando relevante

## Para TikTok/Twitter/X:
- Máximo 2.200 caracteres
- Linguagem jovem e dinâmica
- Foco em entretenimento e valor rápido

# REGRAS TÉCNICAS DE SAÍDA
Responda EXCLUSIVAMENTE em JSON válido, sem texto adicional, explicações ou markdown.
Estrutura EXATA: {"title", "body", "hashtags"}

## ESPECIFICAÇÕES:
- **"title"**: Título magnético de 45-60 caracteres que funcione como headline
- **"body"**: Legenda completa de 800-1500 caracteres, rica em detalhes e engajamento
- **"hashtags"**: Array com 8-12 hashtags estratégicas (MIX de nicho + populares)

## FORMATAÇÃO DA LEGENDA:
- Use '\\n\\n' para parágrafos
- Use '\\n' para quebras simples
- Máximo 3 emojis por parágrafo
- Inclua pelo menos 1 pergunta para engajamento
- Termine com CTA forte e claro

Gere a legenda agora em formato JSON puro.
`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = buildCaptionPrompt(formData);
    console.log("📝 Gerando legenda com Gemini 2.5...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro na API:", response.status, errorText);
      throw new Error("Falha ao gerar legenda");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Conteúdo vazio retornado pela API");
    }

    // Tentar fazer parse do JSON
    let postContent;
    try {
      postContent = JSON.parse(content);
    } catch (parseError) {
      // Se falhar, criar fallback
      console.error("Erro ao fazer parse do JSON, usando fallback");
      postContent = {
        title: `${cleanInput(formData.brand)}: ${cleanInput(formData.theme)} 🚀`,
        body: `🌟 Confira este conteúdo incrível sobre ${cleanInput(formData.theme)}!\n\n${cleanInput(formData.description)}\n\n💡 ${cleanInput(formData.objective)}\n\nO que você achou? Deixe seu comentário! 👇`,
        hashtags: [
          cleanInput(formData.brand).toLowerCase().replace(/\s+/g, ""),
          cleanInput(formData.theme).toLowerCase().replace(/\s+/g, ""),
          "marketing",
          "conteudo",
          "digital"
        ]
      };
    }

    // Validação e correção das hashtags
    if (typeof postContent.hashtags === "string") {
      postContent.hashtags = postContent.hashtags
        .replace(/#/g, "")
        .split(/[\s,]+/)
        .filter(Boolean);
    }

    if (!Array.isArray(postContent.hashtags) || postContent.hashtags.length === 0) {
      postContent.hashtags = [
        cleanInput(formData.brand).toLowerCase().replace(/\s+/g, ""),
        cleanInput(formData.theme).toLowerCase().replace(/\s+/g, ""),
        "marketing"
      ];
    }

    postContent.hashtags = postContent.hashtags
      .map((tag: any) =>
        String(tag)
          .replace(/[^a-zA-Z0-9áéíóúàèìòùâêîôûãõçÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ]/g, "")
          .toLowerCase()
      )
      .filter((tag: string) => tag.length > 0)
      .slice(0, 12);

    console.log("✅ Legenda gerada com sucesso");

    return new Response(
      JSON.stringify(postContent),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Erro na função generate-caption:", error);
    
    // Fallback completo
    const formData = await req.json().catch(() => ({}));
    const fallback = {
      title: `${cleanInput(formData.brand || "Marca")}: Novidades 🚀`,
      body: `🌟 Confira nosso novo conteúdo!\n\n${cleanInput(formData.description || "Conteúdo exclusivo para você.")}\n\n💡 Não perca essa oportunidade!\n\nO que você achou? Comente abaixo! 👇`,
      hashtags: ["marketing", "conteudo", "digital", "novidades", "dicas"]
    };

    return new Response(
      JSON.stringify(fallback),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
