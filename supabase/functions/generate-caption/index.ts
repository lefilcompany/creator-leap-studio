import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function cleanInput(text: string | string[] | undefined | null): string {
  if (!text) return "";
  
  if (Array.isArray(text)) {
    return text
      .map(item => String(item || ""))
      .join(", ")
      .replace(/[^\\w\\sÀ-ÿ,.-]/gi, "")
      .trim();
  }
  
  return String(text)
    .replace(/[^\\w\\sÀ-ÿ,.-]/gi, "")
    .replace(/\\s+/g, " ")
    .trim();
}

function buildCaptionPrompt(formData: any): string {
  const brandName = cleanInput(formData.brand);
  const themeName = cleanInput(formData.theme);
  const platform = cleanInput(formData.platform);
  const objective = cleanInput(formData.objective);
  const imageDescription = cleanInput(formData.imageDescription);
  const toneOfVoice = Array.isArray(formData.tone) 
    ? formData.tone.map((t: any) => cleanInput(t)).join(", ")
    : cleanInput(formData.tone);
  const personaDescription = cleanInput(formData.persona);
  const additionalInfo = cleanInput(formData.additionalInfo);

  const platformInstructions: Record<string, string> = {
    Instagram: `
- Máximo de 2.200 caracteres
- Use emojis estrategicamente
- Primeira linha deve ser impactante (aparece antes do "ver mais")
- Call-to-action no final
- 5-12 hashtags relevantes (separadas, não em bloco)
- Tom conversacional e engajador
    `,
    LinkedIn: `
- Máximo de 3.000 caracteres
- Tom profissional mas acessível
- Primeira linha deve gerar curiosidade
- Utilize quebras de linha para facilitar leitura
- 3-5 hashtags profissionais
- Incentive discussão nos comentários
    `,
    TikTok: `
- Máximo de 2.200 caracteres
- Tom jovem, dinâmico e autêntico
- Use emojis e linguagem informal
- Call-to-action direto
- 3-5 hashtags trending relevantes
    `,
    "Twitter/X": `
- Máximo de 280 caracteres
- Seja direto e impactante
- Use 1-2 hashtags estratégicas
- Incentive retweets/engajamento
    `
  };

  const specificInstructions = platformInstructions[platform] || platformInstructions.Instagram;

  return `
Você é um especialista em criação de conteúdo para redes sociais. Crie uma legenda COMPLETA e ENGAJADORA baseada nas seguintes informações:

**CONTEXTO:**
- Marca: ${brandName}
- Tema Estratégico: ${themeName}
- Plataforma: ${platform}
- Objetivo: ${objective}
- Descrição da Imagem: ${imageDescription}
${personaDescription ? `- Público-alvo: ${personaDescription}` : ''}
${toneOfVoice ? `- Tom de voz: ${toneOfVoice}` : ''}
${additionalInfo ? `- Informações adicionais: ${additionalInfo}` : ''}

**INSTRUÇÕES ESPECÍFICAS PARA ${platform.toUpperCase()}:**
${specificInstructions}

**ESTRUTURA OBRIGATÓRIA:**
1. **Título/Gancho**: Uma frase de impacto que captura atenção
2. **Corpo**: Desenvolvimento do conteúdo relacionado à imagem e objetivo
3. **Call-to-Action**: Incentivo claro para engajamento
4. **Hashtags**: Relevantes para o tema e plataforma

**IMPORTANTE:**
- A legenda DEVE se conectar diretamente com a descrição da imagem fornecida
- Use a linguagem e tom apropriados para a persona
- Incorpore elementos que incentivem interação (perguntas, enquetes, convites)
- Mantenha-se dentro do limite de caracteres da plataforma
- Seja criativo mas mantenha a identidade da marca

**FORMATO DE RESPOSTA (JSON VÁLIDO):**
{
  "title": "Título/gancho da postagem",
  "body": "Corpo completo da legenda com quebras de linha apropriadas",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"]
}

RETORNE APENAS O JSON, SEM TEXTO ADICIONAL ANTES OU DEPOIS.
  `.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { formData } = await req.json();
    
    // Input validation
    if (!formData || typeof formData !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid form data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!formData.imageDescription || typeof formData.imageDescription !== 'string' || formData.imageDescription.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Image description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (formData.imageDescription.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Description too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const validPlatforms = ['Instagram', 'LinkedIn', 'TikTok', 'Twitter', 'Facebook'];
    if (formData.platform && !validPlatforms.includes(formData.platform)) {
      return new Response(
        JSON.stringify({ error: 'Invalid platform' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = buildCaptionPrompt(formData);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Você é um especialista em marketing de conteúdo para redes sociais. Retorne APENAS JSON válido, sem texto adicional.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Empty content returned");
    }

    // Parse JSON
    let postContent;
    try {
      postContent = JSON.parse(content);
    } catch (parseError) {
      // Fallback
      postContent = {
        title: `${cleanInput(formData.brand)}: ${cleanInput(formData.theme)} 🚀`,
        body: `🌟 Confira este conteúdo incrível sobre ${cleanInput(formData.theme)}!\n\n${cleanInput(formData.imageDescription)}\n\n💡 ${cleanInput(formData.objective)}\n\nO que você achou? Deixe seu comentário! 👇`,
        hashtags: [
          cleanInput(formData.brand).toLowerCase().replace(/\s+/g, ""),
          cleanInput(formData.theme).toLowerCase().replace(/\s+/g, ""),
          "marketing",
          "conteudo",
          "digital"
        ]
      };
    }

    // Validate hashtags
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

    return new Response(
      JSON.stringify(postContent),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Unable to generate caption',
        caption: '',
        hashtags: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
