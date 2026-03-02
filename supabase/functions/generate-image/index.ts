import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { CREDIT_COSTS } from '../_shared/creditCosts.ts';
import { checkUserCredits, deductUserCredits, recordUserCreditUsage } from '../_shared/userCredits.ts';
import { expandBriefing } from '../_shared/expandBriefing.ts';

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

// =====================================
// STYLE SETTINGS - Visual Style Mapping
// =====================================
const getStyleSettings = (styleType: string) => {
  const styles: Record<string, { suffix: string; negativePrompt: string }> = {
    realistic: {
      suffix: "high-end portrait photography, hyper-realistic, masterpiece, 8k, shot on 85mm lens, f/1.8, cinematic lighting, sharp focus, natural skin tone, professional studio lighting",
      negativePrompt: "deformed, asymmetrical face, plastic skin, doll-like, cartoon, anime, 3d render, lowres, bad anatomy, bad hands, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, jpeg artifacts, blurry, unnatural skin color"
    },
    animated: {
      suffix: "3D animated character in Pixar/Disney style, expressive features, smooth stylized rendering, vibrant colors, professional 3D animation quality, studio lighting, octane render",
      negativePrompt: "realistic photo, photograph, ugly, deformed, noisy, blurry, low contrast, realism, photorealistic, low quality"
    },
    cartoon: {
      suffix: "cartoon illustration style, bold outlines, flat colors, expressive character design, comic book style, vibrant and playful, clean vector-like illustration",
      negativePrompt: "realistic, photograph, 3d render, dark, scary, blurry, low quality, bad anatomy"
    },
    anime: {
      suffix: "anime art style, Japanese animation aesthetic, detailed eyes, clean lineart, vibrant cel-shading, manga-inspired, studio quality anime illustration",
      negativePrompt: "realistic, photograph, western cartoon, ugly, deformed, blurry, low quality, bad anatomy, extra limbs"
    },
    watercolor: {
      suffix: "watercolor painting style, soft washes of color, visible brush strokes, artistic texture, traditional watercolor on paper effect, delicate and flowing",
      negativePrompt: "digital art, photograph, sharp edges, flat colors, cartoon, anime, low quality"
    },
    oil_painting: {
      suffix: "oil painting style, rich textures, visible brushwork, classical art technique, masterful use of light and shadow, gallery-quality fine art",
      negativePrompt: "digital art, photograph, flat colors, cartoon, anime, low quality, blurry"
    },
    digital_art: {
      suffix: "professional digital art, polished illustration, concept art quality, detailed rendering, vibrant digital painting, artstation quality",
      negativePrompt: "photograph, blurry, low quality, bad anatomy, ugly, deformed"
    },
    sketch: {
      suffix: "pencil sketch style, hand-drawn lines, artistic crosshatching, graphite on paper texture, expressive sketching technique, traditional drawing",
      negativePrompt: "photograph, color, digital, painted, blurry, low quality"
    },
    minimalist: {
      suffix: "minimalist design, clean lines, simple shapes, limited color palette, elegant simplicity, modern aesthetic, white space emphasis",
      negativePrompt: "busy, cluttered, complex, realistic photo, detailed, ornate, low quality"
    },
    vintage: {
      suffix: "vintage retro aesthetic, nostalgic color grading, film grain texture, 70s/80s inspired style, warm tones, analog photography feel",
      negativePrompt: "modern, digital, clean, sharp, contemporary, low quality"
    }
  };
  return styles[styleType] || styles.realistic;
};

// =====================================
// PORTRAIT DETECTION
// =====================================
const isPortraitRequest = (promptText: string): boolean => {
  const portraitKeywords = [
    'retrato', 'portrait', 'rosto', 'face', 'pessoa', 'person', 
    'homem', 'man', 'mulher', 'woman', 'criança', 'child',
    'close-up', 'headshot', 'selfie', 'avatar', 'modelo', 'model',
    'executivo', 'executive', 'profissional', 'professional',
    'jovem', 'young', 'idoso', 'elderly', 'adulto', 'adult'
  ];
  const lowerPrompt = promptText.toLowerCase();
  return portraitKeywords.some(keyword => lowerPrompt.includes(keyword));
};

