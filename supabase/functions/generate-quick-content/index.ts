import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { CREDIT_COSTS } from '../_shared/creditCosts.ts';
import { checkUserCredits, deductUserCredits, recordUserCreditUsage } from '../_shared/userCredits.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Fetch user's team from profile (optional now)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('team_id, credits')
      .eq('id', authenticatedUserId)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authenticatedTeamId = profile?.team_id || null;

    const body = await req.json();
    
    // Input validation
    if (!body.prompt || typeof body.prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Prompt inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (body.prompt.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Prompt muito longo (máximo 5000 caracteres)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { 
      prompt, 
      brandId,
      themeId,
      personaId,
      platform,
      referenceImages = [],
      preserveImages = [],
      styleReferenceImages = [],
      aspectRatio = '1:1',
      style = 'auto',
      quality = 'standard',
      negativePrompt = '',
      colorPalette = 'auto',
      lighting = 'natural',
      composition = 'auto',
      cameraAngle = 'eye_level',
      detailLevel = 7,
      mood = 'auto',
      width = '',
      height = ''
    } = body;

    // Map aspect ratios from platformSpecs to AI model supported ratios
    const validAspectRatios = ['1:1', '4:5', '9:16', '16:9', '3:4'];
    let normalizedAspectRatio = aspectRatio;
    
    // Map common platform aspect ratios to supported ones
    const aspectRatioMap: Record<string, string> = {
      '1.91:1': '16:9',
      '3:4': '4:5',
    };
    
    if (aspectRatioMap[aspectRatio]) {
      normalizedAspectRatio = aspectRatioMap[aspectRatio];
    }
    
    if (!validAspectRatios.includes(normalizedAspectRatio)) {
      console.log(`Invalid aspect ratio ${aspectRatio}, defaulting to 1:1`);
      normalizedAspectRatio = '1:1';
    }

    const hasPreserveImages = preserveImages && preserveImages.length > 0;
    const hasReferenceImages = referenceImages && referenceImages.length > 0;
    const hasStyleReferenceImages = styleReferenceImages && styleReferenceImages.length > 0;

    console.log('Generate Quick Content Request:', { 
      promptLength: prompt.length, 
      brandId,
      platform,
      aspectRatio,
      normalizedAspectRatio,
      style,
      hasPreserveImages,
      hasReferenceImages,
      hasStyleReferenceImages,
      userId: authenticatedUserId, 
      teamId: authenticatedTeamId 
    });

    // Check user credits
    const creditCheck = await checkUserCredits(supabase, authenticatedUserId, CREDIT_COSTS.QUICK_IMAGE);

    if (!creditCheck.hasCredits) {
      return new Response(
        JSON.stringify({ error: `Créditos insuficientes. Necessário: ${CREDIT_COSTS.QUICK_IMAGE} créditos` }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch brand details if provided
    let brandContext = '';
    let brandName = null;
    if (brandId) {
      const { data: brandData } = await supabase
        .from('brands')
        .select('name, segment, values, keywords, promise, color_palette')
        .eq('id', brandId)
        .single();

      if (brandData) {
        brandName = brandData.name;
        brandContext = `MARCA: ${brandData.name} (${brandData.segment})`;
        if (brandData.values) brandContext += ` | Valores: ${brandData.values}`;
        if (brandData.keywords) brandContext += ` | Keywords: ${brandData.keywords}`;
      }
    }

    // Fetch theme details if provided
    let themeContext = '';
    let themeName = null;
    if (themeId) {
      const { data: themeData } = await supabase
        .from('strategic_themes')
        .select('title, description, tone_of_voice, target_audience, color_palette, objectives')
        .eq('id', themeId)
        .single();

      if (themeData) {
        themeName = themeData.title;
        themeContext = `TEMA: ${themeData.title}`;
        if (themeData.tone_of_voice) themeContext += ` | Tom: ${themeData.tone_of_voice}`;
        if (themeData.target_audience) themeContext += ` | Público: ${themeData.target_audience}`;
        if (themeData.objectives) themeContext += ` | Objetivos: ${themeData.objectives}`;
      }
    }

    // Fetch persona details if provided
    let personaContext = '';
    let personaName = null;
    if (personaId) {
      const { data: personaData } = await supabase
        .from('personas')
        .select('name, age, gender, professional_context, beliefs_and_interests, preferred_tone_of_voice, main_goal')
        .eq('id', personaId)
        .single();

      if (personaData) {
        personaName = personaData.name;
        personaContext = `PERSONA: ${personaData.name} (${personaData.age}, ${personaData.gender})`;
        if (personaData.professional_context) personaContext += ` | Contexto: ${personaData.professional_context}`;
        if (personaData.preferred_tone_of_voice) personaContext += ` | Tom preferido: ${personaData.preferred_tone_of_voice}`;
        if (personaData.main_goal) personaContext += ` | Objetivo: ${personaData.main_goal}`;
      }
    }

    // ========================================
    // BUILD SIMPLIFIED PROMPT - USER INTENT FIRST
    // ========================================
    
    // Detect if user is requesting text in the image
    const textRequestPatterns = [
      /texto/i, /escreva/i, /escrito/i, /palavra/i, /frase/i, /título/i, /legenda/i,
      /slogan/i, /chamada/i, /headline/i, /quote/i, /citação/i, /mensagem/i,
      /dizendo/i, /dizer/i, /com a frase/i, /com o texto/i, /contendo/i,
      /write/i, /text/i, /saying/i, /with the words/i
    ];
    const userWantsText = textRequestPatterns.some(pattern => pattern.test(prompt));
    
    // Start with user's exact request - THIS IS THE PRIORITY
    let enhancedPrompt = prompt;
    
    // Add minimal style context only if specified
    const styleHints: string[] = [];
    
    if (style !== 'auto') {
      const styleMap: Record<string, string> = {
        'photorealistic': 'fotorrealista',
        'illustration': 'ilustração',
        'minimalist': 'minimalista',
        'artistic': 'artístico',
        'vintage': 'vintage'
      };
      if (styleMap[style]) styleHints.push(styleMap[style]);
    }
    
    if (lighting !== 'natural') {
      const lightingMap: Record<string, string> = {
        'studio': 'iluminação de estúdio',
        'dramatic': 'iluminação dramática',
        'soft': 'luz suave',
        'golden_hour': 'golden hour',
        'backlit': 'contra-luz',
        'low_key': 'low-key',
        'high_key': 'high-key'
      };
      if (lightingMap[lighting]) styleHints.push(lightingMap[lighting]);
    }
    
    if (mood !== 'auto') {
      const moodMap: Record<string, string> = {
        'energetic': 'energético',
        'calm': 'sereno',
        'professional': 'profissional',
        'playful': 'lúdico',
        'elegant': 'elegante',
        'cozy': 'aconchegante',
        'mysterious': 'misterioso',
        'inspiring': 'inspirador'
      };
      if (moodMap[mood]) styleHints.push(moodMap[mood]);
    }
    
    if (colorPalette !== 'auto') {
      const paletteMap: Record<string, string> = {
        'vibrant': 'cores vibrantes',
        'pastel': 'tons pastel',
        'monochrome': 'monocromático',
        'warm': 'cores quentes',
        'cool': 'cores frias',
        'earth': 'tons terrosos',
        'neon': 'neon',
        'brand': 'cores da marca'
      };
      if (paletteMap[colorPalette]) styleHints.push(paletteMap[colorPalette]);
    }
    
    // Add style hints if any
    if (styleHints.length > 0) {
      enhancedPrompt += `. Estilo: ${styleHints.join(', ')}`;
    }
    
    // Add brand context briefly
    if (brandName) {
      enhancedPrompt += `. Para a marca ${brandName}`;
    }
    
    // Add text rules only if needed
    if (userWantsText) {
      enhancedPrompt += `. Texto em português correto e legível`;
    } else {
      enhancedPrompt += `. Sem texto ou letras na imagem`;
    }
    
    // Add negative prompt if specified
    if (negativePrompt && negativePrompt.trim()) {
      enhancedPrompt += `. Evitar: ${negativePrompt}`;
    }
    
    // Add quality suffix
    enhancedPrompt += `. Alta qualidade, resolução profissional.`;
    
    // Add reference image context for the model
    if (hasPreserveImages) {
      enhancedPrompt += ` Mantenha os elementos das imagens anexadas.`;
    } else if (hasStyleReferenceImages) {
      enhancedPrompt += ` Use o estilo visual das imagens de referência.`;
    } else if (hasReferenceImages) {
      enhancedPrompt += ` Inspire-se nas imagens anexadas.`;
    }

    console.log('Simplified prompt:', enhancedPrompt);
    console.log('Prompt length:', enhancedPrompt.length, 'chars');

    // Prepare reference images for the API
    const imageInputs: any[] = [];
    
    // Add preserve images first (highest priority)
    if (hasPreserveImages) {
      for (const img of preserveImages) {
        if (img) {
          const isBase64 = typeof img === 'string' && (img.startsWith('data:') || !img.startsWith('http'));
          if (isBase64) {
            const base64Data = img.startsWith('data:') ? img.split(',')[1] : img;
            imageInputs.push({
              inlineData: {
                mimeType: 'image/png',
                data: base64Data
              }
            });
          }
        }
      }
    }

    // Add reference images
    if (hasReferenceImages) {
      for (const img of referenceImages) {
        if (img) {
          const isBase64 = typeof img === 'string' && (img.startsWith('data:') || !img.startsWith('http'));
          if (isBase64) {
            const base64Data = img.startsWith('data:') ? img.split(',')[1] : img;
            imageInputs.push({
              inlineData: {
                mimeType: 'image/png',
                data: base64Data
              }
            });
          }
        }
      }
    }

    // Add style reference images
    if (hasStyleReferenceImages) {
      for (const img of styleReferenceImages) {
        if (img) {
          const isBase64 = typeof img === 'string' && (img.startsWith('data:') || !img.startsWith('http'));
          if (isBase64) {
            const base64Data = img.startsWith('data:') ? img.split(',')[1] : img;
            imageInputs.push({
              inlineData: {
                mimeType: 'image/png',
                data: base64Data
              }
            });
          }
        }
      }
    }

    console.log('Reference images prepared:', imageInputs.length);

    // Call Gemini API with improved settings
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY não configurada.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the request body with images if available
    const requestParts: any[] = [{ text: enhancedPrompt }];
    
    // Add all image inputs
    for (const imageInput of imageInputs) {
      requestParts.push(imageInput);
    }

    console.log('Calling Gemini API with', requestParts.length, 'parts (including', imageInputs.length, 'images)');

    // Use improved model with high quality settings
    // Note: gemini-2.0-flash-exp-image-generation generates high-res images by default
    // Aspect ratio is controlled via prompt context
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: requestParts
        }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          temperature: 0.7,
          topP: 0.9,
          topK: 32
        }
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      
      if (geminiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (geminiResponse.status === 400) {
        // Check if it's a content policy violation
        if (errorText.includes('SAFETY') || errorText.includes('policy')) {
          return new Response(
            JSON.stringify({ 
              error: 'O conteúdo solicitado viola as políticas de uso. Tente um prompt diferente.',
              isComplianceError: true
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({ error: 'Erro na requisição. Verifique o prompt e tente novamente.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Gemini API error: ${geminiResponse.status}`);
    }

    const geminiData = await geminiResponse.json();
    console.log('Gemini response received');

    // Extract image from response
    let imageUrl = null;
    let textResponse = null;

    if (geminiData.candidates && geminiData.candidates[0] && geminiData.candidates[0].content) {
      const parts = geminiData.candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          const mimeType = part.inlineData.mimeType || 'image/png';
          imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
        }
        if (part.text) {
          textResponse = part.text;
        }
      }
    }

    if (!imageUrl) {
      console.error('No image in Gemini response:', JSON.stringify(geminiData).substring(0, 500));
      return new Response(
        JSON.stringify({ error: 'Não foi possível gerar a imagem. Tente novamente com um prompt diferente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Image generated successfully');

    // Deduct credits after successful generation
    const deductResult = await deductUserCredits(supabase, authenticatedUserId, CREDIT_COSTS.QUICK_IMAGE);
    
    if (!deductResult.success) {
      console.error('Error deducting credits:', deductResult.error);
    }

    // Record credit usage
    await recordUserCreditUsage(supabase, {
      userId: authenticatedUserId,
      teamId: authenticatedTeamId,
      actionType: 'QUICK_IMAGE',
      creditsUsed: CREDIT_COSTS.QUICK_IMAGE,
      creditsBefore: creditCheck.currentCredits,
      creditsAfter: deductResult.newCredits,
      description: 'Criação rápida de imagem',
      metadata: { platform, aspectRatio: normalizedAspectRatio, style, brandId }
    });

    // Save action to database
    const { data: actionData, error: actionError } = await supabase
      .from('actions')
      .insert({
        user_id: authenticatedUserId,
        team_id: authenticatedTeamId || '00000000-0000-0000-0000-000000000000',
        type: 'CRIAR_CONTEUDO_RAPIDO',
        status: 'completed',
        brand_id: brandId || null,
        details: {
          prompt,
          platform,
          aspectRatio: normalizedAspectRatio,
          style,
          quality,
          colorPalette,
          lighting,
          composition,
          cameraAngle,
          detailLevel,
          mood,
          negativePrompt: negativePrompt ? true : false,
          hasReferenceImages,
          hasPreserveImages,
          hasStyleReferenceImages,
          themeId,
          personaId
        },
        result: {
          imageUrl,
          textResponse,
          generatedAt: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (actionError) {
      console.error('Error saving action:', actionError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        imageUrl,
        textResponse,
        actionId: actionData?.id,
        creditsUsed: CREDIT_COSTS.QUICK_IMAGE,
        creditsRemaining: deductResult.newCredits,
        brandName,
        themeName,
        personaName,
        platform
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-quick-content:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
