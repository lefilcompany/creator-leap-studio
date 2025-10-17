import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user from JWT token
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authenticatedUserId = user.id;

    // Fetch user's team from profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', authenticatedUserId)
      .single();

    if (profileError || !profile?.team_id) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'User not associated with a team' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authenticatedTeamId = profile.team_id;

    const formData = await req.json();
    
    // Input validation
    if (!formData.description || typeof formData.description !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Descrição inválida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generate Image Request:', { 
      description: formData.description?.substring(0, 100),
      brandId: formData.brandId,
      themeId: formData.themeId,
      personaId: formData.personaId,
      platform: formData.platform,
      userId: authenticatedUserId, 
      teamId: authenticatedTeamId,
      preserveImagesCount: formData.preserveImages?.length || 0,
      styleReferenceImagesCount: formData.styleReferenceImages?.length || 0
    });

    // Check team credits
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('credits_quick_content')
      .eq('id', authenticatedTeamId)
      .single();

    if (teamError) {
      console.error('Error fetching team:', teamError);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar solicitação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!teamData || teamData.credits_quick_content <= 0) {
      return new Response(
        JSON.stringify({ error: 'Créditos insuficientes para criação de imagem' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build comprehensive prompt
    let enhancedPrompt = buildDetailedPrompt(formData);

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    console.log('Calling Gemini Image Preview API...');

    // Build messages array with reference images
    const messageContent: any[] = [
      { type: 'text', text: enhancedPrompt }
    ];
    
    // Add preserve images first (highest priority - brand images)
    const preserveImages = formData.preserveImages || [];
    if (preserveImages && preserveImages.length > 0) {
      preserveImages.forEach((img: string) => {
        messageContent.push({
          type: 'image_url',
          image_url: { url: img }
        });
      });
    }
    
    // Add style reference images after (user uploads)
    const styleReferenceImages = formData.styleReferenceImages || [];
    if (styleReferenceImages && styleReferenceImages.length > 0) {
      styleReferenceImages.forEach((img: string) => {
        messageContent.push({
          type: 'image_url',
          image_url: { url: img }
        });
      });
    }

    // Retry logic for image generation
    const MAX_RETRIES = 3;
    let lastError: any = null;
    let imageUrl: string | null = null;
    let description = 'Imagem gerada com sucesso';

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Image generation attempt ${attempt}/${MAX_RETRIES}...`);

        // Convert messageContent to Gemini format
        const geminiParts = messageContent.map((item: any) => {
          if (item.type === "text") {
            return { text: item.text };
          } else if (item.type === "image_url") {
            const base64Data = item.image_url.url.split(',')[1];
            const mimeType = item.image_url.url.match(/data:(.*?);/)?.[1] || 'image/png';
            return { 
              inlineData: { 
                mimeType, 
                data: base64Data 
              } 
            };
          }
        });

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [{ parts: geminiParts }],
            generationConfig: {
              temperature: 0.7,
              topP: 0.95,
              topK: 40,
              maxOutputTokens: 8192,
            }
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Gemini API error (attempt ${attempt}):`, response.status, errorText);
          
          // Don't retry on rate limit errors
          if (response.status === 429) {
            return new Response(
              JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente mais tarde.' }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          lastError = new Error(`Gemini API error: ${response.status}`);
          
          if (attempt < MAX_RETRIES) {
            console.log(`Retrying in 2 seconds... (attempt ${attempt + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          
          throw lastError;
        }

        const data = await response.json();
        console.log('Gemini API response received');

        // Extract image from response
        if (data.candidates && data.candidates[0]?.content?.parts) {
          const parts = data.candidates[0].content.parts;
          
          for (const part of parts) {
            if (part.inlineData?.data) {
              const base64Image = part.inlineData.data;
              const mimeType = part.inlineData.mimeType || 'image/png';
              imageUrl = `data:${mimeType};base64,${base64Image}`;
              console.log('Image extracted successfully from Gemini response');
              break;
            }
          }

          // Extract text description if available
          for (const part of parts) {
            if (part.text) {
              description = part.text;
              break;
            }
          }
        }

        if (!imageUrl) {
          throw new Error('No image found in Gemini response');
        }

        // Success - break retry loop
        break;

      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        lastError = error;
        
        if (attempt < MAX_RETRIES) {
          console.log(`Retrying in 2 seconds... (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!imageUrl) {
      console.error('Failed to generate image after all retries:', lastError);
      return new Response(
        JSON.stringify({ error: 'Falha ao gerar imagem após múltiplas tentativas' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload image to Supabase Storage
    console.log('Uploading image to storage...');
    const timestamp = Date.now();
    const fileName = `content-images/${authenticatedTeamId}/${timestamp}.png`;
    
    // Convert base64 to blob
    const base64Data = imageUrl.split(',')[1];
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('content-images')
      .upload(fileName, binaryData, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Erro ao fazer upload da imagem' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('content-images')
      .getPublicUrl(fileName);

    console.log('Image uploaded successfully:', publicUrl);

    // Decrement team credits
    const { error: updateError } = await supabase
      .from('teams')
      .update({ credits_quick_content: teamData.credits_quick_content - 1 })
      .eq('id', authenticatedTeamId);

    if (updateError) {
      console.error('Error updating credits:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        imageUrl: publicUrl,
        description: description,
        success: true 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-image function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildDetailedPrompt(formData: any): string {
  const brand = cleanInput(formData.brand);
  const theme = cleanInput(formData.theme);
  const persona = cleanInput(formData.persona);
  const platform = cleanInput(formData.platform);
  const objective = cleanInput(formData.objective);
  const description = cleanInput(formData.description);
  const tones = Array.isArray(formData.tone) ? formData.tone : (formData.tone ? [formData.tone] : []);
  const additionalInfo = cleanInput(formData.additionalInfo);

  // Advanced configurations
  const negativePrompt = cleanInput(formData.negativePrompt);
  const colorPalette = formData.colorPalette || 'auto';
  const lighting = formData.lighting || 'natural';
  const composition = formData.composition || 'auto';
  const cameraAngle = formData.cameraAngle || 'eye_level';
  const detailLevel = formData.detailLevel || 7;
  const mood = formData.mood || 'auto';

  const promptParts: string[] = [];

  // === COMPLIANCE COM REGULAMENTAÇÃO PUBLICITÁRIA BRASILEIRA (CONAR/CDC) ===
  const complianceGuidelines = [
    "DIRETRIZES ÉTICAS E LEGAIS OBRIGATÓRIAS (Código CONAR e CDC - Brasil):",
    "1. HONESTIDADE E VERACIDADE: A imagem NÃO PODE induzir ao erro ou enganar sobre características do produto/serviço.",
    "2. RESPEITO E DIGNIDADE HUMANA: PROIBIDO qualquer forma de discriminação.",
    "3. PROTEÇÃO DE PÚBLICOS VULNERÁVEIS: Se o público-alvo incluir menores, aplique restrições MÁXIMAS.",
    "4. BEBIDAS ALCOÓLICAS: NUNCA mostre ou sugira o ato de consumo/ingestão da bebida.",
    "5. ALIMENTOS E BEBIDAS: NÃO estimule consumo excessivo ou compulsivo.",
    "6. APOSTAS E JOGOS: OBRIGATÓRIO incluir símbolo 18+ de forma visível e legível.",
    "7. APELOS DE SUSTENTABILIDADE: Benefícios ambientais devem ser específicos, não genéricos ou vagos.",
    "8. COMPARAÇÃO COM CONCORRENTES: NÃO ridicularize, deprecie ou denigra concorrentes.",
    "9. DECÊNCIA E PADRÕES SOCIAIS: Respeite padrões contemporâneos de decência da sociedade brasileira.",
    "ESTAS DIRETRIZES SÃO INVIOLÁVEIS E DEVEM SER APLICADAS EM TODA E QUALQUER IMAGEM GERADA."
  ];
  
  promptParts.push(complianceGuidelines.join(" "));

  // Add preserve and style reference image instructions
  const preserveImages = formData.preserveImages || [];
  const styleReferenceImages = formData.styleReferenceImages || [];

  if (preserveImages && preserveImages.length > 0) {
    promptParts.push(`
${'='.repeat(80)}
🎨 IMAGENS DA MARCA/IDENTIDADE VISUAL (${preserveImages.length} fornecidas)
${'='.repeat(80)}

📌 INSTRUÇÕES PARA USO DESSAS IMAGENS:
   - Estas são imagens OFICIAIS da identidade visual/marca
   - Use EXATAMENTE o estilo visual, paleta de cores e estética dessas imagens
   - Mantenha a MESMA qualidade visual e nível de acabamento
   - Replique elementos de design (bordas, texturas, filtros, efeitos)
   - Preserve a atmosfera e mood transmitidos
   - A nova imagem DEVE parecer parte do mesmo conjunto visual
   - Se houver logotipos ou elementos específicos, mantenha-os reconhecíveis

⚠️ IMPORTANTE: A imagem final deve manter a identidade visual estabelecida
${'='.repeat(80)}
    `);
  }

  if (styleReferenceImages && styleReferenceImages.length > 0) {
    promptParts.push(`
${'='.repeat(80)}
✨ IMAGENS DE REFERÊNCIA DE ESTILO (${styleReferenceImages.length} fornecidas)
${'='.repeat(80)}

📋 INSTRUÇÕES PARA USO:
   - Inspiração adicional para composição, estilo ou elementos específicos
   - Analise elementos visuais (cores, layout, objetos, atmosfera)
   - Adapte esses elementos de forma coerente
   - Use como complemento às imagens principais da marca
   - Não é necessário replicar exatamente, apenas se inspirar

💡 Use estas imagens para enriquecer a criação, mas priorize as imagens de identidade
${'='.repeat(80)}
    `);
  }

  // Strategic context
  if (brand) {
    if (theme) {
      promptParts.push(`Imagem profissional para a marca "${brand}", destacando o tema estratégico "${theme}".`);
    } else {
      promptParts.push(`Imagem comercial profissional para a marca "${brand}".`);
    }
  }

  // Main description with photorealism
  if (description) {
    promptParts.push(
      `Uma fotografia comercial de alta precisão e fotorrealismo, com atenção detalhada aos aspectos de iluminação e composição. ` +
      `Seguindo a descrição: ${description}`
    );
  }

  // Tone and atmosphere
  const toneMap: { [key: string]: string } = {
    inspirador: "Cena iluminada pela luz dourada, com raios suaves atravessando o cenário. Atmosfera edificante e esperançosa.",
    motivacional: "Cores vibrantes e saturadas, com iluminação dinâmica e uso de motion blur leve para dar sensação de movimento.",
    profissional: "Estética corporativa limpa, iluminação neutra, com foco nítido e fundo minimalista.",
    casual: "Luz natural suave, com elementos cotidianos e paleta de cores acolhedora.",
    elegante: "Paleta refinada, com iluminação suave e texturas nobres como mármore ou veludo.",
    moderno: "Design arrojado com formas geométricas e alta contrastância.",
    divertido: "Cores vibrantes, com elementos gráficos lúdicos e iluminação alegre.",
    minimalista: "Paleta monocromática ou neutra, com iluminação uniforme e composição limpa."
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

  // Technical camera details
  promptParts.push(
    "Detalhes técnicos: foto capturada com câmera DSLR de alta qualidade, lente de 85mm f/1.4. " +
    "Profundidade de campo rasa criando efeito bokeh suave no fundo."
  );

  // Platform optimization
  if (platform) {
    promptParts.push(`Otimizado para ${platform}.`);
  }

  // Additional elements
  if (persona) promptParts.push(`Conectando-se com a persona de ${persona}`);
  if (objective) promptParts.push(`Objetivo: ${objective}`);
  if (additionalInfo) promptParts.push(`Elementos visuais adicionais: ${additionalInfo}`);

  // Text instructions
  const includeText = formData.includeText ?? false;
  const textContent = cleanInput(formData.textContent);
  const textPosition = formData.textPosition || 'center';

  if (!includeText) {
    promptParts.push(
      "CRÍTICO: NÃO incluir NENHUM texto, palavra, letra, número, símbolo ou caractere escrito visível na imagem. " +
      "A imagem deve ser puramente visual, sem qualquer elemento de texto sobreposto."
    );
  } else if (textContent?.trim()) {
    const positionInstructions: Record<string, string> = {
      'top': 'no topo da imagem',
      'center': 'centralizado na imagem',
      'bottom': 'na parte inferior da imagem',
      'top-left': 'no canto superior esquerdo',
      'top-right': 'no canto superior direito',
      'bottom-left': 'no canto inferior esquerdo',
      'bottom-right': 'no canto inferior direito'
    };
    
    promptParts.push(
      `IMPORTANTE: Incluir o seguinte texto ${positionInstructions[textPosition] || 'centralizado na imagem'}: "${textContent}". ` +
      `O texto deve ser legível, bem visível, com tipografia apropriada e contraste adequado com o fundo.`
    );
  }

  // Advanced configurations
  if (colorPalette !== 'auto') {
    const colorPaletteDescriptions: { [key: string]: string } = {
      warm: "Paleta de cores quentes: tons de laranja, vermelho, amarelo e dourado",
      cool: "Paleta de cores frias: tons de azul, verde, roxo e prata",
      monochrome: "Paleta monocromática com variações de um único tom",
      vibrant: "Paleta vibrante com cores saturadas e contrastantes",
      pastel: "Paleta suave com cores pastel delicadas",
      earthy: "Paleta terrosa com tons naturais de marrom, verde e bege"
    };
    const paletteDesc = colorPaletteDescriptions[colorPalette];
    if (paletteDesc) {
      promptParts.push(paletteDesc);
    }
  }

  if (lighting !== 'natural') {
    const lightingDescriptions: { [key: string]: string } = {
      studio: "Iluminação de estúdio controlada e profissional",
      dramatic: "Iluminação dramática com alto contraste e sombras marcadas",
      soft: "Iluminação suave e difusa",
      backlit: "Iluminação traseira criando silhuetas e halos de luz",
      golden_hour: "Iluminação dourada do pôr do sol ou nascer do sol"
    };
    const lightDesc = lightingDescriptions[lighting];
    if (lightDesc) {
      promptParts.push(lightDesc);
    }
  }

  if (composition !== 'auto') {
    const compositionDescriptions: { [key: string]: string } = {
      rule_of_thirds: "Composição seguindo a regra dos terços",
      centered: "Composição centralizada e simétrica",
      leading_lines: "Composição com linhas guias direcionando o olhar",
      frame_within_frame: "Composição com moldura dentro da moldura",
      symmetrical: "Composição simétrica e balanceada"
    };
    const compDesc = compositionDescriptions[composition];
    if (compDesc) {
      promptParts.push(compDesc);
    }
  }

  if (cameraAngle !== 'eye_level') {
    const cameraAngleDescriptions: { [key: string]: string } = {
      bird_eye: "Ângulo de câmera aéreo (visão de cima)",
      low_angle: "Ângulo baixo olhando para cima",
      dutch_angle: "Ângulo holandês (inclinado)",
      over_shoulder: "Ângulo sobre o ombro",
      close_up: "Close-up detalhado"
    };
    const angleDesc = cameraAngleDescriptions[cameraAngle];
    if (angleDesc) {
      promptParts.push(angleDesc);
    }
  }

  if (mood !== 'auto') {
    const moodDescriptions: { [key: string]: string } = {
      energetic: "Atmosfera energética e dinâmica",
      calm: "Atmosfera calma e serena",
      mysterious: "Atmosfera misteriosa e intrigante",
      joyful: "Atmosfera alegre e festiva",
      melancholic: "Atmosfera melancólica e contemplativa",
      powerful: "Atmosfera poderosa e impactante"
    };
    const moodDesc = moodDescriptions[mood];
    if (moodDesc) {
      promptParts.push(moodDesc);
    }
  }

  if (negativePrompt) {
    promptParts.push(`Evitar: ${negativePrompt}`);
  }

  promptParts.push(`Nível de detalhamento: ${detailLevel}/10`);

  return promptParts.join("\n\n");
}