// =====================================
// BRIEFING DOCUMENT BUILDER
// Generates a readable document for the text LLM only.
// This document is NEVER sent to the image model.
// =====================================
function buildBriefingDocument(formData: any): string {
  const sections: string[] = [];
  
  const description = cleanInput(formData.description);
  const brand = cleanInput(formData.brand);
  const theme = cleanInput(formData.theme);
  const persona = cleanInput(formData.persona);
  const platform = cleanInput(formData.platform);
  const objective = cleanInput(formData.objective);
  const tones = Array.isArray(formData.tone) ? formData.tone : (formData.tone ? [formData.tone] : []);
  const additionalInfo = cleanInput(formData.additionalInfo);
  const contentType = formData.contentType || 'organic';
  const visualStyle = formData.visualStyle || 'realistic';
  const negativePrompt = cleanInput(formData.negativePrompt);
  const colorPalette = formData.colorPalette || 'auto';
  const lighting = formData.lighting || 'natural';
  const composition = formData.composition || 'auto';
  const cameraAngle = formData.cameraAngle || 'eye_level';
  const detailLevel = formData.detailLevel || 7;
  const mood = formData.mood || 'auto';
  const preserveImages = formData.preserveImages || [];
  const styleReferenceImages = formData.styleReferenceImages || [];

  // Primary request
  sections.push(`PEDIDO PRINCIPAL DO USUÁRIO (PRIORIDADE MÁXIMA): ${description}`);

  // Brand context
  if (brand) {
    sections.push(`CONTEXTO DA MARCA: ${brand}${theme ? `\nTema estratégico: ${theme}` : ''}`);
  }

  // Persona
  if (persona) {
    sections.push(`PÚBLICO-ALVO (PERSONA): ${persona}`);
  }

  // Platform
  if (platform) {
    const platformMap: Record<string, string> = {
      'instagram_feed': 'Instagram Feed (formato quadrado, alto impacto visual)',
      'instagram_stories': 'Instagram Stories (vertical 9:16, dinâmico)',
      'instagram_reels': 'Instagram Reels (vertical 9:16, tendência)',
      'facebook_post': 'Facebook (compartilhável)',
      'linkedin_post': 'LinkedIn (profissional, corporativo)',
      'tiktok': 'TikTok (vertical, jovem, dinâmico)',
      'youtube_thumbnail': 'YouTube Thumbnail (16:9, chamar atenção)',
      'twitter': 'Twitter/X (horizontal, conciso)',
      'pinterest': 'Pinterest (vertical, estético)',
    };
    sections.push(`PLATAFORMA: ${platformMap[platform] || platform}`);
  }

  // Content type
  sections.push(`TIPO DE CONTEÚDO: ${contentType === 'ads' ? 'Publicidade paga (foco em conversão e CTA)' : 'Conteúdo orgânico (foco em engajamento e conexão)'}`);

  // Objective
  if (objective) {
    sections.push(`OBJETIVO DO POST: ${objective}`);
  }

  // Tones
  if (tones.length > 0) {
    const toneLabels: Record<string, string> = {
      'inspirador': 'inspirador e motivacional',
      'motivacional': 'motivacional e encorajador',
      'profissional': 'profissional e corporativo',
      'casual': 'casual e relaxado',
      'elegante': 'elegante e sofisticado',
      'moderno': 'moderno e contemporâneo',
      'tradicional': 'tradicional e clássico',
      'divertido': 'divertido e lúdico',
      'sério': 'sério e formal'
    };
    sections.push(`TOM DE VOZ: ${tones.map((t: string) => toneLabels[t] || t).join(', ')}`);
  }

  // Visual style
  const styleMap: Record<string, string> = {
    'realistic': 'Fotografia hiper-realista, cinematográfica',
    'animated': 'Animação 3D estilo Pixar/Disney',
    'cartoon': 'Ilustração cartoon com cores vibrantes',
    'anime': 'Arte anime/manga com estética japonesa',
    'watercolor': 'Pintura aquarela com texturas suaves',
    'oil_painting': 'Pintura a óleo clássica',
    'digital_art': 'Arte digital profissional, concept art',
    'sketch': 'Desenho a lápis, sketch artístico',
    'minimalist': 'Design minimalista, clean e elegante',
    'vintage': 'Estética vintage/retrô nostálgica',
  };
  sections.push(`ESTILO VISUAL: ${styleMap[visualStyle] || visualStyle}`);

  // Advanced visual settings
  const advancedParts: string[] = [];
  if (colorPalette !== 'auto') {
    const colorLabels: Record<string, string> = {
      warm: 'Tons quentes (laranja, vermelho, dourado)',
      cool: 'Tons frios (azul, verde, roxo)',
      monochrome: 'Monocromático',
      vibrant: 'Cores vibrantes e saturadas',
      pastel: 'Cores pastel suaves',
      earthy: 'Tons terrosos naturais'
    };
    advancedParts.push(`Paleta: ${colorLabels[colorPalette] || colorPalette}`);
  }
  if (lighting !== 'natural') {
    const lightLabels: Record<string, string> = {
      studio: 'Iluminação de estúdio profissional',
      dramatic: 'Iluminação dramática Rembrandt, alto contraste',
      soft: 'Iluminação suave difusa',
      backlit: 'Contraluz com rim light',
      golden_hour: 'Golden hour, tons quentes e mágicos'
    };
    advancedParts.push(`Iluminação: ${lightLabels[lighting] || lighting}`);
  }
  if (composition !== 'auto') {
    const compLabels: Record<string, string> = {
      rule_of_thirds: 'Regra dos terços',
      centered: 'Composição centralizada e simétrica',
      leading_lines: 'Linhas guia direcionando o olhar',
      frame_within_frame: 'Moldura dentro da moldura',
      symmetrical: 'Simétrica e equilibrada'
    };
    advancedParts.push(`Composição: ${compLabels[composition] || composition}`);
  }
  if (cameraAngle !== 'eye_level') {
    const camLabels: Record<string, string> = {
      bird_eye: 'Vista aérea (de cima)',
      low_angle: 'Ângulo baixo (heroico)',
      dutch_angle: 'Dutch angle (inclinado, dinâmico)',
      over_shoulder: 'Over the shoulder',
      close_up: 'Close-up detalhado'
    };
    advancedParts.push(`Câmera: ${camLabels[cameraAngle] || cameraAngle}`);
  }
  if (mood !== 'auto') {
    const moodLabels: Record<string, string> = {
      energetic: 'Atmosfera energética e dinâmica',
      calm: 'Atmosfera calma e serena',
      mysterious: 'Atmosfera misteriosa e intrigante',
      joyful: 'Atmosfera alegre e festiva',
      melancholic: 'Atmosfera melancólica e contemplativa',
      powerful: 'Atmosfera poderosa e impactante'
    };
    advancedParts.push(`Clima: ${moodLabels[mood] || mood}`);
  }
  if (detailLevel !== 7) advancedParts.push(`Nível de detalhe: ${detailLevel}/10`);

  if (advancedParts.length > 0) {
    sections.push(`CONFIGURAÇÕES VISUAIS AVANÇADAS:\n${advancedParts.join('\n')}`);
  }

  // Reference images info
  if (preserveImages.length > 0) {
    sections.push(`IMAGENS DE REFERÊNCIA DA MARCA: ${preserveImages.length} imagem(ns) da identidade visual foram fornecidas. O resultado deve manter a mesma paleta de cores, estilo e elementos de design.`);
  }
  if (styleReferenceImages.length > 0) {
    sections.push(`IMAGENS DE REFERÊNCIA DE ESTILO: ${styleReferenceImages.length} imagem(ns) de referência de estilo foram fornecidas. Absorva a atmosfera e estética.`);
  }

  // Additional info
  if (additionalInfo) {
    sections.push(`INFORMAÇÕES ADICIONAIS: ${additionalInfo}`);
  }

  // User negative prompt
  if (negativePrompt) {
    sections.push(`ELEMENTOS A EVITAR (pedido do usuário): ${negativePrompt}`);
  }

  // Compliance (for the LLM to incorporate silently)
  sections.push(`COMPLIANCE (incorporar silenciosamente na descrição visual):
- Respeitar diretrizes éticas brasileiras (CONAR/CDC)
- Sem discriminação, sem consumo de álcool visível
- Se público incluir menores, restrições máximas`);

  return sections.join('\n\n');
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

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('team_id, credits')
      .eq('id', authenticatedUserId)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Erro ao carregar perfil do usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authenticatedTeamId = profile?.team_id || null;

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
      platform: formData.platform,
      visualStyle: formData.visualStyle,
      userId: authenticatedUserId, 
      preserveImagesCount: formData.preserveImages?.length || 0,
      styleReferenceImagesCount: formData.styleReferenceImages?.length || 0,
    });

    // Check user credits
    const creditsCheck = await checkUserCredits(supabase, authenticatedUserId, CREDIT_COSTS.COMPLETE_IMAGE);

    if (!creditsCheck.hasCredits) {
      return new Response(
        JSON.stringify({ error: `Créditos insuficientes. Necessário: ${CREDIT_COSTS.COMPLETE_IMAGE} créditos` }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const creditsBefore = creditsCheck.currentCredits;

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // =====================================
    // STAGE 1: Build Briefing Document (for text LLM only)
    // =====================================
    const briefingDocument = buildBriefingDocument(formData);
    console.log('[Stage 1] Briefing document built:', briefingDocument.length, 'chars');

    // =====================================
    // STAGE 2: Expand with text LLM -> pure visual description
    // =====================================
    const includeText = formData.includeText ?? false;
    const textContent = includeText ? cleanInput(formData.textContent) : undefined;

    const briefingResult = await expandBriefing({
      briefingDocument,
      visualStyle: formData.visualStyle || 'realistic',
      hasTextOverlay: includeText,
      textContent: textContent || undefined,
    }, GEMINI_API_KEY);

    // =====================================
    // STAGE 3: Build final clean prompt for image model
    // =====================================
    const visualStyle = formData.visualStyle || 'realistic';
    const description = cleanInput(formData.description);
    const styleSettings = getStyleSettings(visualStyle);
    const isPortrait = visualStyle === 'realistic' && isPortraitRequest(description);

    let finalStyleSuffix = styleSettings.suffix;
    if (isPortrait) {
      finalStyleSuffix = "high-end portrait photography, hyper-realistic eyes with catchlight, detailed skin pores, masterpiece, 8k, shot on 85mm lens, f/1.4, cinematic lighting, sharp focus on eyes, natural skin tone, professional studio lighting, detailed iris";
    }

    // =====================================
    // STAGE 3: Build final CLEAN prompt for image model
    // NO tags, NO marketing jargon, NO logic blocks.
    // Only: visual description + text overlay (if any) + style suffix
    // =====================================
    const visualDescription = briefingResult.expandedPrompt || description;

    // Build the image reference role instruction (prepended to prompt when images exist)
    const preserveImages: string[] = (formData.preserveImages || []).slice(0, 2);
    const styleReferenceImages: string[] = (formData.styleReferenceImages || []).slice(0, 1);
    const hasAnyImages = preserveImages.length > 0 || styleReferenceImages.length > 0;

    let imageRolePrefix = '';
    if (hasAnyImages) {
      const parts: string[] = [];
      if (preserveImages.length > 0) {
        parts.push(`The first ${preserveImages.length} image(s) define the mandatory Visual Identity and Color Palette`);
      }
      if (styleReferenceImages.length > 0) {
        parts.push(`the last image serves only as composition and atmosphere inspiration`);
      }
      imageRolePrefix = `[Image roles: ${parts.join('. ')}]\n\n`;
    }

    // Text overlay handling — added directly to the clean prompt
    let textOverlayBlock = '';
    if (includeText && textContent) {
      const textPosition = cleanInput(formData.textPosition) || 'center';
      const platform = cleanInput(formData.platform) || 'social media';
      textOverlayBlock = `\n\nDesign and Typography: Render PERFECTLY the text: "${textContent}". The text MUST be the main focus, positioned at "${textPosition}", and be 100% legible. Use strategic negative space, subtle gradient overlays, or clean text boxes to ensure absolute contrast between the font and the background. The text should be part of a professional design composition for ${platform}.`;
    }

    // Final clean prompt: image role prefix + visual description + text overlay + style suffix
    const finalCleanPrompt = `${imageRolePrefix}${visualDescription}${textOverlayBlock}, ${finalStyleSuffix}`;

    // Build negative prompt
    const userNegativePrompt = cleanInput(formData.negativePrompt);
    const negativeComponents = [styleSettings.negativePrompt];
    if (userNegativePrompt) negativeComponents.push(userNegativePrompt);
    // When no text requested, enforce text absence via negative prompt
    if (!includeText) {
      negativeComponents.push('text, watermark, typography, letters, signature, words, labels');
    }
    const finalNegativePrompt = negativeComponents.filter(Boolean).join(', ');

    console.log('[Stage 3] Final clean prompt length:', finalCleanPrompt.length, 'chars');
    console.log('[Stage 3] Final clean prompt preview:', finalCleanPrompt.substring(0, 500));
    console.log('[Stage 3] Negative prompt:', finalNegativePrompt.substring(0, 200));

    // =====================================
    // STAGE 4: Prepare reference images (limited to prevent dilution)
    // =====================================
    // IMPORTANT: Sending too many reference images dilutes the prompt's influence.
    // Max 2 brand images + 1 style image = 3 total.
    // The Gemini image model does NOT support explicit style_reference parameters,
    // so multiple images cause prompt dilution — keep the count low.

    const messageContent: any[] = [
      { type: 'text', text: finalCleanPrompt }
    ];

    if (preserveImages.length > 0) {
      console.log(`✅ Adding ${preserveImages.length} brand reference image(s) (max 2)`);
      preserveImages.forEach((img: string) => {
        messageContent.push({ type: 'image_url', image_url: { url: img } });
      });
    }

    if (styleReferenceImages.length > 0) {
      console.log(`✅ Adding ${styleReferenceImages.length} style reference image(s) (max 1)`);
      styleReferenceImages.forEach((img: string) => {
        messageContent.push({ type: 'image_url', image_url: { url: img } });
      });
    }

    console.log(`📦 Total message parts: ${messageContent.length} (1 text + ${messageContent.length - 1} images)`);

    // =====================================
    // STAGE 5: Generate image with retry logic
    // =====================================
    const MAX_RETRIES = 3;
    let lastError: any = null;
    let imageUrl: string | null = null;
    let resultDescription = 'Imagem gerada com sucesso';

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Image generation attempt ${attempt}/${MAX_RETRIES}...`);

        // Convert to Gemini format
        const geminiParts = await Promise.all(messageContent.map(async (item: any) => {
          if (item.type === "text") {
            return { text: item.text };
          } else if (item.type === "image_url") {
            const url = item.image_url.url;
            
            if (url.startsWith('data:')) {
              const base64Data = url.split(',')[1];
              const mimeType = url.match(/data:(.*?);/)?.[1] || 'image/png';
              return { inlineData: { mimeType, data: base64Data } };
            }
            
            try {
              const imageResponse = await fetch(url);
              if (!imageResponse.ok) {
                console.error(`Failed to fetch image from ${url}: ${imageResponse.status}`);
                return null;
              }
              const arrayBuffer = await imageResponse.arrayBuffer();
              const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
              const contentType = imageResponse.headers.get('content-type') || 'image/png';
              return { inlineData: { mimeType: contentType, data: base64Data } };
            } catch (fetchError) {
              console.error(`Error fetching image from ${url}:`, fetchError);
              return null;
            }
          }
          return null;
        })).then(parts => parts.filter(p => p !== null));

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [{ parts: geminiParts }],
            generationConfig: {
              responseModalities: ["IMAGE", "TEXT"]
            }
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Gemini API error (attempt ${attempt}):`, response.status, errorText);
          
          if (response.status === 429) {
            return new Response(
              JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente mais tarde.' }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          lastError = new Error(`Gemini API error: ${response.status}`);
          
          if (attempt < MAX_RETRIES) {
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
              break;
            }
          }

          for (const part of parts) {
            if (part.text) {
              resultDescription = part.text;
              break;
            }
          }
        }

        if (!imageUrl) {
          throw new Error('No image found in Gemini response');
        }

        break; // Success

      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        lastError = error;
        
        if (attempt < MAX_RETRIES) {
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

    // Upload image to storage
    console.log('Uploading image to storage...');
    const timestamp = Date.now();
    const fileName = `content-images/${authenticatedTeamId}/${timestamp}.png`;
    
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

    const { data: { publicUrl } } = supabase.storage
      .from('content-images')
      .getPublicUrl(fileName);

    console.log('Image uploaded successfully:', publicUrl);

    // Deduct credits
    const deductResult = await deductUserCredits(supabase, authenticatedUserId, CREDIT_COSTS.COMPLETE_IMAGE);
    const creditsAfter = deductResult.newCredits;

    if (!deductResult.success) {
      console.error('Error deducting credits:', deductResult.error);
    }

    // Record credit usage
    await recordUserCreditUsage(supabase, {
      userId: authenticatedUserId,
      teamId: authenticatedTeamId,
      actionType: 'COMPLETE_IMAGE',
      creditsUsed: CREDIT_COSTS.COMPLETE_IMAGE,
      creditsBefore,
      creditsAfter,
      description: 'Geração de imagem completa',
      metadata: { platform: formData.platform, visualStyle: formData.visualStyle }
    });

    // Save to history
    const { data: actionData, error: actionError } = await supabase
      .from('actions')
      .insert({
        type: 'CRIAR_CONTEUDO',
        user_id: authenticatedUserId,
        team_id: authenticatedTeamId,
        brand_id: formData.brandId || null,
        status: 'Aprovado',
        approved: true,
        asset_path: fileName,
        thumb_path: fileName,
        details: {
          description: formData.description,
          brandId: formData.brandId,
          themeId: formData.themeId,
          personaId: formData.personaId,
          platform: formData.platform,
          visualStyle: formData.visualStyle,
          contentType: formData.contentType,
          preserveImagesCount: preserveImages.length,
          styleReferenceImagesCount: styleReferenceImages.length
        },
        result: {
          imageUrl: publicUrl,
          description: resultDescription
        }
      })
      .select()
      .single();

    if (actionError) {
      console.error('Error creating action:', actionError);
    }

    return new Response(
      JSON.stringify({ 
        imageUrl: publicUrl,
        description: resultDescription,
        actionId: actionData?.id,
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
