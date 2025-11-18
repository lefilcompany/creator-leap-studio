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
        enhancedPrompt += `\n\n📷 ÂNGULO DE CÂMERA PROFISSIONAL:`;
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

    // Mood (Rich cinematic ToneMap)
    if (mood !== 'auto') {
      const moodDescriptions: Record<string, string> = {
        'professional': 'Estética corporativa limpa com iluminação neutra de estúdio, foco nítido, fundo minimalista e paleta de cores sóbria (cinzas, azuis, brancos). Atmosfera séria, confiável e de alta credibilidade. Transmite competência e profissionalismo.',
        
        'energetic': 'Cores vibrantes e saturadas com iluminação dinâmica criando alto contraste. Motion blur leve sugerindo movimento e ação. Elementos diagonais e composição dinâmica. Atmosfera de ação, vitalidade e energia pulsante.',
        
        'calm': 'Luz natural suave e difusa, com tons pastel (azul claro, verde menta, lavanda) e transições suaves entre luz e sombra. Elementos fluidos e orgânicos. Sombras delicadas. Atmosfera serena, contemplativa e relaxante.',
        
        'mysterious': 'Iluminação low-key com predominância de sombras profundas, raios de luz estratégicos cortando a escuridão. Paleta escura com toques de luz pontual (azul escuro, roxo profundo, preto). Névoa sutil. Atmosfera enigmática, intrigante e cheia de mistério.',
        
        'playful': 'Paleta vibrante e saturada com cores primárias e complementares (vermelho, amarelo, azul, verde). Iluminação alegre e uniforme. Elementos gráficos lúdicos e composição dinâmica. Atmosfera divertida, descontraída e alegre.',
        
        'elegant': 'Paleta refinada com tons neutros nobres (cinza chumbo, dourado discreto, branco pérola, preto profundo). Iluminação suave e direcionada. Texturas sofisticadas como mármore, veludo ou seda. Composição equilibrada. Atmosfera luxuosa, sofisticada e de alta classe.',
        
        'dramatic': 'Iluminação cinematográfica com alto contraste entre luz e sombra (chiaroscuro). Sombras profundas e áreas de luz intensa. Paleta de cores saturadas ou monocromática dramática. Composição teatral. Atmosfera intensa, épica e emocionalmente carregada.',
        
        'warm': 'Iluminação golden hour com tons dourados, laranjas e vermelhos quentes. Raios de sol atravessando o cenário. Long shadows. Paleta calorosa e aconchegante. Atmosfera acolhedora, calorosa, confortável e nostálgica.',
        
        'futuristic': 'Iluminação neon com cores ciano, magenta e roxo. Formas geométricas angulares e linhas limpas. Reflexos metálicos e superfícies espelhadas. Elementos tecnológicos. Atmosfera tecnológica, sci-fi e vanguardista.'
      };
      const moodDesc = moodDescriptions[mood];
      if (moodDesc) {
        enhancedPrompt += `\n\n✨ MOOD/ATMOSFERA CINEMATOGRÁFICA:`;
        enhancedPrompt += `\n${moodDesc}`;
        enhancedPrompt += `\n\nTodos os elementos visuais (iluminação, cores, composição, textura) devem trabalhar juntos para transmitir essa atmosfera de forma coesa e impactante.`;
      }
    }

    // Custom Dimensions
    if (width && height) {
      enhancedPrompt += `\n\n📏 DIMENSÕES CUSTOMIZADAS:`;
      enhancedPrompt += `\nLargura: ${width}px`;
      enhancedPrompt += `\nAltura: ${height}px`;
      enhancedPrompt += `\nGere a imagem considerando estas dimensões específicas.`;
    }

    // Text Instructions - CRITICAL (more emphatic when no text is wanted)
    if (!body.includeText) {
      enhancedPrompt += `\n\n${'='.repeat(80)}`;
      enhancedPrompt += `\n🚫 REGRA ABSOLUTA - NENHUM TEXTO NA IMAGEM`;
      enhancedPrompt += `\n${'='.repeat(80)}`;
      enhancedPrompt += `\n\n⛔ PROIBIÇÕES CRÍTICAS:`;
      enhancedPrompt += `\n• NÃO incluir NENHUM texto, palavra, letra, número ou caractere escrito`;
      enhancedPrompt += `\n• NÃO incluir placas, letreiros, logos com texto visível`;
      enhancedPrompt += `\n• NÃO incluir watermarks, assinaturas ou marcas d'água`;
      enhancedPrompt += `\n• NÃO incluir textos em objetos, embalagens ou elementos da cena`;
      enhancedPrompt += `\n• A imagem deve ser PURAMENTE VISUAL sem qualquer elemento textual`;
      enhancedPrompt += `\n\n✅ CORRETO: Imagem totalmente visual, sem nenhum tipo de texto ou escrita`;
      enhancedPrompt += `\n${'='.repeat(80)}`;
    } else if (body.textContent) {
      enhancedPrompt += `\n\n${'='.repeat(80)}`;
      enhancedPrompt += `\n📝 INCLUSÃO DE TEXTO NA IMAGEM`;
      enhancedPrompt += `\n${'='.repeat(80)}`;
      enhancedPrompt += `\n\nTexto a incluir: "${body.textContent}"`;
      enhancedPrompt += `\n\n📋 DIRETRIZES DE TIPOGRAFIA:`;
      enhancedPrompt += `\n• Use tipografia clara, legível e profissional`;
      enhancedPrompt += `\n• Garanta alto contraste entre texto e fundo para máxima legibilidade`;
      enhancedPrompt += `\n• Posicione o texto de forma harmoniosa na composição`;
      enhancedPrompt += `\n• O texto deve ser parte integrada do design, não uma "colagem"`;
      if (body.textPosition) {
        enhancedPrompt += `\n• Posição do texto: ${body.textPosition}`;
      }
      enhancedPrompt += `\n${'='.repeat(80)}`;
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

    // Final quality reminder
    enhancedPrompt += `\n\n${'='.repeat(80)}`;
    enhancedPrompt += `\n⚠️ LEMBRETE FINAL - QUALIDADE MÁXIMA OBRIGATÓRIA`;
    enhancedPrompt += `\n${'='.repeat(80)}`;
    enhancedPrompt += `\n\n✅ A imagem DEVE ter:`;
    enhancedPrompt += `\n• Nitidez profissional de nível comercial`;
    enhancedPrompt += `\n• Textura rica e detalhamento máximo`;
    enhancedPrompt += `\n• Resolução HD/4K ou superior (${targetResolution})`;
    enhancedPrompt += `\n• Qualidade adequada para impressão e ampliação`;
    enhancedPrompt += `\n• Ausência total de artefatos de compressão`;
    enhancedPrompt += `\n${'='.repeat(80)}`;

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
    const creditsBefore = teamData.credits;
    const creditsAfter = creditsBefore - CREDIT_COSTS.QUICK_IMAGE;
    
    const { error: updateError } = await supabase
      .from('teams')
      .update({ credits: creditsAfter })
      .eq('id', authenticatedTeamId);

    if (updateError) {
      console.error('Error updating credits:', updateError);
    }

    // Record credit usage
    await recordCreditUsage(supabase, {
      teamId: authenticatedTeamId,
      userId: authenticatedUserId,
      actionType: 'QUICK_IMAGE',
      creditsUsed: CREDIT_COSTS.QUICK_IMAGE,
      creditsBefore,
      creditsAfter,
      description: 'Criação rápida de imagem',
      metadata: { platform, aspectRatio, style, quality }
    });

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
        creditsRemaining: creditsAfter
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
