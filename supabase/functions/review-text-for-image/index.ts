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
    const { text, prompt, brandName, themeName, userId, teamId } = await req.json();

    // Input validation
    if (!text || typeof text !== 'string' || text.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Invalid text' }),
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
    const systemPrompt = `Você é um especialista em prompts para geração de imagens (text-to-image) e branding visual.
Analise textos descritivos de forma profunda, considerando viabilidade técnica, clareza, especificidade, elementos visuais, composição, iluminação, estilo artístico e efetividade para gerar imagens impactantes.
Forneça análise estruturada, educacional e acionável com score de qualidade, pontos positivos, sugestões técnicas específicas e versões otimizadas do prompt.`;

    const contextPrompt = `${brandName ? `Marca: ${brandName}\n` : ''}${themeName ? `Tema Estratégico: ${themeName}\n` : ''}
Contexto desejado: ${prompt}

TEXTO ORIGINAL PARA ANÁLISE:
${text}

Analise o texto e retorne uma revisão completa em markdown seguindo EXATAMENTE esta estrutura:

## 📊 Análise do Prompt

**Score de Qualidade**: [número de 1-10]/10

**Justificativa do Score**: [breve explicação do score atribuído]

---

### ✅ Pontos Fortes
- [Liste elementos bem descritos]
- [Elementos visuais claros]
- [Especificidade adequada]

---

### ⚠️ Pontos de Melhoria
- [O que falta especificar]
- [Ambiguidades identificadas]
- [Elementos vagos que precisam de detalhamento]

---

### 🎨 Análise de Viabilidade Visual

**Composição**: [Análise da estrutura e disposição dos elementos]

**Iluminação**: [Análise e sugestões de iluminação, sombras, atmosfera]

**Estilo Artístico**: [Recomendações de estilo (realista, ilustrativo, minimalista, etc.)]

**Paleta de Cores**: [Sugestões de cores e harmonia visual]

**Detalhamento Técnico**: [Análise da profundidade de detalhes especificados]

---

### 💡 Versões Otimizadas

#### 1️⃣ Versão Profissional
[Prompt otimizado focado em qualidade, detalhamento técnico e clareza visual]

#### 2️⃣ Versão Criativa
[Prompt com elementos artísticos, atmosfera e estilo visual marcante]

#### 3️⃣ Versão Minimalista
[Prompt simplificado focado nos elementos essenciais e composição limpa]

---

### 🔑 Palavras-chave Técnicas Recomendadas

**Para Composição**: [keywords: rule of thirds, framing, perspective, etc.]

**Para Iluminação**: [keywords: golden hour, dramatic lighting, soft shadows, etc.]

**Para Estilo**: [keywords: photorealistic, cinematic, editorial, etc.]

**Para Qualidade**: [keywords: high resolution, 4K, detailed, sharp focus, etc.]

---

### 🎯 Recomendações Finais
[Dicas práticas e resumo das principais melhorias a implementar]`;

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
        type: 'review-text-for-image',
        user_id: userId,
        team_id: teamId,
        brand_id: null,
        details: { text, prompt, brandName, themeName },
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
    console.error('Error in review-text-for-image:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
