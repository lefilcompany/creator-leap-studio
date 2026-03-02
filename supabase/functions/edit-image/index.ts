import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { CREDIT_COSTS } from '../_shared/creditCosts.ts';
import { checkUserCredits, deductUserCredits, recordUserCreditUsage } from '../_shared/userCredits.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_PROMPT_LENGTH = 8000;

function cleanInput(text: string | undefined | null): string {
  if (!text) return '';
  return text.replace(/[<>{}\[\]"`]/g, '').replace(/\s+/g, ' ').trim();
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
    promptParts.push("🏷️ LOGO DA MARCA:", "- A marca possui um logo definido", "- Reserve espaço apropriado para o logo se for o caso", "- Garanta que a estética se alinhe com a identidade visual da marca", "");
  }

  if (brandData) {
    promptParts.push("🎯 IDENTIDADE DA MARCA (seguir estas diretrizes):");
    if (brandData.name) promptParts.push(`📌 Nome: ${cleanInput(brandData.name)}`);
    if (brandData.segment) promptParts.push(`🏢 Segmento: ${cleanInput(brandData.segment)}`);
    if (brandData.values) promptParts.push(`💎 Valores: ${cleanInput(brandData.values)}`);
    if (brandData.promise) promptParts.push(`✨ Promessa: ${cleanInput(brandData.promise)}`);
    if (brandData.color_palette) {
      try {
        const colors = typeof brandData.color_palette === 'string' ? JSON.parse(brandData.color_palette) : brandData.color_palette;
        promptParts.push(`🎨 Paleta de Cores: ${JSON.stringify(colors)} - Use estas cores harmoniosamente`);
      } catch {}
    }
    if (brandData.restrictions) promptParts.push(`🚫 NÃO FAZER: ${cleanInput(brandData.restrictions)}`);
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
    if (themeData.color_palette) promptParts.push(`🎨 Paleta do Tema: ${themeData.color_palette}`);
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

// Extract image from Gateway response (3 formats)
function extractImageFromResponse(data: any): { imageUrl: string | null; textResponse: string | null } {
  let imageUrl: string | null = null;
  let textResponse: string | null = null;
  const message = data.choices?.[0]?.message;

  if (message?.images?.length > 0) imageUrl = message.images[0].image_url?.url;
  if (!imageUrl && Array.isArray(message?.content)) {
    for (const part of message.content) {
      if (part.type === 'image_url' && part.image_url?.url) { imageUrl = part.image_url.url; break; }
    }
  }
  if (!imageUrl && data.candidates?.[0]?.content?.parts) {
    for (const part of data.candidates[0].content.parts) {
      if (part.inlineData?.data) { imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`; break; }
    }
  }
  if (typeof message?.content === 'string') textResponse = message.content;
  return { imageUrl, textResponse };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reviewPrompt, imageUrl, brandId, themeId, platform, aspectRatio } = await req.json();

    console.log('📝 [EDIT-IMAGE] Dados recebidos:', { brandId, themeId, hasImageUrl: !!imageUrl, promptLength: reviewPrompt?.length || 0 });

    if (!reviewPrompt || !imageUrl) {
      return new Response(JSON.stringify({ error: 'reviewPrompt e imageUrl são obrigatórios' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseKey) return new Response(JSON.stringify({ error: 'Configuração do servidor incompleta' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: profile } = await supabase.from('profiles').select('team_id, credits').eq('id', user.id).single();
    const teamId = profile?.team_id || null;

    const creditCheck = await checkUserCredits(supabase, user.id, CREDIT_COSTS.IMAGE_EDIT);
    if (!creditCheck.hasCredits) return new Response(JSON.stringify({ error: 'Créditos insuficientes' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Fetch brand and theme data
    const [brandResult, themeResult] = await Promise.all([
      brandId ? supabase.from('brands').select('*').eq('id', brandId).single() : Promise.resolve({ data: null }),
      themeId ? supabase.from('strategic_themes').select('*').eq('id', themeId).single() : Promise.resolve({ data: null }),
    ]);

    const brandData = brandResult.data;
    const themeData = themeResult.data;

    const hasLogo = brandData?.logo ? true : false;
    const detailedPrompt = buildRevisionPrompt(reviewPrompt, brandData, themeData, hasLogo, platform, aspectRatio);

    console.log('📝 [EDIT-IMAGE] Prompt:', detailedPrompt.length, 'chars, brand:', !!brandData, 'theme:', !!themeData);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: 'API key não configurada' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Prepare image data URL
    let imageDataUrl: string;
    if (imageUrl.startsWith('data:')) {
      imageDataUrl = imageUrl;
      console.log('📷 Imagem recebida como base64');
    } else {
      console.log('📷 Baixando imagem da URL:', imageUrl);
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) throw new Error(`Erro ao baixar imagem: ${imageResponse.status}`);
      const imageBuffer = await imageResponse.arrayBuffer();
      const bytes = new Uint8Array(imageBuffer);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode(...chunk);
      }
      const contentType = imageResponse.headers.get('content-type') || 'image/png';
      imageDataUrl = `data:${contentType};base64,${btoa(binary)}`;
      console.log('✅ Imagem convertida, tipo:', contentType);
    }

    // =====================================
    // Generate edited image via Gateway with retry
    // =====================================
    const MAX_RETRIES = 3;
    let lastError: any = null;
    let editedImageUrl: string | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`🤖 Edit attempt ${attempt}/${MAX_RETRIES}...`);

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image',
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: detailedPrompt },
                { type: 'image_url', image_url: { url: imageDataUrl } }
              ]
            }],
            modalities: ['image', 'text'],
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Gateway error (attempt ${attempt}):`, response.status, errorText);

          if (response.status === 429) return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          if (response.status === 402) return new Response(JSON.stringify({ error: 'Créditos de IA esgotados.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

          lastError = new Error(`Gateway error: ${response.status}`);
          if (attempt < MAX_RETRIES) { await new Promise(r => setTimeout(r, 2000)); continue; }
          throw lastError;
        }

        const data = await response.json();
        const extracted = extractImageFromResponse(data);
        editedImageUrl = extracted.imageUrl;

        if (!editedImageUrl) {
          throw new Error('A IA não conseguiu processar a edição. Tente reformular o pedido.');
        }

        console.log(`✅ Image edited on attempt ${attempt}`);
        break;

      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        lastError = error;
        if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (!editedImageUrl) {
      throw new Error(lastError?.message || 'Falha ao editar imagem após múltiplas tentativas');
    }

    // Upload to storage
    console.log('📤 Fazendo upload da imagem editada...');
    let uploadBinaryData: Uint8Array;
    if (editedImageUrl.startsWith('data:')) {
      const base64Data = editedImageUrl.split(',')[1];
      uploadBinaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    } else {
      const imgResp = await fetch(editedImageUrl);
      uploadBinaryData = new Uint8Array(await imgResp.arrayBuffer());
    }

    const timestamp = Date.now();
    const randomId = crypto.randomUUID();
    const fileName = `edited-images/${timestamp}-${randomId}.png`;

    const { error: uploadError } = await supabase.storage.from('content-images').upload(fileName, uploadBinaryData, { contentType: 'image/png', cacheControl: '3600', upsert: false });
    if (uploadError) throw new Error(`Erro ao fazer upload: ${uploadError.message}`);

    const { data: { publicUrl } } = supabase.storage.from('content-images').getPublicUrl(fileName);
    console.log('✅ Imagem editada armazenada:', publicUrl);

    // Deduct credits
    const deductResult = await deductUserCredits(supabase, user.id, CREDIT_COSTS.IMAGE_EDIT);
    if (!deductResult.success) {
      console.error('❌ Erro ao deduzir créditos:', deductResult.error);
    } else {
      console.log(`✅ ${CREDIT_COSTS.IMAGE_EDIT} crédito deduzido`);
      await recordUserCreditUsage(supabase, {
        userId: user.id,
        teamId,
        actionType: 'IMAGE_EDIT',
        creditsUsed: CREDIT_COSTS.IMAGE_EDIT,
        creditsBefore: creditCheck.currentCredits,
        creditsAfter: deductResult.newCredits,
        description: 'Edição de imagem (Gateway v4)',
        metadata: { image_url: publicUrl, brand_id: brandId, theme_id: themeId, platform, aspect_ratio: aspectRatio }
      });
    }

    return new Response(JSON.stringify({ editedImageUrl: publicUrl, creditsRemaining: deductResult.newCredits }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('❌ Erro na função edit-image:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
