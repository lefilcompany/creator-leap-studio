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
      return new Response(
        JSON.stringify({ error: 'User not associated with a team' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authenticatedTeamId = profile.team_id;

    const { image, prompt, brandId, brandName, themeName } = await req.json();

    // Input validation
    if (!image || typeof image !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!prompt || typeof prompt !== 'string' || prompt.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Invalid prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check credits
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('credits_reviews')
      .eq('id', authenticatedTeamId)
      .single();

    if (teamError || !team) {
      return new Response(
        JSON.stringify({ error: 'Unable to verify credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (team.credits_reviews <= 0) {
      return new Response(
        JSON.stringify({ error: 'Insufficient credits' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build AI prompt
    const systemPrompt = `Você é um especialista em análise visual, design gráfico, acessibilidade digital, UX/UI e estratégia de conteúdo visual para redes sociais.
Analise imagens considerando composição, hierarquia visual, cores, contraste, legibilidade, acessibilidade, alinhamento com identidade de marca, adequação para plataformas digitais e melhores práticas de design.
Forneça análise estruturada, educacional e acionável com score visual, análise técnica de acessibilidade e recomendações específicas por plataforma.`;

    const contextPrompt = `${brandName ? `Marca: ${brandName}\n` : ''}${themeName ? `Tema Estratégico: ${themeName}\n` : ''}
Contexto desejado: ${prompt}

[IMAGEM ANEXADA PARA ANÁLISE]

Analise a imagem e retorne uma revisão completa em markdown seguindo EXATAMENTE esta estrutura:

## 📊 Análise Visual

**Score de Qualidade Visual**: [número de 1-10]/10

**Justificativa do Score**: [breve explicação considerando composição, cores, clareza e impacto]

---

### ✅ Pontos Fortes
- [Elementos visuais efetivos]
- [Composição bem executada]
- [Uso adequado de cores]

---

### ⚠️ Pontos de Melhoria
- [Oportunidades de otimização]
- [Ajustes técnicos necessários]
- [Melhorias de clareza visual]

---

### 🎨 Análise Técnica Visual

**Composição e Hierarquia**: [Análise de regra dos terços, pontos focais, equilíbrio visual]

**Paleta de Cores**: [Análise de harmonia, contraste, psicologia das cores]

**Tipografia** (se aplicável): [Análise de legibilidade, hierarquia, escolha de fontes]

**Contraste e Legibilidade**: [Análise de contraste de cores, clareza de texto, destaque de elementos]

**Qualidade Técnica**: [Análise de resolução, nitidez, ruído, compressão]

---

### ♿ Análise de Acessibilidade

**Contraste de Cores**: [Verificação de contraste adequado para leitura (mínimo 4.5:1)]

**Legibilidade de Texto**: [Tamanho de fonte, peso, espaçamento]

**Sugestão de Texto Alternativo (Alt Text)**:
"[Descrição detalhada da imagem para leitores de tela, incluindo elementos principais, cores predominantes e contexto]"

**Recomendações**: [Ajustes para melhorar acessibilidade]

---

### 📱 Adequação por Plataforma

**Instagram Feed** (1080x1080 ou 1080x1350):
[Análise de formato, área de corte, legibilidade em mobile]

**Instagram Stories** (1080x1920):
[Análise de área segura, posicionamento de elementos, legibilidade vertical]

**Facebook/LinkedIn** (1200x630):
[Análise de preview em feeds, clareza em tamanhos reduzidos]

**YouTube Thumbnail** (1280x720):
[Análise de impacto visual, legibilidade em miniaturas]

---

### 💡 Sugestões de Otimização

#### 🔧 Ajustes Técnicos
- [Ajustes de resolução, formato, compressão]
- [Otimizações de tamanho de arquivo]

#### 🎨 Ajustes Visuais
- [Melhorias de composição]
- [Ajustes de cores e contraste]
- [Aprimoramentos de clareza]

#### 📐 Ajustes de Layout
- [Reposicionamento de elementos]
- [Ajustes de espaçamento]
- [Otimização de hierarquia visual]

---

### 🏢 Alinhamento com Identidade de Marca
[Análise de como a imagem reflete os valores, estilo visual e tom da marca]

---

### 🎯 Recomendações Finais
[Resumo das principais melhorias prioritárias e dicas práticas de implementação]`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: contextPrompt },
              { type: 'image_url', image_url: { url: image } }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI service temporarily unavailable' }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'AI processing failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const review = data.choices?.[0]?.message?.content || 'Unable to generate review';

    // Save to actions table
    const { data: actionData, error: actionError } = await supabase
      .from('actions')
      .insert({
        type: 'REVISAR_CONTEUDO',
        user_id: authenticatedUserId,
        team_id: authenticatedTeamId,
        brand_id: brandId || null,
        details: { 
          reviewType: 'image',
          prompt, 
          brandName, 
          themeName 
        },
        result: { review },
        status: 'Concluída'
      })
      .select()
      .single();

    if (actionError) {
      console.error('Error saving action:', actionError);
    }

    // Deduct credit
    const { error: updateError } = await supabase
      .from('teams')
      .update({ credits_reviews: team.credits_reviews - 1 })
      .eq('id', authenticatedTeamId);

    if (updateError) {
      console.error('Error updating credits:', updateError);
    }

    return new Response(
      JSON.stringify({ review, actionId: actionData?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in review-image:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
