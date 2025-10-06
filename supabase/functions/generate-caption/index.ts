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
  const audience = cleanInput(formData.audience);
  const toneOfVoice = Array.isArray(formData.tone) 
    ? formData.tone.map((t: any) => cleanInput(t)).join(", ")
    : cleanInput(formData.tone);
  const personaDescription = cleanInput(formData.persona);
  const additionalInfo = cleanInput(formData.additionalInfo);

  // Validar campos obrigatórios
  if (!brandName || !platform || !objective || !imageDescription) {
    throw new Error("Campos obrigatórios faltando: marca, plataforma, objetivo e descrição da imagem");
  }

  const platformInstructions: Record<string, string> = {
    Instagram: `
## Para Instagram:
- Máximo 2.200 caracteres
- Primeiro parágrafo até 125 caracteres (antes do "ver mais")
- Use quebras de linha estratégicas para facilitar leitura
- Linguagem conversacional e próxima
- 8-12 hashtags MIX de nicho + populares
    `,
    Facebook: `
## Para Facebook:
- Máximo 2.200 caracteres
- Primeiro parágrafo até 125 caracteres (antes do "ver mais")
- Use quebras de linha estratégicas para facilitar leitura
- Linguagem conversacional e próxima
- 8-12 hashtags MIX de nicho + populares
    `,
    LinkedIn: `
## Para LinkedIn:
- Máximo 3.000 caracteres
- Tom mais profissional mas ainda humano
- Inclua insights e valor educacional
- Use dados e estatísticas quando relevante
- 5-8 hashtags profissionais
    `,
    TikTok: `
## Para TikTok/Reels:
- Máximo 2.200 caracteres
- Linguagem jovem e dinâmica
- Referências a tendências quando apropriado
- Foco em entretenimento e valor rápido
- 5-8 hashtags trending
    `,
    "Twitter/X": `
## Para Twitter/X:
- Máximo 280 caracteres
- Seja direto e impactante
- Use 1-2 hashtags estratégicas
- Incentive retweets/engajamento
    `
  };

  const specificInstructions = platformInstructions[platform] || platformInstructions.Instagram;

  return `
# CONTEXTO ESTRATÉGICO
- **Marca/Empresa**: ${brandName}
- **Tema Central**: ${themeName || "Não especificado"}
- **Plataforma de Publicação**: ${platform}
- **Objetivo Estratégico**: ${objective}
- **Descrição Visual da Imagem**: ${imageDescription}
- **Público-Alvo**: ${audience || "Não especificado"}
- **Persona Específica**: ${personaDescription || "Não especificada"}
- **Tom de Voz/Comunicação**: ${toneOfVoice || "Não especificado"}
- **Informações Complementares**: ${additionalInfo || "Não informado"}

# SUA MISSÃO COMO COPYWRITER ESPECIALISTA
Você é um copywriter especialista em redes sociais com mais de 10 anos de experiência criando conteúdos virais e de alto engajamento. Sua tarefa é criar uma legenda COMPLETA e ENVOLVENTE para a descrição da ${platform}, seguindo as melhores práticas de marketing digital, storytelling e copywriting.

# ESTRUTURA IDEAL DA LEGENDA (SIGA RIGOROSAMENTE)

## ABERTURA IMPACTANTE (1-2 linhas)
- Hook que desperta curiosidade ou emoção
- Pode ser uma pergunta, declaração ousada, ou estatística impressionante
- Deve conectar diretamente com a imagem

## DESENVOLVIMENTO (2-4 parágrafos)
- Conte uma história relacionada à imagem
- Conecte com o objetivo e a persona
- Use quebras de linha para facilitar leitura
- Incorpore gatilhos emocionais

## CALL-TO-ACTION PODEROSO (1-2 linhas)
- Comando claro e específico
- Use verbos de ação: "Descubra", "Experimente", "Transforme", "Acesse"
- Inclua senso de urgência quando apropriado

## ELEMENTOS VISUAIS E INTERATIVOS
- Use emojis estrategicamente (1 por parágrafo máximo)
- Adicione elementos que incentivem interação

# DIRETRIZES DE LINGUAGEM E ESTILO
${specificInstructions}

# REQUISITOS OBRIGATÓRIOS
- A legenda DEVE estar PERFEITAMENTE ALINHADA com a descrição da imagem: "${imageDescription}"
- MANTENHA coerência total com a identidade da marca ${brandName}
${themeName ? `- REFLITA o tema estratégico "${themeName}" de forma clara e natural` : ''}
${personaDescription ? `- ESCREVA diretamente para a persona definida: ${personaDescription}` : ''}
${audience ? `- FALE diretamente com o público: ${audience}` : ''}
${toneOfVoice ? `- MANTENHA o tom de voz: ${toneOfVoice}` : ''}
- Use linguagem de copywriter profissional, persuasiva e impactante
- Incorpore gatilhos emocionais e elementos que incentivem interação
- Inclua pelo menos 1 pergunta para engajamento
- Termine com CTA forte e claro

# REGRAS TÉCNICAS DE SAÍDA (CRÍTICAS)
- Resposta EXCLUSIVAMENTE em JSON válido
- ZERO texto adicional, explicações ou markdown
- Estrutura EXATA: {"title", "body", "hashtags"}

## ESPECIFICAÇÕES:
- **"title"**: Título magnético de 45-60 caracteres que funcione como headline
- **"body"**: Legenda completa de 800-1500 caracteres, rica em detalhes e engajamento
- **"hashtags"**: Array com 8-12 hashtags estratégicas (MIX de nicho + populares)

## FORMATAÇÃO DA LEGENDA:
- Use '\\n\\n' para parágrafos
- Use '\\n' para quebras simples
- Máximo 3 emojis por parágrafo
- Mantenha-se dentro do limite de caracteres da plataforma

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

  console.log('📝 [GENERATE-CAPTION] Iniciando geração de legenda');

  try {
    const { formData } = await req.json();
    
    console.log('📝 [GENERATE-CAPTION] Dados recebidos:', {
      brand: formData?.brand,
      theme: formData?.theme,
      platform: formData?.platform,
      hasDescription: !!formData?.imageDescription
    });

    // Input validation
    if (!formData || typeof formData !== 'object') {
      console.error('❌ [GENERATE-CAPTION] Invalid form data');
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
    
    console.log('🤖 [GENERATE-CAPTION] Chamando Gemini 2.5 Flash...');

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
      console.error(`❌ [GENERATE-CAPTION] AI gateway error: ${response.status}`);
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
      console.error('❌ [GENERATE-CAPTION] Empty content returned from AI');
      throw new Error("Empty content returned");
    }

    console.log('✅ [GENERATE-CAPTION] Resposta recebida do Gemini');

    // Parse JSON
    let postContent;
    try {
      postContent = JSON.parse(content);
      console.log('✅ [GENERATE-CAPTION] JSON parsed successfully');
    } catch (parseError) {
      console.warn('⚠️ [GENERATE-CAPTION] Failed to parse JSON, using contextual fallback');
      
      // Fallback RICO e CONTEXTUALIZADO com os dados reais do formulário
      const brandName = cleanInput(formData.brand) || "nossa marca";
      const themeName = cleanInput(formData.theme) || "";
      const objective = cleanInput(formData.objective) || "engajar e conectar";
      const audience = cleanInput(formData.audience) || "nosso público";
      const platform = cleanInput(formData.platform) || "redes sociais";
      const imageDescription = cleanInput(formData.imageDescription) || "este conteúdo visual";
      const toneOfVoice = Array.isArray(formData.tone) 
        ? formData.tone.map((t: any) => cleanInput(t)).join(", ")
        : cleanInput(formData.tone) || "autêntico";
      const personaDescription = cleanInput(formData.persona) || "";

      // Construir uma legenda contextualizada e profissional
      let fallbackBody = `✨ ${brandName} apresenta: ${themeName ? themeName + '!' : 'uma novidade especial!'}\n\n`;
      
      fallbackBody += `${imageDescription}\n\n`;
      
      if (objective) {
        fallbackBody += `💡 Nosso objetivo? ${objective.charAt(0).toUpperCase() + objective.slice(1)}`;
        if (audience) {
          fallbackBody += ` para ${audience}`;
        }
        fallbackBody += `.\n\n`;
      }
      
      if (personaDescription) {
        fallbackBody += `🎯 ${personaDescription}\n\n`;
      }
      
      if (toneOfVoice) {
        fallbackBody += `🔥 Estilo: ${toneOfVoice}\n\n`;
      }
      
      const fallbackBody2 = `🌟 Cada imagem conta uma história, e esta não é diferente!

