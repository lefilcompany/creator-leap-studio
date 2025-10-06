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
- Alvo: 900-1300 caracteres (texto extenso engaja mais)
- Hook inicial: 100-125 caracteres impactantes (antes do "ver mais")
- Subtítulo descritivo logo após o hook
- 3-4 parágrafos descritivos e narrativos
- Quebras de linha apenas entre parágrafos principais
- Linguagem conversacional mas sofisticada
- Tom aspiracional e inspirador
- MÁXIMO 5 emojis em toda a legenda
- 8-10 hashtags estratégicas (MIX nicho + médio alcance)
- Inclua 1 pergunta genuína + CTA duplo (aspiracional + comando)
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

## PRINCÍPIOS DE USO DE EMOJIS (CRÍTICO)
- MÁXIMO 3-5 emojis em TODA a legenda
- Use emojis apenas em momentos estratégicos:
  * 1 emoji no hook inicial (opcional)
  * 1-2 emojis no meio do texto para destacar benefícios
  * 1-2 emojis no CTA final
- NUNCA use emojis em todos os parágrafos
- Priorize SEMPRE texto rico sobre ícones visuais

# TÉCNICAS OBRIGATÓRIAS DE STORYTELLING

## ESTRUTURA NARRATIVA:
1. **Hook Aspiracional**: Abra com uma pergunta ou declaração que conecte emocionalmente
   - Exemplo: "Já imaginou viver em um lugar onde..."
   - Exemplo: "E se você pudesse transformar..."

2. **Subtítulo Contextualizador**: Segunda linha que resume o valor principal
   - Exemplo: "Da farmácia às quadras: a infraestrutura que apoia..."
   - Formato: [Benefício tangível] + [conexão emocional]

3. **Desenvolvimento Descritivo (3-4 parágrafos)**:
   - Parágrafo 1: Descreva o cenário/contexto de forma sensorial
   - Parágrafo 2: Aprofunde nos benefícios práticos e emocionais
   - Parágrafo 3: Crie conexão com o dia a dia do público
   - Parágrafo 4 (opcional): Reforce o valor único

4. **Engajamento Conversacional**:
   - Inclua 1 pergunta genuína que convide interação
   - Exemplo: "Qual é a sua atividade favorita para relaxar?"

5. **CTA Duplo**:
   - Primeiro: Frase aspiracional sobre a oportunidade
   - Segundo: Comando direto com verbo de ação
   - Exemplo: "Não perca a oportunidade de viver... 👉 Descubra como..."

## DENSIDADE TEXTUAL:
- Legenda DEVE ter entre 900-1300 caracteres
- Parágrafos de 80-150 caracteres cada
- Preferir descrições detalhadas a frases curtas
- Usar linguagem rica, mas acessível

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
- **"body"**: Legenda completa de 900-1300 caracteres, com TEXTO ABUNDANTE e emojis minimalistas (máximo 5 emojis no total)
- **"hashtags"**: Array com 8-10 hashtags estratégicas (MIX de nicho + médio alcance)

## FORMATAÇÃO DA LEGENDA:
- Use '\\n\\n' para separar parágrafos principais
- Use '\\n' apenas para subtítulos ou quebras estratégicas
- MÁXIMO 5 EMOJIS EM TODA A LEGENDA (incluso título)
- Priorize parágrafos de texto corrido e descritivo
- Evite listas com bullets ou excesso de quebras
- Mantenha-se dentro do limite de caracteres da plataforma

**FORMATO DE RESPOSTA (JSON VÁLIDO):**
{
  "title": "Título/gancho da postagem",
  "body": "Corpo completo da legenda com quebras de linha apropriadas",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"]
}

# EXEMPLO DE LEGENDA IDEAL (REFERÊNCIA DE QUALIDADE)

