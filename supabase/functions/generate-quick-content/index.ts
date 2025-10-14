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
      quality = 'standard'
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
      enhancedPrompt += `\n\n${'='.repeat(60)}`;
      enhancedPrompt += `\n🎨 IMAGENS PARA PRESERVAR - MANTER ELEMENTOS`;
      enhancedPrompt += `\n${'='.repeat(60)}`;
      enhancedPrompt += `\n${preserveImages.length === 1 ? 'Uma imagem foi fornecida' : `${preserveImages.length} imagens foram fornecidas`} para ter seus traços PRESERVADOS na imagem resultado.`;
      enhancedPrompt += `\n\n🔴 REGRAS DE PRESERVAÇÃO (em ordem de prioridade):`;
      enhancedPrompt += `\n1. 📐 FORMATO: A imagem final DEVE ter proporção ${normalizedAspectRatio} (NÃO use o formato das imagens fornecidas)`;
      enhancedPrompt += `\n2. 🎨 ELEMENTOS: PRESERVE os elementos visuais, objetos, pessoas e características destas imagens`;
      enhancedPrompt += `\n3. 🌈 CORES: MANTENHA as cores originais, formas, texturas e detalhes específicos`;
      enhancedPrompt += `\n4. 🎯 COMPOSIÇÃO: Recomponha os elementos na proporção ${normalizedAspectRatio}`;
      enhancedPrompt += `\n5. ➕ CONTEXTO: Você pode adicionar cenário ou elementos complementares conforme o prompt`;
      enhancedPrompt += `\n\n⚠️ COMO PROCEDER:`;
      enhancedPrompt += `\n- Extraia os elementos principais das imagens fornecidas`;
      enhancedPrompt += `\n- Recomponha esses elementos na proporção ${normalizedAspectRatio}`;
      enhancedPrompt += `\n- Ajuste o enquadramento e composição para o formato ${normalizedAspectRatio}`;
      enhancedPrompt += `\n- NUNCA mantenha a proporção original das imagens de referência`;
      enhancedPrompt += `\n\n❌ PROIBIDO: Usar a proporção das imagens de referência`;
      enhancedPrompt += `\n✅ CORRETO: Elementos das imagens + Proporção ${normalizedAspectRatio}`;
    }
    
    // Add style reference images instruction if provided
    if (styleReferenceImages && styleReferenceImages.length > 0) {
      enhancedPrompt += `\n\n${'='.repeat(60)}`;
      enhancedPrompt += `\n🎭 REFERÊNCIAS DE ESTILO - APENAS INSPIRAÇÃO`;
      enhancedPrompt += `\n${'='.repeat(60)}`;
      enhancedPrompt += `\n${styleReferenceImages.length === 1 ? 'Uma imagem de referência de estilo foi fornecida' : `${styleReferenceImages.length} imagens de referência de estilo foram fornecidas`}.`;
      enhancedPrompt += `\n\n📋 Use estas imagens APENAS como inspiração para:`;
      enhancedPrompt += `\n✓ Estilo visual geral e atmosfera`;
      enhancedPrompt += `\n✓ Paleta de cores e harmonização`;
      enhancedPrompt += `\n✓ Elementos de design e textura`;
      enhancedPrompt += `\n\n⚠️ IMPORTANTE SOBRE FORMATO:`;
      enhancedPrompt += `\n- Ignore a proporção das imagens de estilo`;
      enhancedPrompt += `\n- Use APENAS a inspiração visual, NÃO o formato`;
      enhancedPrompt += `\n- A imagem final DEVE ter proporção ${normalizedAspectRatio}`;
      enhancedPrompt += `\n\n❌ NÃO COPIE: Elementos específicos, pessoas, logos, marcas ou PROPORÇÕES`;
      enhancedPrompt += `\n✅ USE: Apenas inspiração visual e estética`;
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

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
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
