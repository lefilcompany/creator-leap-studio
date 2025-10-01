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
# CONTEXTO ESTRATÉGICO COMPLETO
- **Marca/Empresa**: ${cleanInput(formData.brand)}
- **Tema Central**: ${cleanInput(formData.theme)}
- **Plataforma de Publicação**: ${cleanInput(formData.platform)}
- **Objetivo Estratégico**: ${cleanInput(formData.objective)}
- **Descrição Visual da Imagem Gerada**: ${cleanInput(formData.description)}
- **Público-Alvo**: ${cleanInput(formData.audience) || "Público geral"}
- **Persona Específica**: ${cleanInput(formData.persona) || "Não especificada"}
- **Tom de Voz/Comunicação**: ${cleanedTones || "Não especificado"}
- **Informações Complementares**: ${cleanInput(formData.additionalInfo) || "Não informado"}

# SUA MISSÃO COMO COPYWRITER MASTER
Você é um copywriter especialista em redes sociais com mais de 15 anos de experiência criando conteúdos virais e de alto engajamento para marcas globais. Sua tarefa é criar uma legenda COMPLETA, ELABORADA e EXTREMAMENTE ENVOLVENTE para ${cleanInput(formData.platform)}.

## IMPORTÂNCIA CRÍTICA:
- A legenda DEVE ser LONGA e DETALHADA (mínimo 1.200 caracteres, ideal 1.800-2.200)
- O usuário precisa de MUITO CONTEÚDO para escolher o que usar
- Cada seção deve ser RICA em detalhes, storytelling e valor
- A legenda deve estar completamente ALINHADA com a identidade da marca "${cleanInput(formData.brand)}" e o tema "${cleanInput(formData.theme)}"

# ESTRUTURA OBRIGATÓRIA DA LEGENDA (SIGA RIGOROSAMENTE)

## 1. ABERTURA IMPACTANTE E MAGNÉTICA (2-3 linhas)
- Hook PODEROSO que desperta curiosidade, emoção ou surpresa
- Conecte com a dor/desejo do público-alvo
- Use pergunta provocativa OU declaração ousada OU dado impressionante
- DEVE relacionar diretamente com a imagem gerada e o tema da marca
- Emojis estratégicos (1-2) para chamar atenção visual

## 2. DESENVOLVIMENTO NARRATIVO RICO (4-6 parágrafos extensos)

### Parágrafo 1 - Contexto e Conexão Emocional:
- Estabeleça o cenário relacionado ao tema "${cleanInput(formData.theme)}"
- Crie identificação com o público através de situações reconhecíveis
- Use storytelling para envolver emocionalmente
- Mostre compreensão profunda das necessidades da persona

### Parágrafo 2 - Problema/Desafio/Insight:
- Apresente um problema comum ou insight valioso
- Explique por que isso importa para o público
- Use exemplos práticos e situações reais
- Mantenha relevância com a marca "${cleanInput(formData.brand)}"

### Parágrafo 3 - Solução/Transformação/Benefício:
- Apresente a solução ou transformação disponível
- Detalhe os benefícios específicos e tangíveis
- Mostre o valor único da marca
- Use provas sociais sutis ou autoridade

### Parágrafo 4 - Aprofundamento e Valor Adicional:
- Agregue insights adicionais ou dicas práticas
- Compartilhe conhecimento especializado
- Reforce a expertise da marca
- Mantenha o engajamento com informações valiosas

### Parágrafo 5 - Conexão com Propósito (quando relevante):
- Conecte com valores maiores da marca
- Mostre impacto ou diferencial
- Humanize a marca através de propósito
- Reforce identidade e posicionamento

## 3. PRÉ-CALL-TO-ACTION - Gatilho Emocional (1-2 linhas)
- Prepare o terreno para a ação
- Use urgência, exclusividade ou curiosidade
- Reforce o benefício principal uma última vez
- Emojis estratégicos para chamar atenção

## 4. CALL-TO-ACTION PODEROSO E ESPECÍFICO (2-3 linhas)
- Comando CLARO e DIRETO
- Use verbos de ação impactantes: "Descubra", "Experimente", "Transforme", "Acesse", "Conquiste"
- Inclua urgência ou escassez quando apropriado
- SEMPRE termine com pergunta para engajamento nos comentários
- Emojis de ação (👉, 🔥, ✨, 💬)

## 5. ELEMENTOS INTERATIVOS FINAIS (2-3 linhas)
- Convite para compartilhar com alguém específico
- Pedido de opinião ou experiência pessoal
- Incentivo para salvar o post
- Emojis que incentivem interação

# DIRETRIZES AVANÇADAS DE LINGUAGEM

## Para Instagram/Facebook:
- Mínimo 1.500 caracteres, ideal 2.000-2.200
- Primeiro parágrafo (hook) até 125 caracteres para aparecer antes do "ver mais"
- Use quebras de linha estratégicas (\\n\\n) a cada 2-3 linhas para facilitar leitura
- Linguagem conversacional, próxima e autêntica
- Tom ${cleanedTones || "apropriado"} mantido durante toda a legenda
- Variedade de emojis (12-18 no total), mas estrategicamente posicionados

