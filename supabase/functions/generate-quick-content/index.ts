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
      '1.91:1': '16:9', // Facebook/LinkedIn landscape
      '3:4': '4:5',     // Map 3:4 to 4:5 (closest portrait format)
    };
    
    // Apply mapping if exists
    if (aspectRatioMap[aspectRatio]) {
      normalizedAspectRatio = aspectRatioMap[aspectRatio];
    }
    
    // If aspect ratio is still not valid, default to 1:1
    if (!validAspectRatios.includes(normalizedAspectRatio)) {
      console.log(`Invalid aspect ratio ${aspectRatio}, defaulting to 1:1`);
      normalizedAspectRatio = '1:1';
    }

    console.log('Generate Quick Content Request:', { 
      promptLength: prompt.length, 
      brandId,
      platform,
      aspectRatio,
      normalizedAspectRatio,
      style,
      quality,
      referenceImagesCount: referenceImages?.length || 0,
      preserveImagesCount: preserveImages?.length || 0,
      styleReferenceImagesCount: styleReferenceImages?.length || 0,
      negativePrompt: negativePrompt ? 'Yes' : 'No',
      colorPalette,
      lighting,
      composition,
      cameraAngle,
      detailLevel,
      mood,
      customDimensions: width && height ? `${width}x${height}` : 'None',
      userId: authenticatedUserId, 
      teamId: authenticatedTeamId 
    });

    // Check user credits (individual)
    const creditCheck = await checkUserCredits(supabase, authenticatedUserId, CREDIT_COSTS.QUICK_IMAGE);

    if (!creditCheck.hasCredits) {
      return new Response(
        JSON.stringify({ error: `Créditos insuficientes. Necessário: ${CREDIT_COSTS.QUICK_IMAGE} créditos` }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Platform specifications - using normalized aspect ratio
    const platformSpecs: Record<string, any> = {
      'Instagram': {
        dimensions: { '1:1': '1080x1080px', '4:5': '1080x1350px', '9:16': '1080x1920px', '16:9': '1080x607px' },
        tips: [
          'Use cores vibrantes e alto contraste para destacar no feed',
          'Mantenha elementos importantes centralizados (safe zone)',
          'Textos legíveis mesmo em miniaturas pequenas',
          'Composição visualmente atraente para parar o scroll'
        ]
      },
      'Facebook': {
        dimensions: { '1:1': '1080x1080px', '4:5': '1080x1350px', '16:9': '1200x630px' },
        tips: [
          'Imagens claras e diretas funcionam melhor',
          'Use espaço generoso para textos se necessário',
          'Cores que se destacam no feed azul do Facebook'
        ]
      },
      'LinkedIn': {
        dimensions: { '1:1': '1080x1080px', '16:9': '1200x627px' },
        tips: [
          'Mantenha profissionalismo e clareza',
          'Cores corporativas e design clean',
          'Evite elementos muito criativos ou informais',
          'Textos concisos e objetivos'
        ]
      },
      'TikTok': {
        dimensions: { '9:16': '1080x1920px', '1:1': '1080x1080px' },
        tips: [
          'Elementos centralizados (UI do app ocupa bordas)',
          'Cores vibrantes e dinâmicas',
          'Composição que chama atenção nos primeiros 3 segundos',
          'Evite textos pequenos nas extremidades'
        ]
      },
      'Twitter/X': {
        dimensions: { '16:9': '1600x900px', '1:1': '800x800px' },
        tips: [
          'Simplicidade e clareza são essenciais',
          'Imagens que transmitem mensagem rapidamente',
          'Alto contraste para legibilidade',
          'Evite detalhes excessivos'
        ]
      },
      'Comunidades': {
        dimensions: { '1:1': '1080x1080px', '16:9': '1600x900px', '3:4': '1080x1440px' },
        tips: [
          'Foco em agregar valor à discussão',
          'Pode ser infográfico, ilustração de conceito ou imagem inspiradora',
          'Clareza e informação útil são mais importantes que produção elaborada',
          'Evite excesso de publicidade visual'
        ]
      }
    };

    // Fetch brand details if provided
    let brandContext = '';
    if (brandId) {
      const { data: brandData } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();

      if (brandData) {
        brandContext = `
Contexto da Marca:
- Nome: ${brandData.name}
- Segmento: ${brandData.segment}
- Valores: ${brandData.values}
- Palavras-chave: ${brandData.keywords}
${brandData.promise ? `- Promessa: ${brandData.promise}` : ''}
`;
      }
    }

    // Build enhanced prompt with all configurations
    let enhancedPrompt = prompt;

    // Add photorealism and professional camera details
    enhancedPrompt += `\n\n${'='.repeat(80)}`;
    enhancedPrompt += `\n📸 FOTOGRAFIA COMERCIAL PROFISSIONAL`;
    enhancedPrompt += `\n${'='.repeat(80)}`;
    enhancedPrompt += `\n\nFotografia comercial de alta precisão e fotorrealismo profissional.`;
    enhancedPrompt += `\nImagem capturada com câmera DSLR de alta qualidade, lente 85mm f/1.4.`;
    enhancedPrompt += `\nProfundidade de campo rasa criando efeito bokeh suave no fundo.`;
    enhancedPrompt += `\nAtenção detalhada aos aspectos de iluminação, composição e qualidade visual.`;
    enhancedPrompt += `\nQualidade fotográfica profissional com foco nítido e textura rica.`;
    enhancedPrompt += `\n${'='.repeat(80)}`;

    // HD/4K Quality Specifications
    enhancedPrompt += `\n\n${'='.repeat(80)}`;
    enhancedPrompt += `\n🎨 ESPECIFICAÇÕES TÉCNICAS DE QUALIDADE HD/4K`;
    enhancedPrompt += `\n${'='.repeat(80)}`;
    enhancedPrompt += `\n\n📐 RESOLUÇÃO E QUALIDADE:`;
    enhancedPrompt += `\n• Resolução mínima: Full HD (1920x1080 pixels)`;
    enhancedPrompt += `\n• Resolução ideal: 4K (3840x2160 pixels) ou superior`;
    enhancedPrompt += `\n• DPI: 300 DPI para impressão profissional`;
    enhancedPrompt += `\n• Nitidez máxima em todos os elementos da imagem`;
    enhancedPrompt += `\n• Textura rica e detalhamento profissional`;
    enhancedPrompt += `\n• Sem artefatos de compressão ou ruído digital`;
    enhancedPrompt += `\n• Adequada para uso comercial, impressão e ampliação`;
    enhancedPrompt += `\n${'='.repeat(80)}`;

    // Add platform-specific guidelines with target resolution
    const resolutionMap: Record<string, string> = {
      '1:1': '4096x4096px (4K quadrado - Instagram Feed, LinkedIn)',
      '4:5': '3240x4050px (Alta resolução portrait - Instagram Feed)',
      '9:16': '2160x3840px (4K vertical - Stories, Reels, TikTok)',
      '16:9': '3840x2160px (4K landscape - YouTube, TV, apresentações)',
      '3:4': '3240x4320px (Alta resolução portrait - Pinterest)'
    };
    
    const targetResolution = resolutionMap[normalizedAspectRatio] || 'Resolução 4K ou superior';
    
    enhancedPrompt += `\n\n📏 RESOLUÇÃO ALVO: ${targetResolution}`;
    
    // Add platform-specific guidelines using normalized aspect ratio
    if (platform && platformSpecs[platform]) {
      const spec = platformSpecs[platform];
      const dimensionInfo = spec.dimensions[normalizedAspectRatio] || spec.dimensions['1:1'];
      
      enhancedPrompt += `\n\n=== ESPECIFICAÇÕES DA PLATAFORMA: ${platform} ===`;
      enhancedPrompt += `\nDimensões: ${dimensionInfo}`;
      enhancedPrompt += `\nFormato: ${normalizedAspectRatio}`;
      enhancedPrompt += `\n\nDiretrizes de Design para ${platform}:`;
      spec.tips.forEach((tip: string, idx: number) => {
        enhancedPrompt += `\n${idx + 1}. ${tip}`;
      });
    }

    // Add style information
    if (style !== 'auto') {
      const styleDescriptions: Record<string, string> = {
        'photorealistic': 'Estilo fotorrealista, com alta fidelidade e detalhes realistas.',
        'illustration': 'Estilo de ilustração artística e criativa.',
        'minimalist': 'Estilo minimalista, clean e moderno.',
        'artistic': 'Estilo artístico, expressivo e abstrato.',
        'vintage': 'Estilo vintage/retrô com toque nostálgico.'
      };
      const styleDesc = styleDescriptions[style];
      if (styleDesc) {
        enhancedPrompt += `\n\nEstilo Visual: ${styleDesc}`;
      }
    }

    // ============ OPÇÕES AVANÇADAS ============

    // Negative Prompt
    if (negativePrompt && negativePrompt.trim() !== '') {
      enhancedPrompt += `\n\n🚫 ELEMENTOS A EVITAR (Negative Prompt):`;
      enhancedPrompt += `\nNÃO incluir os seguintes elementos na imagem:`;
      enhancedPrompt += `\n- ${negativePrompt}`;
      enhancedPrompt += `\nRemova completamente estes elementos da composição.`;
    }

    // Color Palette
    if (colorPalette !== 'auto') {
      const paletteDescriptions: Record<string, string> = {
        'vibrant': 'Paleta de cores vibrantes e saturadas, com alto contraste e energia visual.',
        'pastel': 'Paleta de cores pastel suaves e delicadas, transmitindo leveza e serenidade.',
        'monochrome': 'Paleta monocromática com variações de uma única cor, criando coesão visual.',
        'warm': 'Paleta de cores quentes (vermelhos, laranjas, amarelos) transmitindo energia e calor.',
        'cool': 'Paleta de cores frias (azuis, verdes, roxos) transmitindo calma e profissionalismo.',
        'earth': 'Paleta de tons terrosos (marrons, bege, verde oliva) com atmosfera natural e orgânica.',
        'neon': 'Paleta neon vibrante e fluorescente, moderna e impactante.',
        'brand': 'Use EXCLUSIVAMENTE as cores da identidade visual da marca fornecida.'
      };
      const paletteDesc = paletteDescriptions[colorPalette];
      if (paletteDesc) {
        enhancedPrompt += `\n\n🎨 PALETA DE CORES:`;
        enhancedPrompt += `\n${paletteDesc}`;
        enhancedPrompt += `\nMantenha consistência cromática em toda a composição.`;
      }
    }

    // Lighting (Enhanced with cinematic descriptions)
    if (lighting !== 'natural') {
      const lightingDescriptions: Record<string, string> = {
        'natural': 'Iluminação natural equilibrada e orgânica, simulando luz do dia.',
        'studio': 'Iluminação de estúdio profissional com setup de três pontos (key light, fill light, back light). Iluminação uniforme sem sombras duras. Qualidade comercial.',
        'dramatic': 'Iluminação cinematográfica dramática com alto contraste entre luz e sombra (técnica chiaroscuro). Sombras profundas e definidas criando profundidade tridimensional e atmosfera intensa.',
        'soft': 'Iluminação suave e difusa usando softbox ou luz natural filtrada. Transições suaves entre luz e sombra. Sombras quase imperceptíveis. Atmosfera delicada e etérea.',
        'golden_hour': 'Iluminação mágica de golden hour (luz dourada do nascer/pôr do sol). Tons quentes (laranja, dourado, âmbar). Raios de luz atravessando o cenário. Long shadows e atmosfera nostálgica.',
        'backlit': 'Iluminação traseira (backlight/contre-jour) criando contornos luminosos e halos de luz ao redor dos elementos. Silhuetas definidas. Atmosfera etérea e dramática.',
        'low_key': 'Iluminação low-key com predominância de tons escuros e sombras profundas. Iluminação pontual e seletiva destacando apenas elementos-chave. Atmosfera misteriosa e dramática.',
        'high_key': 'Iluminação high-key com predominância de tons claros e brilhantes. Sombras mínimas. Atmosfera limpa, alegre e otimista.'
      };
      const lightingDesc = lightingDescriptions[lighting];
      if (lightingDesc) {
        enhancedPrompt += `\n\n💡 ILUMINAÇÃO PROFISSIONAL:`;
        enhancedPrompt += `\n${lightingDesc}`;
      }
    }

    // Composition (Enhanced with technical details)
    if (composition !== 'auto') {
      const compositionDescriptions: Record<string, string> = {
        'centered': 'Composição centralizada com elemento principal no centro geométrico da imagem. Equilíbrio simétrico transmitindo estabilidade e foco.',
        'rule_of_thirds': 'Composição profissional seguindo a regra dos terços. Elementos principais posicionados nos pontos de intersecção das linhas imaginárias (hotspots). Equilíbrio visual dinâmico.',
        'symmetrical': 'Composição perfeitamente simétrica e espelhada. Equilíbrio bilateral transmitindo ordem, harmonia e formalidade.',
        'asymmetrical': 'Composição assimétrica com equilíbrio visual dinâmico. Pesos visuais distribuídos de forma não-uniforme criando tensão e interesse visual.',
        'diagonal': 'Composição diagonal com elementos principais seguindo linhas diagonais. Cria movimento, dinamismo e energia visual. Quebra a estaticidade.',
        'frame_within_frame': 'Composição frame-within-frame usando elementos naturais (portas, janelas, arcos) para emoldurar o elemento principal. Adiciona profundidade e foco.',
        'leading_lines': 'Composição com linhas guia (leading lines) convergindo para o elemento principal. Estradas, trilhos, cercas ou linhas arquitetônicas direcionando o olhar do espectador.'
      };
      const compositionDesc = compositionDescriptions[composition];
      if (compositionDesc) {
        enhancedPrompt += `\n\n📐 COMPOSIÇÃO FOTOGRÁFICA:`;
        enhancedPrompt += `\n${compositionDesc}`;
      }
    }

    // Camera Angle (Enhanced with technical details)
    if (cameraAngle !== 'eye_level') {
      const angleDescriptions: Record<string, string> = {
        'eye_level': 'Ângulo de câmera na altura dos olhos (eye level). Perspectiva natural e neutra criando conexão direta com o espectador.',
        'high_angle': 'Ângulo alto (high angle) com câmera posicionada acima olhando para baixo. Cria sensação de vulnerabilidade ou visão panorâmica.',
        'low_angle': 'Ângulo baixo (low angle) com câmera posicionada abaixo olhando para cima. Transmite imponência, poder e grandiosidade do elemento.',
        'birds_eye': 'Ângulo aéreo (bird\'s eye view) diretamente de cima. Visão de topo (top-down) criando padrões gráficos e perspectiva única.',
        'worms_eye': 'Ângulo do chão (worm\'s eye view) diretamente de baixo. Perspectiva extrema olhando para cima transmitindo escala monumental.',
        'dutch_angle': 'Ângulo holandês (dutch angle/canted angle) com câmera inclinada. Horizonte diagonal criando tensão visual, desconforto ou dinamismo.'
      };
      const angleDesc = angleDescriptions[cameraAngle];
      if (angleDesc) {
        enhancedPrompt += `\n\n📷 ÂNGULO DE CÂMERA:`;
        enhancedPrompt += `\n${angleDesc}`;
      }
    }

    // Detail Level
    if (detailLevel !== 7) {
      const detailDescriptions: Record<number, string> = {
        1: 'Minimalista extremo - elementos essenciais apenas, muito espaço negativo',
        2: 'Minimalista - poucos elementos, composição limpa e simples',
        3: 'Clean - elementos bem espaçados, simplicidade moderna',
        4: 'Balanceado-simples - alguns detalhes sem sobrecarga',
        5: 'Balanceado - equilíbrio entre simplicidade e detalhes',
        6: 'Moderado - bom nível de detalhamento',
        7: 'Detalhado - composição rica com múltiplos elementos',
        8: 'Muito detalhado - alta complexidade visual',
        9: 'Ultra detalhado - máximo detalhamento em cada elemento',
        10: 'Hiper detalhado - resolução máxima, cada textura e detalhe visível'
      };
      const detailDesc = detailDescriptions[detailLevel];
      if (detailDesc) {
        enhancedPrompt += `\n\n🔍 NÍVEL DE DETALHAMENTO: ${detailLevel}/10`;
        enhancedPrompt += `\n${detailDesc}`;
      }
    }

    // Mood
    if (mood !== 'auto') {
      const moodDescriptions: Record<string, string> = {
        'energetic': 'Atmosfera energética e vibrante. Dinamismo visual, cores vivas e composição ativa transmitindo movimento e vitalidade.',
        'calm': 'Atmosfera calma e serena. Tons suaves, composição equilibrada e elementos que transmitem paz e tranquilidade.',
        'professional': 'Atmosfera profissional e corporativa. Clean, moderno e confiável. Cores sóbrias com toques de sofisticação.',
        'playful': 'Atmosfera divertida e lúdica. Cores alegres, formas orgânicas e elementos que transmitem alegria e leveza.',
        'elegant': 'Atmosfera elegante e luxuosa. Refinamento visual, detalhes sofisticados e composição que transmite exclusividade.',
        'cozy': 'Atmosfera aconchegante e confortável. Tons quentes, texturas ricas e sensação de conforto e intimidade.',
        'mysterious': 'Atmosfera misteriosa e intrigante. Sombras dramáticas, elementos enigmáticos e composição que desperta curiosidade.',
        'inspiring': 'Atmosfera inspiradora e motivacional. Composição elevada, perspectiva ampla e elementos que transmitem aspiração.'
      };
      const moodDesc = moodDescriptions[mood];
      if (moodDesc) {
        enhancedPrompt += `\n\n🌟 ATMOSFERA/MOOD:`;
        enhancedPrompt += `\n${moodDesc}`;
      }
    }

    // Add brand context at the end
    if (brandContext) {
      enhancedPrompt += `\n\n${brandContext}`;
    }

    // Add quality suffix
    if (quality === 'premium') {
      enhancedPrompt += `\n\n✨ QUALIDADE PREMIUM: Produção fotográfica de altíssimo padrão com atenção obsessiva a cada detalhe. Acabamento profissional de agência de publicidade top-tier.`;
    }

    console.log('Final enhanced prompt length:', enhancedPrompt.length);

    // Prepare reference images for the API
    const imageInputs: any[] = [];
    
    // Add preserve images (main reference images) with high weight
    if (preserveImages && preserveImages.length > 0) {
      for (const img of preserveImages) {
        if (img) {
          // Check if it's a base64 string or URL
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

    // Add reference images as secondary references
    if (referenceImages && referenceImages.length > 0) {
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
    if (styleReferenceImages && styleReferenceImages.length > 0) {
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

    // Call Gemini API directly with Google's API
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY não configurada. Configure a chave da API do Gemini.' }),
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
          temperature: 1.0,
          topP: 0.95,
          topK: 40
        }
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', geminiResponse.status, errorText);
      
      // Check for specific error types
      if (geminiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (geminiResponse.status === 400) {
        return new Response(
          JSON.stringify({ error: 'Erro na requisição. Verifique se o prompt não contém conteúdo proibido.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
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
          // Convert base64 to data URL
          const mimeType = part.inlineData.mimeType || 'image/png';
          imageUrl = `data:${mimeType};base64,${part.inlineData.data}`;
        }
        if (part.text) {
          textResponse = part.text;
        }
      }
    }

    if (!imageUrl) {
      console.error('No image in Gemini response:', JSON.stringify(geminiData));
      return new Response(
        JSON.stringify({ error: 'Não foi possível gerar a imagem. Tente novamente com um prompt diferente.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Image generated successfully');

    // Deduct credits after successful generation (individual)
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
          hasReferenceImages: referenceImages?.length > 0,
          hasPreserveImages: preserveImages?.length > 0,
          hasStyleReferenceImages: styleReferenceImages?.length > 0
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
        creditsRemaining: deductResult.newCredits
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
