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
      aspectRatio = '1:1',
      style = 'auto',
      quality = 'standard'
    } = body;

    // Validate and normalize aspect ratio
    const validAspectRatios = ['1:1', '4:5', '9:16', '16:9', '3:4'];
    let normalizedAspectRatio = aspectRatio;
    
    // Handle Facebook's 1.91:1 as 16:9 (closest match)
    if (aspectRatio === '1.91:1') {
      normalizedAspectRatio = '16:9';
    }
    
    // If aspect ratio is not valid, default to 1:1
    if (!validAspectRatios.includes(normalizedAspectRatio)) {
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

    // Add aspect ratio information if no platform specified
    if (!platform) {
      const aspectRatioDescriptions: Record<string, string> = {
        '1:1': 'formato quadrado (1:1) ideal para posts do Instagram',
        '4:5': 'formato retrato (4:5) ideal para feed do Instagram',
        '9:16': 'formato vertical (9:16) ideal para Stories e Reels',
        '16:9': 'formato horizontal (16:9) ideal para YouTube e desktop'
      };
      enhancedPrompt += `\n\nProporção da Imagem: ${aspectRatioDescriptions[normalizedAspectRatio] || 'formato quadrado (1:1)'}.`;
    }

    // Add quality information
    if (quality === 'hd') {
      enhancedPrompt += '\n\nGerar com alta definição, máximo de detalhes e qualidade superior.';
    }

    // Add brand context if available
    if (brandContext) {
      enhancedPrompt += `\n\n${brandContext}\nGere uma imagem que reflita os valores e identidade da marca.`;
    }

    // Add reference images instruction if provided
    if (referenceImages && referenceImages.length > 0) {
      enhancedPrompt += `\n\n=== IMAGENS DE REFERÊNCIA ===`;
      enhancedPrompt += `\n${referenceImages.length === 1 ? 'Uma imagem de referência foi fornecida' : `${referenceImages.length} imagens de referência foram fornecidas`}.`;
      enhancedPrompt += `\n\nIMPORTANTE: Use estas imagens APENAS como inspiração para:`;
      enhancedPrompt += `\n- Estilo visual geral e atmosfera`;
      enhancedPrompt += `\n- Paleta de cores e harmonização`;
      enhancedPrompt += `\n- Composição e enquadramento`;
      enhancedPrompt += `\n- Elementos de design e textura`;
      enhancedPrompt += `\n\nNÃO copie elementos específicos, pessoas, logos ou marcas das imagens de referência. Crie uma imagem completamente ORIGINAL baseada na inspiração visual fornecida.`;
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('Lovable API key not configured');
    }

    console.log('Calling Lovable AI for image generation with enhanced prompt...');

    // Build messages array with optional reference images
    const messageContent: any[] = [
      { type: 'text', text: enhancedPrompt }
    ];
    
    // Add reference images if provided
    if (referenceImages && referenceImages.length > 0) {
      referenceImages.forEach((img: string) => {
        messageContent.push({
          type: 'image_url',
          image_url: { url: img }
        });
      });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: messageContent
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente mais tarde.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Pagamento necessário. Adicione créditos ao seu workspace Lovable AI.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Image generation response received');

    // Extract the generated image
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const description = data.choices?.[0]?.message?.content || 'Imagem gerada com sucesso';

    if (!imageUrl) {
      console.error('No image URL in response. Full response:', JSON.stringify(data, null, 2));
      return new Response(
        JSON.stringify({ 
          error: 'Falha ao gerar imagem. Por favor, tente novamente com um prompt mais específico ou sem imagens de referência.',
          details: 'A API não retornou uma imagem válida'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
          referenceImagesCount: referenceImages?.length || 0,
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
