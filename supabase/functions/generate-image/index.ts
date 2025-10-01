import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RETRIES = 4;
const RETRY_DELAY_MS = 2000;

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

function buildDetailedPrompt(formData: any): string {
  const brand = cleanInput(formData.brand);
  const theme = cleanInput(formData.theme);
  const persona = cleanInput(formData.persona);
  const platform = cleanInput(formData.platform);
  const objective = cleanInput(formData.objective);
  const description = cleanInput(formData.description);
  const tones = Array.isArray(formData.tone) ? formData.tone : (formData.tone ? [formData.tone] : []);
  const additionalInfo = cleanInput(formData.additionalInfo);
  const hasReferenceImages = formData.referenceImages && Array.isArray(formData.referenceImages) && formData.referenceImages.length > 0;

  const promptParts: string[] = [];

  // Instrução de uso de imagens de referência
  if (hasReferenceImages) {
    promptParts.push(
      `*REGRA CRÍTICA DE REFERÊNCIA VISUAL*: Você recebeu ${formData.referenceImages.length} imagem(ns) de referência. ` +
      `Estas imagens devem FORTEMENTE INFLUENCIAR a geração da nova imagem. Use-as como inspiração direta para: ` +
      `- Paleta de cores (extraia e aplique as cores predominantes) ` +
      `- Estilo visual e composição (replique o estilo gráfico observado) ` +
      `- Elementos gráficos (ícones, padrões, texturas similares) ` +
      `- Atmosfera e mood (mantenha a mesma sensação visual) ` +
      `- Identidade visual da marca (preserve características únicas observadas) ` +
      `NÃO copie literalmente, mas INSPIRE-SE FORTEMENTE nos elementos visuais fornecidos. ` +
      `As imagens de referência representam a identidade visual que deve ser mantida.`
    );
  }

  // Contexto estratégico
  if (brand && theme) {
    promptParts.push(`Imagem profissional para a marca "${brand}", destacando o tema "${theme}".`);
  } else if (brand) {
    promptParts.push(`Imagem comercial para a marca "${brand}".`);
  }

  // Descrição principal com fotorrealismo
  if (description) {
    promptParts.push(
      `Uma fotografia comercial de alta precisão e fotorrealismo, com atenção detalhada aos aspectos de iluminação e composição. ` +
      `A cena será meticulosamente projetada para capturar a luz natural de forma eficaz, utilizando uma combinação de fontes de luz suave e direta ` +
      `para criar um contraste harmonioso. Cada elemento da composição será cuidadosamente alinhado para otimizar a percepção visual. ` +
      `Seguindo a descrição: ${description}`
    );
  }

  // Tom e atmosfera
  const toneMap: { [key: string]: string } = {
    inspirador: "Cena iluminada pela luz dourada, com raios suaves atravessando o cenário. Atmosfera edificante e esperançosa, com sombras delicadas que sugerem crescimento.",
    motivacional: "Cores vibrantes e saturadas, com iluminação dinâmica e uso de motion blur leve para dar sensação de movimento. Composição energética que incentiva ação.",
    profissional: "Estética corporativa limpa, iluminação neutra, com foco nítido e fundo minimalista. Espacamento e equilíbrio para transmitir autoridade.",
    casual: "Luz natural suave, com elementos cotidianos e paleta de cores acolhedora. Composição descontraída e espontânea que transmite autenticidade.",
    elegante: "Paleta refinada, com iluminação suave e texturas nobres como mármore ou veludo. Composição minimalista que reflete sofisticação.",
    moderno: "Design arrojado com formas geométricas e alta contrastância. Iluminação intensa e elementos gráficos com estética futurista.",
    divertido: "Cores vibrantes, com elementos gráficos lúdicos e iluminação alegre. Composição enérgica que destaca diversão e criatividade.",
    minimalista: "Paleta monocromática ou neutra, com iluminação uniforme e composição limpa. Espaços negativos e simplicidade essencial."
  };

  if (tones.length > 0) {
    const mappedTones = tones
      .map((tone: string) => {
        const cleanTone = cleanInput(tone);
        return toneMap[cleanTone.toLowerCase()] || `com uma estética ${cleanTone} única e criativa`;
      })
      .join(", ");
    promptParts.push(`O clima da imagem é: ${mappedTones}`);
  }

  // Detalhes técnicos da câmera
  promptParts.push(
    "Detalhes técnicos: foto capturada com câmera DSLR de alta qualidade, lente de 85mm f/1.4. " +
    "Profundidade de campo rasa criando efeito bokeh suave no fundo, destacando o sujeito principal com estética profissional e cinematográfica."
  );

  // Otimização para plataforma
  const platformStyles: { [key: string]: string } = {
    instagram: "cores vibrantes, otimizado para engajamento no feed e stories",
    facebook: "composição envolvente, focada na comunidade e interação social",
    linkedin: "estética profissional e corporativa, ideal para posts de negócios",
    twitter: "design clean e chamativo, otimizado para visibilidade",
    x: "design clean e chamativo, otimizado para interações rápidas",
    tiktok: "composição dinâmica e energia jovem, formato vertical",
    youtube: "thumbnail de alto contraste, otimizado para aumentar visualizações"
  };

  if (platform && platformStyles[platform.toLowerCase()]) {
    promptParts.push(`Otimizado para ${platform}: ${platformStyles[platform.toLowerCase()]}`);
  }

  // Persona e informações adicionais
  if (persona) promptParts.push(`Conectando-se com a persona de ${persona}`);
  if (objective) promptParts.push(`Objetivo: ${objective}`);
  if (additionalInfo) promptParts.push(`Elementos visuais adicionais: ${additionalInfo}`);

  // Reforço de qualidade
  promptParts.push(
    `Criar uma imagem visualmente impactante, de alta qualidade, profissional e otimizada para ${platform || 'redes sociais'}. ` +
    `A composição deve ser eye-catching e capturar a essência da marca ${brand} no tema ${theme}.`
  );

  return promptParts.join(". ");
}