## Para LinkedIn:
- Mínimo 1.800 caracteres, ideal 2.500-3.000
- Tom profissional mas humano e acessível
- Inclua dados, estatísticas ou insights de mercado
- Use storytelling corporativo
- Menos emojis (6-10 no total), mais formais
- Estrutura mais formal com parágrafos bem definidos

## Para TikTok/Twitter/X:
- Mínimo 1.200 caracteres, ideal 1.800-2.200
- Linguagem jovem, dinâmica e atual
- Referências culturais quando apropriado
- Tom descontraído e autêntico
- Emojis abundantes (15-20) e energia vibrante
- Quebras de linha frequentes para dinamismo

# INTEGRAÇÃO PROFUNDA COM A MARCA

## Elementos Obrigatórios:
- Mencione a marca "${cleanInput(formData.brand)}" naturalmente no texto (2-3 vezes)
- Reflita os valores e personalidade da marca em cada frase
- Use vocabulário e expressões alinhados com o DNA da marca
- Mantenha consistência com o tema "${cleanInput(formData.theme)}" durante toda a narrativa
- Incorpore o objetivo "${cleanInput(formData.objective)}" de forma orgânica

## Tom de Voz Consistente:
- ${cleanedTones || "Tom apropriado"} presente em toda a comunicação
- Vocabulário específico do segmento da marca
- Personalidade única e reconhecível
- Autenticidade e coerência em cada palavra

# REGRAS TÉCNICAS CRÍTICAS DE SAÍDA

⚠️ ATENÇÃO MÁXIMA ⚠️
- Responda EXCLUSIVAMENTE em JSON válido
- ZERO texto adicional, explicações, comentários ou markdown
- ZERO caracteres antes ou depois do JSON
- Estrutura EXATA e OBRIGATÓRIA: {"title", "body", "hashtags"}

## ESPECIFICAÇÕES TÉCNICAS RÍGIDAS:

### "title" (string):
- Título magnético de 50-70 caracteres
- Deve funcionar como headline completa
- Inclua emoji impactante (1-2)
- Desperte curiosidade máxima
- Conecte marca + tema de forma criativa

### "body" (string):
- Legenda COMPLETA com MÍNIMO 1.500 caracteres
- IDEAL: 1.800 a 2.200 caracteres (muito importante!)
- Rico em detalhes, storytelling e valor educacional
- Múltiplas seções com conteúdo abundante
- 5-7 parágrafos bem desenvolvidos
- Use '\\n\\n' para separar parágrafos (importante para formatação)
- Use '\\n' apenas para quebras simples dentro de um parágrafo
- 12-20 emojis distribuídos estrategicamente
- OBRIGATÓRIO: pelo menos 2 perguntas para engajamento
- OBRIGATÓRIO: CTA claro e forte no final
- Mencione a marca ${cleanInput(formData.brand)} pelo menos 2 vezes
- Desenvolva profundamente o tema ${cleanInput(formData.theme)}

### "hashtags" (array de strings):
- 10-15 hashtags estratégicas (não 8-12, mas mais!)
- MIX obrigatório: 40% nicho específico + 40% médio alcance + 20% populares
- Primeira hashtag SEMPRE da marca: #${cleanInput(formData.brand).toLowerCase().replace(/\s+/g, "")}
- Segunda hashtag SEMPRE do tema: #${cleanInput(formData.theme).toLowerCase().replace(/\s+/g, "")}
- Restantes relacionadas: setor, benefício, público, emoção, ação
- SEM o símbolo # (apenas o texto)
- Todas em lowercase
- Sem espaços ou caracteres especiais

## EXEMPLO DE FORMATAÇÃO DO BODY:
"🚀 Primeira linha impactante que chama atenção!\\n\\nVocê já se perguntou sobre [tema]? Deixe eu te contar uma história...\\n\\n✨ Parágrafo de desenvolvimento rico em detalhes, insights valiosos e storytelling envolvente que conecta emocionalmente com o público. Continue desenvolvendo com informações práticas e relevantes.\\n\\nSegundo parágrafo aprofundando ainda mais o tema, agregando valor, compartilhando conhecimento especializado e mantendo o engajamento com conteúdo de qualidade excepcional.\\n\\n💡 Terceiro parágrafo continuando..."

# VALIDAÇÃO FINAL ANTES DE GERAR:
✅ Legenda tem MÍNIMO 1.500 caracteres? (conte!)
✅ Pelo menos 5 parágrafos bem desenvolvidos?
✅ Marca mencionada 2-3 vezes naturalmente?
✅ Tema desenvolvido profundamente?
✅ Storytelling envolvente presente?
✅ Valor educacional agregado?
✅ 2+ perguntas para engajamento?
✅ CTA claro e forte no final?
✅ 10-15 hashtags estratégicas?
✅ JSON válido sem nenhum texto extra?

Gere agora a legenda COMPLETA, ELABORADA e EXTENSA em formato JSON puro.
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
