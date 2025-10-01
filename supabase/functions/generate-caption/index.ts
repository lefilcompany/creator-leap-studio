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
Você é um copywriter especialista em redes sociais com mais de 15 anos de experiência criando conteúdos virais e de alto engajamento para marcas globais. Sua tarefa é criar uma LEGENDA PRONTA PARA USO no post de ${cleanInput(formData.platform)} que acompanhará a imagem gerada.

## IMPORTÂNCIA CRÍTICA:
- Esta legenda será usada DIRETAMENTE no post da rede social junto com a imagem
- A legenda DEVE ser COMPLETA e RICA (mínimo 1.000 caracteres, ideal 1.500-1.800)
- O usuário precisa de conteúdo ABUNDANTE para ter opções de edição
- A legenda deve estar completamente ALINHADA com a identidade da marca "${cleanInput(formData.brand)}" e o tema "${cleanInput(formData.theme)}"
- Cada parágrafo deve funcionar perfeitamente com a imagem visual gerada

# ESTRUTURA OBRIGATÓRIA DA LEGENDA (4 PARÁGRAFOS + CTA)

## 1. ABERTURA MAGNÉTICA (2-3 linhas)
- Hook PODEROSO que conecta com a imagem gerada
- Desperta curiosidade, emoção ou surpresa imediata
- Relaciona diretamente com a descrição visual: "${cleanInput(formData.description)}"
- Use pergunta provocativa OU declaração ousada
- Emojis estratégicos (1-2) para impacto visual

## 2. DESENVOLVIMENTO EM 4 PARÁGRAFOS RICOS

### Parágrafo 1 - Contexto e Identificação (3-4 linhas):
- Estabeleça conexão emocional com o tema "${cleanInput(formData.theme)}"
- Crie identificação com o público através de situações reconhecíveis
- Use storytelling que complementa a imagem
- Mostre compreensão das necessidades da persona

### Parágrafo 2 - Valor e Insight (3-4 linhas):
- Apresente insight valioso ou problema comum
- Explique por que isso importa para o público
- Use exemplos práticos relacionados ao objetivo: "${cleanInput(formData.objective)}"
- Mantenha relevância com a marca "${cleanInput(formData.brand)}"

### Parágrafo 3 - Solução e Benefícios (3-4 linhas):
- Apresente transformação ou benefício disponível
- Detalhe valor específico e tangível
- Mostre diferencial único da marca
- Reforce expertise e autoridade

### Parágrafo 4 - Aprofundamento e Conexão Final (3-4 linhas):
- Agregue dicas práticas ou conhecimento adicional
- Conecte com valores maiores da marca
- Humanize através de propósito
- Prepare para a ação final

## 3. CALL-TO-ACTION PODEROSO (2-3 linhas)
- Comando CLARO e DIRETO de ação
- Use verbos impactantes: "Descubra", "Experimente", "Transforme", "Conquiste"
- SEMPRE termine com pergunta para engajamento nos comentários
- Convite para salvar/compartilhar o post
- Emojis de ação (👉, 🔥, ✨, 💬)

# DIRETRIZES AVANÇADAS DE LINGUAGEM

## Para Instagram/Facebook:
- Mínimo 1.200 caracteres, ideal 1.500-1.800
- Primeiro parágrafo (hook) até 125 caracteres para aparecer antes do "ver mais"
- Use quebras de linha estratégicas (\\n\\n) entre os 4 parágrafos
- Linguagem conversacional, próxima e autêntica
- Tom ${cleanedTones || "apropriado"} mantido durante toda a legenda
- Emojis estratégicos (10-15 no total) distribuídos naturalmente

## Para LinkedIn:
- Mínimo 1.400 caracteres, ideal 1.800-2.200
- Tom profissional mas humano e acessível
- Inclua dados, estatísticas ou insights de mercado
- Use storytelling corporativo em 4 parágrafos
- Menos emojis (6-10 no total), mais formais
- Estrutura profissional com parágrafos bem definidos

## Para TikTok/Twitter/X:
- Mínimo 1.000 caracteres, ideal 1.500-1.800
- Linguagem jovem, dinâmica e atual
- Referências culturais quando apropriado
- Tom descontraído e autêntico em 4 parágrafos
- Emojis abundantes (12-18) e energia vibrante
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
- Legenda COMPLETA PRONTA PARA POSTAR com MÍNIMO 1.200 caracteres
- IDEAL: 1.500 a 1.800 caracteres (muito importante!)
- Estrutura em EXATAMENTE 4 PARÁGRAFOS bem desenvolvidos + CTA final
- Rico em detalhes, storytelling e valor que complementa a imagem
- Use '\\n\\n' para separar os 4 parágrafos (importante para formatação)
- Use '\\n' apenas para quebras simples dentro de um parágrafo
- 10-15 emojis distribuídos estrategicamente ao longo do texto
- OBRIGATÓRIO: pelo menos 2 perguntas para engajamento
- OBRIGATÓRIO: CTA claro e forte no final
- Mencione a marca ${cleanInput(formData.brand)} pelo menos 2 vezes
- Desenvolva profundamente o tema ${cleanInput(formData.theme)}
- Conecte o texto com a descrição visual gerada

### "hashtags" (array de strings):
- 10-15 hashtags estratégicas (não 8-12, mas mais!)
- MIX obrigatório: 40% nicho específico + 40% médio alcance + 20% populares
- Primeira hashtag SEMPRE da marca: #${cleanInput(formData.brand).toLowerCase().replace(/\s+/g, "")}
- Segunda hashtag SEMPRE do tema: #${cleanInput(formData.theme).toLowerCase().replace(/\s+/g, "")}
- Restantes relacionadas: setor, benefício, público, emoção, ação
- SEM o símbolo # (apenas o texto)
- Todas em lowercase
- Sem espaços ou caracteres especiais

## EXEMPLO DE FORMATAÇÃO DO BODY (4 PARÁGRAFOS):
"🚀 Primeira linha impactante conectando com a imagem! Você já se perguntou sobre [tema relacionado à imagem]?\\n\\nPARÁGRAFO 1: Contexto rico em detalhes e storytelling envolvente que conecta emocionalmente com o público, criando identificação imediata com a situação apresentada na imagem gerada. Use 3-4 linhas bem desenvolvidas.\\n\\nPARÁGRAFO 2: Insight valioso ou problema comum com exemplos práticos e informações relevantes que agregam valor real. Explique por que isso importa e como se relaciona com o objetivo. Desenvolva em 3-4 linhas completas.\\n\\nPARÁGRAFO 3: Solução ou transformação disponível, detalhando benefícios específicos e mostrando o diferencial único da marca. Reforce autoridade e expertise com conteúdo substancial em 3-4 linhas.\\n\\nPARÁGRAFO 4: Aprofundamento final com dicas práticas adicionais, conectando com valores da marca e humanizando através do propósito. Prepare para a ação em 3-4 linhas impactantes.\\n\\n💡 CTA FINAL: Descubra mais sobre [tema]! O que você achou dessa abordagem? Comente abaixo e salve este post! 🔥👇"

# VALIDAÇÃO FINAL ANTES DE GERAR:
✅ Legenda tem MÍNIMO 1.200 caracteres? (conte!)
✅ EXATAMENTE 4 parágrafos bem desenvolvidos?
✅ Marca mencionada 2-3 vezes naturalmente?
✅ Tema desenvolvido profundamente?
✅ Legenda conecta com a descrição da imagem?
✅ Storytelling envolvente presente?
✅ Valor prático agregado?
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