async function generateImageWithRetry(prompt: string, referenceImages: string[] | undefined, apiKey: string, isEdit: boolean = false, existingImage?: string, attempt: number = 1): Promise<any> {
  try {
    if (isEdit) {
      console.log(`✏️ Tentativa ${attempt}/${MAX_RETRIES} de edição de imagem com Gemini 2.5...`);
    } else {
      console.log(`🎨 Tentativa ${attempt}/${MAX_RETRIES} de geração com Gemini 2.5...`);
    }
    
    // Construir conteúdo da mensagem
    const messageContent: any[] = [];
    
    // Se for edição, adicionar a imagem existente primeiro
    if (isEdit && existingImage) {
      console.log(`📸 Editando imagem existente...`);
      messageContent.push({
        type: "image_url",
        image_url: {
          url: existingImage
        }
      });
    }
    
    // Adicionar imagens de referência (se houver e não for edição)
    if (!isEdit && referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0) {
      console.log(`📸 Processando ${referenceImages.length} imagem(ns) de referência...`);
      for (const refImg of referenceImages) {
        try {
          const [meta, data] = refImg.split(",");
          const mimeMatch = meta.match(/data:(image\/[^;]+);base64/);
          messageContent.push({
            type: "image_url",
            image_url: {
              url: refImg
            }
          });
        } catch (refError) {
          console.error("Erro ao processar imagem de referência:", refError);
        }
      }
    }
    
    // Adicionar o prompt de texto
    messageContent.push({
      type: "text",
      text: isEdit ? `Edite esta imagem aplicando as seguintes alterações: ${prompt}` : prompt
    });
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{ role: "user", content: messageContent }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro na tentativa ${attempt}:`, response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("RATE_LIMIT");
      }
      if (response.status === 402) {
        throw new Error("PAYMENT_REQUIRED");
      }
      
      throw new Error(`AI_GATEWAY_ERROR: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error("NO_IMAGE_GENERATED");
    }

    console.log(`✅ Sucesso na tentativa ${attempt}/${MAX_RETRIES}`);
    return { imageUrl, attempt };
    
  } catch (error: any) {
    console.error(`❌ Falha na tentativa ${attempt}:`, error.message);
    
    // Erros que não devem ser retentados
    if (error.message === "RATE_LIMIT" || error.message === "PAYMENT_REQUIRED") {
      throw error;
    }
    
    // Se não é a última tentativa, aguarda e tenta novamente
    if (attempt < MAX_RETRIES) {
      const delay = attempt * RETRY_DELAY_MS;
      console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return generateImageWithRetry(prompt, referenceImages, apiKey, isEdit, existingImage, attempt + 1);
    }
    
    throw error;
  }
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

    // Validação de campos obrigatórios
    if (!formData.description) {
      return new Response(
        JSON.stringify({ error: "Campo 'description' é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se é edição de imagem existente
    const isEdit = formData.isEdit === true && formData.existingImage;
    
    // Construir prompt
    let prompt: string;
    if (isEdit) {
      // Para edição, usar apenas o texto de revisão
      prompt = cleanInput(formData.description);
      console.log("✏️ Editando imagem existente com instrução:", prompt.substring(0, 200) + "...");
    } else {
      // Para geração nova, construir prompt detalhado
      prompt = buildDetailedPrompt(formData);
      console.log("📝 Prompt gerado:", prompt.substring(0, 200) + "...");
      
      if (formData.referenceImages && formData.referenceImages.length > 0) {
        console.log(`📸 ${formData.referenceImages.length} imagem(ns) de referência recebida(s)`);
      }
    }

    // Gerar ou editar imagem com sistema de retry
    try {
      const result = await generateImageWithRetry(
        prompt, 
        formData.referenceImages, 
        LOVABLE_API_KEY, 
        isEdit, 
        formData.existingImage
      );
      
      return new Response(
        JSON.stringify({ 
          imageUrl: result.imageUrl,
          attempt: result.attempt,
          model: "google/gemini-2.5-flash-image-preview"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } catch (error: any) {
      if (error.message === "RATE_LIMIT") {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (error.message === "PAYMENT_REQUIRED") {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao seu workspace Lovable AI." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      console.error(`❌ Todas as ${MAX_RETRIES} tentativas falharam`);
      return new Response(
        JSON.stringify({ 
          error: `Não foi possível gerar a imagem após ${MAX_RETRIES} tentativas. Tente novamente em alguns minutos.` 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("❌ Erro na função generate-image:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