{
  "title": "Seu novo estilo de vida começa aqui 🌅",
  "body": "🌅 Já imaginou viver em um lugar onde a rotina e o lazer se encontram em perfeita harmonia?\\n\\nDa farmácia às quadras: a infraestrutura que apoia a rotina e o tempo livre.\\n\\nAqui, você encontra tudo o que precisa para o dia a dia — farmácias, padarias e mercados a poucos passos de casa. E quando o sol brilha, é hora de aproveitar! ⚽🌴\\n\\nCom quadras de beach tennis de areia, caminhos para caminhadas e áreas verdes, cada momento pode ser uma nova descoberta.\\n\\nQual é a sua atividade favorita para relaxar? Compartilhe com a gente nos comentários! 👇✨\\n\\nNão perca a oportunidade de viver em um lugar que transforma seu cotidiano em uma experiência incrível. 🏖️\\n\\n👉 Descubra como fazer parte dessa comunidade que valoriza a qualidade de vida!",
  "hashtags": ["qualidadedevida", "infraestrutura", "lazer", "beachtennis", "comunidade", "estilodevida", "bemviver", "residencial"]
}

OBSERVE:
- Apenas 5 emojis estratégicos em 650+ caracteres
- Texto rico e descritivo
- Narrativa fluida com storytelling
- Pergunta genuína de engajamento
- CTA duplo (aspiracional + comando)
- Parágrafos bem desenvolvidos

RETORNE APENAS O JSON, SEM TEXTO ADICIONAL ANTES OU DEPOIS.
  `.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { formData } = await req.json();
    
    console.log("📝 [CAPTION] Dados recebidos:", {
      brand: formData?.brand,
      theme: formData?.theme,
      platform: formData?.platform,
      objective: formData?.objective,
      imageDescription: formData?.imageDescription,
      tone: formData?.tone,
      persona: formData?.persona,
      audience: formData?.audience
    });
    
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
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = buildCaptionPrompt(formData);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini-2025-08-07",
        messages: [
          {
            role: "system",
            content: "Você é um copywriter sênior especializado em storytelling para redes sociais. Sua marca registrada é criar legendas RICAS EM TEXTO, com narrativas envolventes e uso MINIMALISTA de emojis (máximo 5 por legenda). Priorize sempre descrições detalhadas e parágrafos bem desenvolvidos. Retorne APENAS JSON válido, sem texto adicional.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_completion_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ [CAPTION] Erro OpenAI:", {
        status: response.status,
        error: errorData
      });
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'OpenAI rate limit exceeded. Try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'Invalid OpenAI API key' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'OpenAI API error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    console.log("🤖 [CAPTION] Resposta da AI recebida:", {
      contentLength: content?.length || 0,
      contentPreview: content?.substring(0, 100)
    });

    if (!content) {
      console.error("❌ [CAPTION] Conteúdo vazio retornado pela AI");
      throw new Error("Empty content returned");
    }

    // Parse JSON
    let postContent;
    try {
      postContent = JSON.parse(content);
    } catch (parseError) {
      console.warn("⚠️ [CAPTION] Falha ao parsear JSON, usando fallback:", parseError);
      // Fallback rico mesmo em caso de erro
      const brandName = cleanInput(formData.brand) || "nossa marca";
      const themeName = cleanInput(formData.theme) || "novidades";
      const objective = cleanInput(formData.objective) || "trazer inovação e valor";
      const audience = cleanInput(formData.audience) || "nosso público";
      const platform = cleanInput(formData.platform) || "redes sociais";

      const fallbackBody = `🌟 Cada imagem conta uma história, e esta não é diferente!

Quando olhamos para este conteúdo visual, vemos muito mais do que cores e formas. Vemos a essência da ${brandName} se manifestando através de cada detalhe cuidadosamente pensado.

💡 ${themeName.charAt(0).toUpperCase() + themeName.slice(1)} não é apenas um tema - é um convite para explorar novas possibilidades e descobrir como podemos ${objective} de forma única e autêntica.

Nossa conexão com ${audience} vai além das palavras. É uma conversa visual que acontece através de cada elemento desta composição, criando uma experiência que ressoa com quem realmente importa.

🔥 A pergunta é: você está pronto para fazer parte desta jornada?

💬 Deixe seu comentário e compartilhe suas impressões!
✨ Marque alguém que também precisa ver isso!`;

      postContent = {
        title: `${brandName}: Descobrindo ${themeName} 🚀`,
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
