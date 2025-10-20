import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
        JSON.stringify({ error: 'Créditos insuficientes para criação rápida' }),
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

    // Lighting
    if (lighting !== 'natural') {
      const lightingDescriptions: Record<string, string> = {
        'natural': 'Iluminação natural e equilibrada.',
        'studio': 'Iluminação de estúdio profissional, uniforme e sem sombras duras.',
        'dramatic': 'Iluminação dramática com alto contraste entre luz e sombra, criando profundidade.',
        'soft': 'Iluminação suave e difusa, com transições suaves e atmosfera delicada.',
        'golden_hour': 'Iluminação de golden hour (luz dourada do pôr/nascer do sol) com tons quentes.',
        'backlit': 'Iluminação traseira (backlight) criando contornos luminosos e atmosfera etérea.',
        'low_key': 'Iluminação low-key com predominância de sombras e áreas escuras.',
        'high_key': 'Iluminação high-key com predominância de tons claros e brilhantes.'
      };
      const lightingDesc = lightingDescriptions[lighting];
      if (lightingDesc) {
        enhancedPrompt += `\n\n💡 ILUMINAÇÃO:`;
        enhancedPrompt += `\n${lightingDesc}`;
      }
    }

    // Composition
    if (composition !== 'auto') {
      const compositionDescriptions: Record<string, string> = {
        'centered': 'Composição centralizada com elemento principal no centro da imagem.',
        'rule_of_thirds': 'Composição seguindo a regra dos terços, com elementos principais nos pontos de intersecção.',
        'symmetrical': 'Composição simétrica e equilibrada, transmitindo ordem e harmonia.',
        'asymmetrical': 'Composição assimétrica com equilíbrio visual dinâmico.',
        'diagonal': 'Composição diagonal criando movimento e dinamismo visual.',
        'frame_within_frame': 'Composição com moldura dentro da moldura (frame within frame).',
        'leading_lines': 'Composição com linhas guia que direcionam o olhar para o elemento principal.'
      };
      const compositionDesc = compositionDescriptions[composition];
      if (compositionDesc) {
        enhancedPrompt += `\n\n📐 COMPOSIÇÃO:`;
        enhancedPrompt += `\n${compositionDesc}`;
      }
    }

    // Camera Angle
    if (cameraAngle !== 'eye_level') {
      const angleDescriptions: Record<string, string> = {
        'eye_level': 'Ângulo na altura dos olhos (eye level), perspectiva natural.',
        'high_angle': 'Ângulo alto (high angle) olhando de cima para baixo.',
        'low_angle': 'Ângulo baixo (low angle) olhando de baixo para cima, transmitindo imponência.',
        'birds_eye': 'Ângulo aéreo (bird\'s eye view) diretamente de cima.',
        'worms_eye': 'Ângulo do chão (worm\'s eye view) diretamente de baixo.',
        'dutch_angle': 'Ângulo holandês (dutch angle) inclinado para criar tensão visual.'
      };
      const angleDesc = angleDescriptions[cameraAngle];
      if (angleDesc) {
        enhancedPrompt += `\n\n📷 ÂNGULO DE CÂMERA:`;
        enhancedPrompt += `\n${angleDesc}`;
      }
    }

    // Detail Level
    const detailDescriptions: Record<number, string> = {
      1: 'Minimalista - Pouquíssimos detalhes, formas simples e limpas.',
      2: 'Muito simples - Detalhes básicos, composição clean.',
      3: 'Simples - Alguns detalhes essenciais, ainda bastante clean.',
      4: 'Moderadamente simples - Detalhes moderados com foco no essencial.',
      5: 'Equilibrado - Nível médio de detalhamento, nem muito simples nem complexo.',
      6: 'Moderadamente detalhado - Bom nível de detalhes sem excessos.',
      7: 'Detalhado - Riqueza de detalhes visível e equilibrada.',
      8: 'Muito detalhado - Alto nível de detalhamento em todos elementos.',
      9: 'Extremamente detalhado - Detalhes intrincados e complexos.',
      10: 'Hiper-detalhado - Máximo nível de detalhamento possível, textura rica.'
    };
    const detailDesc = detailDescriptions[detailLevel] || detailDescriptions[7];
    enhancedPrompt += `\n\n🔍 NÍVEL DE DETALHAMENTO (${detailLevel}/10):`;
    enhancedPrompt += `\n${detailDesc}`;

    // Mood
    if (mood !== 'auto') {
      const moodDescriptions: Record<string, string> = {
        'professional': 'Atmosfera profissional, séria e corporativa.',
        'energetic': 'Atmosfera energética, vibrante e dinâmica.',
        'calm': 'Atmosfera calma, serena e tranquila.',
        'mysterious': 'Atmosfera misteriosa e intrigante.',
        'playful': 'Atmosfera lúdica, divertida e descontraída.',
        'elegant': 'Atmosfera elegante, sofisticada e refinada.',
        'dramatic': 'Atmosfera dramática, intensa e impactante.',
        'warm': 'Atmosfera calorosa, acolhedora e confortável.',
        'futuristic': 'Atmosfera futurista, moderna e tecnológica.'
      };
      const moodDesc = moodDescriptions[mood];
      if (moodDesc) {
        enhancedPrompt += `\n\n✨ MOOD/ATMOSFERA:`;
        enhancedPrompt += `\n${moodDesc}`;
        enhancedPrompt += `\nA imagem deve transmitir essa atmosfera em todos os elementos.`;
      }
    }

    // Custom Dimensions
    if (width && height) {
      enhancedPrompt += `\n\n📏 DIMENSÕES CUSTOMIZADAS:`;
      enhancedPrompt += `\nLargura: ${width}px`;
      enhancedPrompt += `\nAltura: ${height}px`;
      enhancedPrompt += `\nGere a imagem considerando estas dimensões específicas.`;
    }

    enhancedPrompt += `\n\n${'='.repeat(60)}`;

    // Add aspect ratio information - CRITICAL: Must be enforced
    const aspectRatioDescriptions: Record<string, string> = {
      '1:1': 'formato quadrado (1:1)',
      '4:5': 'formato retrato (4:5)',
      '9:16': 'formato vertical (9:16)',
      '16:9': 'formato horizontal (16:9)',
      '3:4': 'formato retrato (3:4)'
    };
    
    enhancedPrompt += `\n\n${'='.repeat(60)}`;
    enhancedPrompt += `\n🎯 FORMATO DA IMAGEM - REGRA ABSOLUTA E NÃO NEGOCIÁVEL`;
    enhancedPrompt += `\n${'='.repeat(60)}`;
    enhancedPrompt += `\n\n📐 PROPORÇÃO OBRIGATÓRIA: ${normalizedAspectRatio}`;
    enhancedPrompt += `\n📏 Descrição: ${aspectRatioDescriptions[normalizedAspectRatio] || normalizedAspectRatio}`;
    enhancedPrompt += `\n\n🔴 REGRAS CRÍTICAS - LEIA COM ATENÇÃO:`;
    enhancedPrompt += `\n1. A imagem resultado DEVE ter EXATAMENTE a proporção ${normalizedAspectRatio}`;
    enhancedPrompt += `\n2. IGNORE completamente a proporção de QUALQUER imagem de referência fornecida`;
    enhancedPrompt += `\n3. Se houver imagens de referência com proporções diferentes, você deve:`;
    enhancedPrompt += `\n   - Usar APENAS o conteúdo/estilo/elementos dessas imagens`;
    enhancedPrompt += `\n   - RECOMPOR a imagem final na proporção ${normalizedAspectRatio}`;
    enhancedPrompt += `\n   - NUNCA manter a proporção original das referências`;
    enhancedPrompt += `\n4. A proporção ${normalizedAspectRatio} é DEFINITIVA e tem prioridade sobre tudo`;
    enhancedPrompt += `\n\n⛔ PROIBIDO: Usar qualquer proporção diferente de ${normalizedAspectRatio}`;
    enhancedPrompt += `\n✅ CORRETO: Gerar imagem na proporção exata de ${normalizedAspectRatio}`;
    
    if (referenceImages && referenceImages.length > 0) {
      enhancedPrompt += `\n\n⚠️ ATENÇÃO ESPECIAL - IMAGENS DE REFERÊNCIA DETECTADAS:`;
      enhancedPrompt += `\nAs imagens fornecidas podem ter proporções diferentes de ${normalizedAspectRatio}.`;
      enhancedPrompt += `\nVocê DEVE extrair apenas os elementos visuais e RECOMPOR na proporção ${normalizedAspectRatio}.`;
      enhancedPrompt += `\nNUNCA mantenha a proporção das imagens de referência.`;
    }

    // Add quality information
    if (quality === 'hd') {
      enhancedPrompt += '\n\nGerar com alta definição, máximo de detalhes e qualidade superior.';
    }

    // Add brand context if available
    if (brandContext) {
      enhancedPrompt += `\n\n${brandContext}\nGere uma imagem que reflita os valores e identidade da marca.`;
    }

    // Add preserve images instruction if provided
    if (preserveImages && preserveImages.length > 0) {
      enhancedPrompt += `\n\n${'='.repeat(80)}`;
      enhancedPrompt += `\n🎨 IMAGENS DA MARCA/IDENTIDADE VISUAL (${preserveImages.length} fornecidas)`;
      enhancedPrompt += `\n${'='.repeat(80)}`;
      enhancedPrompt += `\n\n📌 INSTRUÇÕES PARA USO DESSAS IMAGENS:`;
      enhancedPrompt += `\n   - Estas são imagens OFICIAIS da identidade visual/marca`;
      enhancedPrompt += `\n   - Use EXATAMENTE o estilo visual, paleta de cores e estética dessas imagens`;
      enhancedPrompt += `\n   - Mantenha a MESMA qualidade visual e nível de acabamento`;
      enhancedPrompt += `\n   - Replique elementos de design (bordas, texturas, filtros, efeitos)`;
      enhancedPrompt += `\n   - Preserve a atmosfera e mood transmitidos`;
      enhancedPrompt += `\n   - A nova imagem DEVE parecer parte do mesmo conjunto visual`;
      enhancedPrompt += `\n\n⚠️ IMPORTANTE - FORMATO:`;
      enhancedPrompt += `\n   - A imagem final DEVE ter proporção ${normalizedAspectRatio}`;
      enhancedPrompt += `\n   - NÃO use o formato das imagens de referência`;
      enhancedPrompt += `\n   - Recomponha os elementos visuais na proporção correta`;
      enhancedPrompt += `\n${'='.repeat(80)}`;
    }
    
    // Add style reference images instruction if provided
    if (styleReferenceImages && styleReferenceImages.length > 0) {
      enhancedPrompt += `\n\n${'='.repeat(80)}`;
      enhancedPrompt += `\n✨ IMAGENS DE REFERÊNCIA DE ESTILO (${styleReferenceImages.length} fornecidas)`;
      enhancedPrompt += `\n${'='.repeat(80)}`;
      enhancedPrompt += `\n\n📋 INSTRUÇÕES PARA USO:`;
      enhancedPrompt += `\n   - Inspiração adicional para composição, estilo ou elementos específicos`;
      enhancedPrompt += `\n   - Analise elementos visuais (cores, layout, objetos, atmosfera)`;
      enhancedPrompt += `\n   - Adapte esses elementos de forma coerente`;
      enhancedPrompt += `\n   - Use como complemento às imagens principais da marca`;
      enhancedPrompt += `\n\n⚠️ IMPORTANTE - FORMATO:`;
      enhancedPrompt += `\n   - A imagem final DEVE ter proporção ${normalizedAspectRatio}`;
      enhancedPrompt += `\n   - Extraia apenas o estilo e recomponha no formato correto`;
      enhancedPrompt += `\n${'='.repeat(80)}`;
    }

    // Final reinforcement of aspect ratio
    enhancedPrompt += `\n\n${'='.repeat(60)}`;
    enhancedPrompt += `\n🎯 CONFIRMAÇÃO FINAL - PROPORÇÃO DA IMAGEM`;
    enhancedPrompt += `\n${'='.repeat(60)}`;
    enhancedPrompt += `\nA imagem que você vai gerar DEVE ter EXATAMENTE a proporção: ${normalizedAspectRatio}`;
    enhancedPrompt += `\nEsta é a proporção FINAL, DEFINITIVA e OBRIGATÓRIA.`;
    enhancedPrompt += `\n${'='.repeat(60)}`;

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    console.log('Calling Gemini API for image generation with enhanced prompt...');

    // Build messages array with optional reference images
    const messageContent: any[] = [
      { type: 'text', text: enhancedPrompt }
    ];
    
    // Add preserve images first (highest priority)
    if (preserveImages && preserveImages.length > 0) {
      preserveImages.forEach((img: string) => {
        messageContent.push({
          type: 'image_url',
          image_url: { url: img }
        });
      });
    }
    
    // Add style reference images after
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

        // Converter messageContent para o formato do Gemini
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
        console.log('Image generation response received');

        // Extrair imagem da resposta do Gemini
        const geminiImageData = data.candidates?.[0]?.content?.parts?.find(
          (part: any) => part.inlineData
        )?.inlineData;

        const textContent = data.candidates?.[0]?.content?.parts?.find(
          (part: any) => part.text
        )?.text;

        if (textContent) {
          description = textContent;
        }

        if (!geminiImageData) {
          console.error('No image in response. Full response:', JSON.stringify(data, null, 2));
          lastError = new Error('A API não retornou uma imagem válida');
          
          if (attempt < MAX_RETRIES) {
            console.log(`No image returned, retrying in 2 seconds... (attempt ${attempt + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          
          return new Response(
            JSON.stringify({ 
              error: 'Falha ao gerar imagem. Por favor, tente novamente com um prompt mais específico ou sem imagens de referência.',
              details: 'A API não retornou uma imagem válida'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        imageUrl = `data:${geminiImageData.mimeType};base64,${geminiImageData.data}`;

        // Success! Break out of retry loop
        break;

      } catch (error) {
        lastError = error;
        console.error(`Error on attempt ${attempt}:`, error);
        
        if (attempt < MAX_RETRIES) {
          console.log(`Retrying in 2 seconds... (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw error;
        }
      }
    }

    if (!imageUrl) {
      throw lastError || new Error('Failed to generate image after retries');
    }

    // Decrement team credits
    const { error: updateError } = await supabase
      .from('teams')
      .update({ credits_quick_content: teamData.credits_quick_content - 1 })
      .eq('id', authenticatedTeamId);

    if (updateError) {
      console.error('Error updating credits:', updateError);
    }

    // Create action record with all configurations
    const { data: actionData, error: actionError } = await supabase
      .from('actions')
      .insert({
        type: 'CRIAR_CONTEUDO_RAPIDO',
        brand_id: brandId || null,
        team_id: authenticatedTeamId,
        user_id: authenticatedUserId,
        status: 'Aprovado',
        approved: true,
        details: {
          prompt,
          brandId,
          platform,
          aspectRatio: normalizedAspectRatio,
          originalAspectRatio: aspectRatio,
          style,
          quality,
          negativePrompt,
          colorPalette,
          lighting,
          composition,
          cameraAngle,
          detailLevel,
          mood,
          customDimensions: width && height ? `${width}x${height}` : null,
          referenceImagesCount: referenceImages?.length || 0,
          preserveImagesCount: preserveImages?.length || 0,
          styleReferenceImagesCount: styleReferenceImages?.length || 0,
          enhancedPrompt
        },
        result: {
          imageUrl,
          description
        }
      })
      .select()
      .single();

    if (actionError) {
      console.error('Error creating action:', actionError);
    }

    return new Response(
      JSON.stringify({ 
        imageUrl,
        description,
        actionId: actionData?.id,
        creditsRemaining: teamData.credits_quick_content - 1
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-quick-content function:', error);
    return new Response(
      JSON.stringify({ error: 'Erro ao gerar conteúdo' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
