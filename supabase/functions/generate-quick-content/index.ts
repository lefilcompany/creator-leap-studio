import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { CREDIT_COSTS } from '../_shared/creditCosts.ts';
import { recordCreditUsage } from '../_shared/creditHistory.ts';

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
      .select('credits')
      .eq('id', authenticatedTeamId)
      .single();

    if (teamError) {
      console.error('Error fetching team:', teamError);
      return new Response(
        JSON.stringify({ error: 'Erro ao processar solicitação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!teamData || teamData.credits < CREDIT_COSTS.QUICK_IMAGE) {
      return new Response(
        JSON.stringify({ error: `Créditos insuficientes. Necessário: ${CREDIT_COSTS.QUICK_IMAGE} créditos` }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Platform specifications
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
        'natural': 'Iluminação natural equilibrada e orgânica, simulando luz do dia.',
        'studio': 'Iluminação de estúdio profissional com setup de três pontos.',
        'dramatic': 'Iluminação cinematográfica dramática com alto contraste.',
        'soft': 'Iluminação suave e difusa usando softbox ou luz natural filtrada.',
        'golden_hour': 'Iluminação mágica de golden hour com tons dourados.',
        'backlit': 'Iluminação traseira criando contornos luminosos e halos de luz.',
        'low_key': 'Iluminação low-key com predominância de tons escuros.',
        'high_key': 'Iluminação high-key com predominância de tons claros e brilhantes.'
      };
      const lightingDesc = lightingDescriptions[lighting];
      if (lightingDesc) {
        enhancedPrompt += `\n\n💡 ILUMINAÇÃO PROFISSIONAL:`;
        enhancedPrompt += `\n${lightingDesc}`;
      }
    }

    // Composition
    if (composition !== 'auto') {
      const compositionDescriptions: Record<string, string> = {
        'centered': 'Composição centralizada com elemento principal no centro.',
        'rule_of_thirds': 'Composição profissional seguindo a regra dos terços.',
        'symmetrical': 'Composição perfeitamente simétrica e espelhada.',
        'asymmetrical': 'Composição assimétrica com equilíbrio visual dinâmico.',
        'diagonal': 'Composição diagonal com elementos seguindo linhas diagonais.',
        'frame_within_frame': 'Composição usando elementos para emoldurar o elemento principal.',
        'leading_lines': 'Composição com linhas guia convergindo para o elemento principal.'
      };
      const compositionDesc = compositionDescriptions[composition];
      if (compositionDesc) {
        enhancedPrompt += `\n\n📐 COMPOSIÇÃO FOTOGRÁFICA:`;
        enhancedPrompt += `\n${compositionDesc}`;
      }
    }

    // Camera Angle
    if (cameraAngle !== 'eye_level') {
      const angleDescriptions: Record<string, string> = {
        'eye_level': 'Ângulo de câmera na altura dos olhos.',
        'high_angle': 'Ângulo alto com câmera posicionada acima olhando para baixo.',
        'low_angle': 'Ângulo baixo com câmera posicionada abaixo olhando para cima.',
        'birds_eye': 'Ângulo aéreo diretamente de cima.',
        'worms_eye': 'Ângulo do chão diretamente de baixo.',
        'dutch_angle': 'Ângulo holandês com câmera inclinada.'
      };
      const angleDesc = angleDescriptions[cameraAngle];
      if (angleDesc) {
        enhancedPrompt += `\n\n📷 ÂNGULO DE CÂMERA:`;
        enhancedPrompt += `\n${angleDesc}`;
      }
    }

    // Detail Level
    const detailDescriptions: Record<number, string> = {
      1: 'Minimalista - Pouquíssimos detalhes.',
      2: 'Muito simples - Detalhes básicos.',
      3: 'Simples - Alguns detalhes essenciais.',
      4: 'Moderadamente simples - Detalhes moderados.',
      5: 'Equilibrado - Nível médio de detalhamento.',
      6: 'Moderadamente detalhado - Bom nível de detalhes.',
      7: 'Detalhado - Riqueza de detalhes visível.',
      8: 'Muito detalhado - Alto nível de detalhamento.',
      9: 'Extremamente detalhado - Detalhes intrincados.',
      10: 'Hiper-detalhado - Máximo nível de detalhamento.'
    };
    const detailDesc = detailDescriptions[detailLevel] || detailDescriptions[7];
    enhancedPrompt += `\n\n🔍 NÍVEL DE DETALHAMENTO (${detailLevel}/10):`;
    enhancedPrompt += `\n${detailDesc}`;

    // Mood
    if (mood !== 'auto') {
      const moodDescriptions: Record<string, string> = {
        'professional': 'Estética corporativa limpa e profissional.',
        'energetic': 'Cores vibrantes com alto contraste e energia.',
        'calm': 'Luz natural suave com tons pastel e atmosfera serena.',
        'mysterious': 'Iluminação low-key com sombras profundas.',
        'playful': 'Paleta vibrante com cores primárias e atmosfera divertida.',
        'elegant': 'Paleta refinada com tons neutros nobres.',
        'dramatic': 'Iluminação cinematográfica com alto contraste.',
        'warm': 'Iluminação golden hour com tons quentes.',
        'futuristic': 'Iluminação neon com formas geométricas.'
      };
      const moodDesc = moodDescriptions[mood];
      if (moodDesc) {
        enhancedPrompt += `\n\n✨ MOOD/ATMOSFERA:`;
        enhancedPrompt += `\n${moodDesc}`;
      }
    }

    // Custom Dimensions
    if (width && height) {
      enhancedPrompt += `\n\n📏 DIMENSÕES CUSTOMIZADAS:`;
      enhancedPrompt += `\nLargura: ${width}px, Altura: ${height}px`;
    }

    // Text Instructions
    if (!body.includeText) {
      enhancedPrompt += `\n\n${'='.repeat(80)}`;
      enhancedPrompt += `\n🚫 REGRA ABSOLUTA - NENHUM TEXTO NA IMAGEM`;
      enhancedPrompt += `\n${'='.repeat(80)}`;
      enhancedPrompt += `\n⛔ NÃO incluir NENHUM texto, palavra, letra, número ou caractere escrito`;
      enhancedPrompt += `\n${'='.repeat(80)}`;
    } else if (body.textContent) {
      enhancedPrompt += `\n\n📝 TEXTO NA IMAGEM: "${body.textContent}"`;
      if (body.textPosition) {
        enhancedPrompt += `\nPosição: ${body.textPosition}`;
      }
    }

    // Aspect ratio rules
    const aspectRatioDescriptions: Record<string, string> = {
      '1:1': 'formato quadrado (1:1)',
      '4:5': 'formato retrato (4:5)',
      '9:16': 'formato vertical (9:16)',
      '16:9': 'formato horizontal (16:9)',
      '3:4': 'formato retrato (3:4)'
    };
    
    enhancedPrompt += `\n\n${'='.repeat(60)}`;
    enhancedPrompt += `\n🎯 FORMATO DA IMAGEM - REGRA ABSOLUTA`;
    enhancedPrompt += `\n${'='.repeat(60)}`;
    enhancedPrompt += `\n📐 PROPORÇÃO OBRIGATÓRIA: ${normalizedAspectRatio}`;
    enhancedPrompt += `\n📏 Descrição: ${aspectRatioDescriptions[normalizedAspectRatio] || normalizedAspectRatio}`;
    enhancedPrompt += `\nA imagem DEVE ter EXATAMENTE a proporção ${normalizedAspectRatio}`;
    enhancedPrompt += `\n${'='.repeat(60)}`;

    // Quality reminder
    if (quality === 'hd') {
      enhancedPrompt += '\n\nGerar com alta definição, máximo de detalhes e qualidade superior.';
    }

    // Brand context
    if (brandContext) {
      enhancedPrompt += `\n\n${brandContext}\nGere uma imagem que reflita os valores e identidade da marca.`;
    }

    // Preserve images instruction
    if (preserveImages && preserveImages.length > 0) {
      enhancedPrompt += `\n\n🎨 IMAGENS DA MARCA (${preserveImages.length} fornecidas)`;
      enhancedPrompt += `\nUse EXATAMENTE o estilo visual dessas imagens.`;
    }
    
    // Style reference images
    if (styleReferenceImages && styleReferenceImages.length > 0) {
      enhancedPrompt += `\n\n✨ REFERÊNCIAS DE ESTILO (${styleReferenceImages.length} fornecidas)`;
      enhancedPrompt += `\nInspire-se nos elementos visuais dessas imagens.`;
    }

    // Final quality reminder
    enhancedPrompt += `\n\n${'='.repeat(80)}`;
    enhancedPrompt += `\n⚠️ QUALIDADE MÁXIMA OBRIGATÓRIA`;
    enhancedPrompt += `\n${'='.repeat(80)}`;
    enhancedPrompt += `\n• Nitidez profissional de nível comercial`;
    enhancedPrompt += `\n• Resolução HD/4K ou superior (${targetResolution})`;
    enhancedPrompt += `\n• Proporção EXATA: ${normalizedAspectRatio}`;
    enhancedPrompt += `\n${'='.repeat(80)}`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Calling Lovable AI for image generation...');

    // Build message content with optional reference images
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

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image',
            messages: [
              {
                role: 'user',
                content: messageContent
              }
            ],
            modalities: ['image', 'text']
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Lovable AI error (attempt ${attempt}):`, response.status, errorText);
          
          if (response.status === 429) {
            return new Response(
              JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente mais tarde.' }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          if (response.status === 402) {
            return new Response(
              JSON.stringify({ error: 'Créditos de IA insuficientes. Adicione créditos ao seu workspace Lovable.' }),
              { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          lastError = new Error(`Lovable AI error: ${response.status}`);
          
          if (attempt < MAX_RETRIES) {
            console.log(`Retrying in 2 seconds... (attempt ${attempt + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          
          throw lastError;
        }

        const data = await response.json();
        console.log('Image generation response received');

        // Extract image from Lovable AI response
        const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        const textContent = data.choices?.[0]?.message?.content;

        if (textContent) {
          description = textContent;
        }

        if (!generatedImageUrl) {
          console.error('No image in response. Full response:', JSON.stringify(data, null, 2));
          lastError = new Error('A API não retornou uma imagem válida');
          
          if (attempt < MAX_RETRIES) {
            console.log(`No image returned, retrying in 2 seconds... (attempt ${attempt + 1}/${MAX_RETRIES})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          }
          
          return new Response(
            JSON.stringify({ 
              error: 'Falha ao gerar imagem. Por favor, tente novamente com um prompt mais específico.',
              details: 'A API não retornou uma imagem válida'
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        imageUrl = generatedImageUrl;
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
    const creditsBefore = teamData.credits;
    const creditsAfter = creditsBefore - CREDIT_COSTS.QUICK_IMAGE;
    
    const { error: updateError } = await supabase
      .from('teams')
      .update({ credits: creditsAfter })
      .eq('id', authenticatedTeamId);

    if (updateError) {
      console.error('Error updating team credits:', updateError);
    } else {
      console.log(`Credits updated for team ${authenticatedTeamId}: ${creditsBefore} -> ${creditsAfter}`);
      
      // Record credit usage
      await recordCreditUsage(supabase, {
        teamId: authenticatedTeamId,
        userId: authenticatedUserId,
        actionType: 'QUICK_IMAGE',
        creditsUsed: CREDIT_COSTS.QUICK_IMAGE,
        creditsBefore,
        creditsAfter,
        description: 'Criação rápida de imagem',
        metadata: { prompt: prompt.substring(0, 200), platform, aspectRatio: normalizedAspectRatio }
      });
    }

    // Create action record
    const { data: action, error: actionError } = await supabase
      .from('actions')
      .insert({
        user_id: authenticatedUserId,
        team_id: authenticatedTeamId,
        type: 'CRIAR_CONTEUDO_RAPIDO',
        status: 'completed',
        brand_id: brandId || null,
        details: {
          prompt,
          platform,
          aspectRatio: normalizedAspectRatio,
          style,
          quality,
          hasReferenceImages: referenceImages?.length > 0 || preserveImages?.length > 0 || styleReferenceImages?.length > 0
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
        actionId: action?.id,
        creditsUsed: CREDIT_COSTS.QUICK_IMAGE,
        creditsRemaining: creditsAfter
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-quick-content:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