Quando olhamos para este conteúdo visual, vemos muito mais do que cores e formas. Vemos a essência da ${brandName} se manifestando através de cada detalhe cuidadosamente pensado.

💡 ${themeName.charAt(0).toUpperCase() + themeName.slice(1)} não é apenas um tema - é um convite para explorar novas possibilidades e descobrir como podemos ${objective} de forma única e autêntica.

Nossa conexão com ${audience} vai além das palavras. É uma conversa visual que acontece através de cada elemento desta composição, criando uma experiência que ressoa com quem realmente importa.

🔥 A pergunta é: você está pronto para fazer parte desta jornada?

💬 Deixe seu comentário e compartilhe suas impressões!
✨ Marque alguém que também precisa ver isso!`;

      fallbackBody += `💬 Comente suas impressões!\n✨ Marque alguém que precisa ver isso!`;

      postContent = {
        title: `${brandName}${themeName ? ': ' + themeName : ''} 🚀`,
        body: fallbackBody,
        hashtags: [
          brandName.toLowerCase().replace(/\s+/g, "").substring(0, 15),
          themeName.toLowerCase().replace(/\s+/g, "").substring(0, 15),
          "conteudovisual",
          "marketingdigital",
          "storytelling",
          "engajamento",
          "estrategia",
          "inspiracao",
          "crescimento",
          "inovacao",
          "conexao",
          "transformacao",
        ]
          .filter((tag) => tag && tag.length > 2)
          .slice(0, 12),
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

    console.log('✅ [GENERATE-CAPTION] Caption generated successfully');
    
    return new Response(
      JSON.stringify(postContent),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error('❌ [GENERATE-CAPTION] Error:', error.message);
    return new Response(
      JSON.stringify({ 
        error: 'Unable to generate caption',
        details: error.message,
        caption: '',
        hashtags: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
