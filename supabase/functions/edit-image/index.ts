import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { CREDIT_COSTS } from '../_shared/creditCosts.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_PROMPT_LENGTH = 8000;

function cleanInput(text: string | undefined | null): string {
  if (!text) return '';
  let cleanedText = text.replace(/[<>{}\[\]"`]/g, '');
  cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
  return cleanedText;
}

function buildRevisionPrompt(
  adjustment: string, 
  brandData: any | null, 
  themeData: any | null,
  hasLogo: boolean,
  platform?: string,
  aspectRatio?: string
): string {
  let promptParts: string[] = [
    "🎨 VOCÊ É UM EDITOR DE IMAGENS ESPECIALIZADO. SUA MISSÃO: APLICAR EXATAMENTE O QUE O USUÁRIO SOLICITOU.",
    "",
    "🎯 INSTRUÇÃO DO USUÁRIO (EXECUTE ISTO COM PRECISÃO):",
    `"${cleanInput(adjustment)}"`,
    "",
    "⚠️ REGRAS CRÍTICAS:",
    "1. VOCÊ DEVE aplicar modificações VISÍVEIS e SIGNIFICATIVAS conforme solicitado",
    "2. Se o usuário pedir para mudar COR, altere as cores de forma CLARA",
    "3. Se pedir para adicionar/remover OBJETOS, faça isso CLARAMENTE",
    "4. Se pedir para mudar TAMANHO/POSIÇÃO, execute EXATAMENTE",
    "5. NUNCA retorne a imagem original sem modificações",
    "6. Mantenha qualidade profissional e realismo",
    "7. Se a instrução não for clara, interprete da forma mais lógica e aplique mudanças visíveis",
    ""
  ];

  if (platform || aspectRatio) {
    promptParts.push("📱 CONTEXTO DA PLATAFORMA:");
    if (platform) promptParts.push(`- Plataforma: ${platform}`);
    if (aspectRatio) promptParts.push(`- Proporção: ${aspectRatio}`);
    promptParts.push("");
  }

  if (hasLogo) {
    promptParts.push(
      "🏷️ LOGO DA MARCA:",
      "- A marca possui um logo definido",
      "- Reserve espaço apropriado para o logo se for o caso",
      "- Garanta que a estética se alinhe com a identidade visual da marca",
      ""
    );
  }

  if (brandData) {
    promptParts.push("🎯 IDENTIDADE DA MARCA (seguir estas diretrizes):");
    
    if (brandData.name) promptParts.push(`📌 Nome: ${cleanInput(brandData.name)}`);
    if (brandData.segment) promptParts.push(`🏢 Segmento: ${cleanInput(brandData.segment)}`);
    if (brandData.values) promptParts.push(`💎 Valores: ${cleanInput(brandData.values)}`);
    if (brandData.promise) promptParts.push(`✨ Promessa: ${cleanInput(brandData.promise)}`);
    
    if (brandData.color_palette) {
      try {
        const colors = typeof brandData.color_palette === 'string' 
          ? JSON.parse(brandData.color_palette) 
          : brandData.color_palette;
        promptParts.push(`🎨 Paleta de Cores: ${JSON.stringify(colors)} - Use estas cores harmoniosamente`);
      } catch (e) {
        console.error('Erro ao processar paleta de cores:', e);
      }
    }
    
    if (brandData.restrictions) {
      promptParts.push(`🚫 NÃO FAZER: ${cleanInput(brandData.restrictions)}`);
    }
    
    if (brandData.keywords) promptParts.push(`🔑 Palavras-chave: ${cleanInput(brandData.keywords)}`);
    if (brandData.goals) promptParts.push(`🎯 Metas: ${cleanInput(brandData.goals)}`);
    
    promptParts.push("");
  }

  if (themeData) {
    promptParts.push("🎭 TEMA ESTRATÉGICO:");
    
    if (themeData.title) promptParts.push(`📋 Título: ${cleanInput(themeData.title)}`);
    if (themeData.description) promptParts.push(`📝 Descrição: ${cleanInput(themeData.description)}`);
    if (themeData.tone_of_voice) promptParts.push(`🗣️ Tom de Voz: ${cleanInput(themeData.tone_of_voice)}`);
    if (themeData.objectives) promptParts.push(`🎯 Objetivos: ${cleanInput(themeData.objectives)}`);
    if (themeData.target_audience) promptParts.push(`👥 Público: ${cleanInput(themeData.target_audience)}`);
    if (themeData.content_format) promptParts.push(`📄 Formato: ${cleanInput(themeData.content_format)}`);
    if (themeData.expected_action) promptParts.push(`⚡ Ação Esperada: ${cleanInput(themeData.expected_action)}`);
    
    if (themeData.color_palette) {
      promptParts.push(`🎨 Paleta do Tema: ${themeData.color_palette}`);
    }
    
    if (themeData.hashtags) promptParts.push(`#️⃣ Hashtags: ${cleanInput(themeData.hashtags)}`);
    
    promptParts.push("");
  }

  promptParts.push(
    "✅ RESULTADO ESPERADO:",
    "- Imagem editada com ALTA QUALIDADE e REALISMO PROFISSIONAL",
    "- Ajuste solicitado aplicado de forma VISÍVEL e EFETIVA",
    "- Alinhamento perfeito com identidade de marca e tema (se fornecidos)",
    "- Composição visualmente impactante e apropriada para redes sociais",
    ""
  );

  const finalPrompt = promptParts.join('\n');
  
  if (finalPrompt.length > MAX_PROMPT_LENGTH) {
    console.warn(`⚠️ Prompt muito longo (${finalPrompt.length} chars), truncando...`);
    return finalPrompt.substring(0, MAX_PROMPT_LENGTH);
  }
  
  return finalPrompt;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reviewPrompt, imageUrl, brandId, themeId, platform, aspectRatio } = await req.json();

    console.log('📝 [EDIT-IMAGE] Dados recebidos:', {
      brandId,
      themeId,
      hasImageUrl: !!imageUrl,
      promptLength: reviewPrompt?.length || 0
    });

    if (!reviewPrompt || !imageUrl) {
      return new Response(
        JSON.stringify({ error: 'reviewPrompt e imageUrl são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Configuração do Supabase não encontrada');
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('❌ Erro ao obter usuário:', userError);
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile to get team_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.team_id) {
      console.error('❌ Erro ao obter perfil do usuário:', profileError);
      return new Response(
        JSON.stringify({ error: 'Perfil não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const teamId = profile.team_id;

    // Check team credits
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('credits')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      console.error('❌ Erro ao obter equipe:', teamError);
      return new Response(
        JSON.stringify({ error: 'Equipe não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (team.credits < CREDIT_COSTS.IMAGE_EDIT) {
      return new Response(
        JSON.stringify({ error: 'Créditos insuficientes' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch complete brand data if brandId is provided
    let brandData = null;
    if (brandId) {
      console.log('🔍 Buscando dados da marca...');
      const { data, error: brandError } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();

      if (brandError) {
        console.error('⚠️ Erro ao buscar marca:', brandError);
      } else {
        brandData = data;
      }
    }

    // Fetch theme data if themeId is provided
    let themeData = null;
    if (themeId) {
      console.log('🔍 Buscando dados do tema...');
      const { data, error: themeError } = await supabase
        .from('strategic_themes')
        .select('*')
        .eq('id', themeId)
        .single();

      if (!themeError && data) {
        themeData = data;
      }
    }

    // Build detailed prompt with brand and theme context
    const hasLogo = brandData?.logo ? true : false;
    const detailedPrompt = buildRevisionPrompt(reviewPrompt, brandData, themeData, hasLogo, platform, aspectRatio);

    console.log('📝 [EDIT-IMAGE] Prompt detalhado gerado:');
    console.log('   - Comprimento:', detailedPrompt.length, 'caracteres');
    console.log('   - Tem dados de marca:', !!brandData);
    console.log('   - Tem dados de tema:', !!themeData);
    console.log('   - Plataforma:', platform || 'não especificada');
    console.log('   - Aspect Ratio:', aspectRatio || 'não especificado');
    console.log('   - Ajuste solicitado:', reviewPrompt.substring(0, 100) + '...');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('❌ LOVABLE_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🤖 Chamando Lovable AI para edição de imagem...');

    // Prepare image URL for Lovable AI
    let finalImageUrl = imageUrl;
    
    if (imageUrl.startsWith('data:')) {
      // Already base64 data URL - use as is
      console.log('📷 Imagem recebida como base64');
    } else {
      // It's a regular URL - use directly
      console.log('📷 Usando URL da imagem:', imageUrl);
    }

    // Call Lovable AI Gateway for image editing
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
            content: [
              { type: 'text', text: detailedPrompt },
              { type: 'image_url', image_url: { url: finalImageUrl } }
            ]
          }
        ],
        modalities: ['image', 'text']
      })
    });

    console.log('📡 Status da resposta Lovable AI:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na Lovable AI:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos de IA insuficientes. Adicione créditos ao seu workspace Lovable.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const aiData = await response.json();
    console.log('✅ Resposta da AI recebida');

    // Extract image from Lovable AI response
    const editedImageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!editedImageUrl) {
      console.error('❌ Imagem editada não foi retornada pela API');
      console.error('📊 Dados recebidos:', JSON.stringify(aiData, null, 2));
      throw new Error('A IA não conseguiu processar sua solicitação. Tente reformular o pedido de edição de forma mais específica.');
    }

    console.log('📤 Fazendo upload da imagem editada para Storage...');

    // Extract base64 data from data URL
    const base64Data = editedImageUrl.split(',')[1] || editedImageUrl;
    
    // Convert base64 to Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = crypto.randomUUID();
    const fileName = `edited-images/${timestamp}-${randomId}.png`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('content-images')
      .upload(fileName, bytes, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Erro ao fazer upload:', uploadError);
      throw new Error(`Erro ao fazer upload da imagem: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('content-images')
      .getPublicUrl(fileName);

    console.log('✅ Imagem editada com sucesso e armazenada:', publicUrl);

    // Deduzir crédito após edição bem-sucedida
    const { error: deductError } = await supabase
      .from('teams')
      .update({ credits: team.credits - CREDIT_COSTS.IMAGE_EDIT })
      .eq('id', teamId);

    if (deductError) {
      console.error('❌ Erro ao deduzir créditos:', deductError);
    } else {
      console.log(`✅ ${CREDIT_COSTS.IMAGE_EDIT} crédito deduzido da equipe ${teamId}`);
      
      // Registrar no histórico de créditos
      await supabase
        .from('credit_history')
        .insert({
          team_id: teamId,
          user_id: user.id,
          action_type: 'IMAGE_EDIT',
          credits_used: CREDIT_COSTS.IMAGE_EDIT,
          credits_before: team.credits,
          credits_after: team.credits - CREDIT_COSTS.IMAGE_EDIT,
          description: 'Edição de imagem',
          metadata: {
            image_url: publicUrl,
            brand_id: brandId,
            theme_id: themeId,
            platform: platform,
            aspect_ratio: aspectRatio
          }
        });
    }

    return new Response(
      JSON.stringify({ 
        imageUrl: publicUrl,
        message: 'Imagem editada com sucesso'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in edit-image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
