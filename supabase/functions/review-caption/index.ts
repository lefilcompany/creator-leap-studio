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
    const { caption, prompt, brandName, themeName, userId, teamId } = await req.json();

    // Input validation
    if (!caption || typeof caption !== 'string' || caption.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Invalid caption' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!prompt || typeof prompt !== 'string' || prompt.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Invalid prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userId || !teamId) {
      return new Response(
        JSON.stringify({ error: 'User and team information required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check credits
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('credits_reviews')
      .eq('id', teamId)
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
    const systemPrompt = `Você é um especialista em copywriting para redes sociais, estratégia de conteúdo digital e otimização de engajamento.
Analise legendas considerando clareza, impacto, potencial de engajamento, alinhamento com marca, tom de voz, tamanho ideal por plataforma, SEO de hashtags e call-to-action.
Forneça análise estruturada, educacional e acionável com score de engajamento, análise técnica e versões otimizadas.`;

    const contextPrompt = `${brandName ? `Marca: ${brandName}\n` : ''}${themeName ? `Tema Estratégico: ${themeName}\n` : ''}
Contexto desejado: ${prompt}

LEGENDA ORIGINAL PARA ANÁLISE:
${caption}

Analise a legenda e retorne uma revisão completa em markdown seguindo EXATAMENTE esta estrutura:

## 📊 Análise da Legenda

**Score de Engajamento Estimado**: [número de 1-10]/10

**Justificativa do Score**: [breve explicação considerando potencial de curtidas, comentários e compartilhamentos]

---

### ✅ Pontos Fortes
- [Elementos que geram conexão]
- [Clareza da mensagem]
- [Tom de voz adequado]

---

### ⚠️ Pontos de Melhoria
- [O que pode aumentar engajamento]
- [Oportunidades de call-to-action]
- [Ajustes de clareza ou impacto]

---

### 📱 Análise por Plataforma

**Instagram**: [Análise de tamanho (máx. 2.200 caracteres), uso de emojis, primeira linha impactante]

**LinkedIn**: [Análise de tom profissional, tamanho ideal (máx. 3.000 caracteres), valor agregado]

**Facebook**: [Análise de engajamento (ideal 40-80 caracteres), storytelling]

**Twitter/X**: [Análise de concisão (máx. 280 caracteres), urgência, viralidade]

---

### 💡 Versões Otimizadas

#### 1️⃣ Versão Alta Performance
[Legenda otimizada para máximo engajamento com hooks poderosos e CTA claro]

#### 2️⃣ Versão Storytelling
[Legenda com narrativa envolvente, conexão emocional e jornada]

#### 3️⃣ Versão Direta
[Legenda concisa, objetiva e com mensagem clara em poucas palavras]

---

### #️⃣ Análise de Hashtags

**Hashtags da Legenda Original**: [análise das hashtags existentes]

**SEO e Alcance**: [análise de popularidade e relevância]

**Sugestões Estratégicas**:
- **Alta Performance** (100k-1M posts): [3-5 hashtags populares]
- **Nicho** (10k-100k posts): [3-5 hashtags específicas]
- **Marca** (baixo volume): [2-3 hashtags proprietárias]

---

### 🎯 Recomendações Finais
[Dicas práticas sobre tamanho, timing de postagem, elementos visuais complementares]`;

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
          { role: 'user', content: contextPrompt }
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
        type: 'review-caption',
        user_id: userId,
        team_id: teamId,
        brand_id: null,
        details: { caption, prompt, brandName, themeName },
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
      .eq('id', teamId);

    if (updateError) {
      console.error('Error updating credits:', updateError);
    }

    return new Response(
      JSON.stringify({ review, actionId: actionData?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in review-caption:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
