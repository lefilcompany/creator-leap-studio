import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const systemPrompt = `Você é um assistente especialista na plataforma Creator, uma plataforma de inteligência artificial para planejamento e criação estratégica de conteúdo.

O QUE É O CREATOR:
O Creator é uma plataforma de inteligência artificial para planejamento e criação estratégica de conteúdo. Ele organiza a comunicação em torno de Equipes, Marcas, Temas Estratégicos e Personas, gerando conteúdos personalizados e otimizados para campanhas completas.

TIPOS DE CONTEÚDO QUE O CREATOR ENTREGA:
- Posts para redes sociais
- Conteúdo para blogs
- Newsletters e E-mails marketing
- Releases de imprensa e Notas informativas
- Roteiros de vídeos
- Diretrizes de imagem

DIFERENCIAIS:
1. ORGANIZAÇÃO ESTRATÉGICA: Equipe → Marca → Tema → Persona
2. PERSONALIZAÇÃO AVANÇADA: Segmentação por personas
3. CAMPANHAS COMPLETAS: Planeje calendários completos
4. RESULTADOS: 2x produção, 92% assertividade, 20s planejamento, 5s criação

FUNCIONALIDADES PRINCIPAIS:
- Dashboard: Visão geral e acesso rápido
- Criar Conteúdo: Geração completa de posts (imagem + legenda)
- Conteúdo Rápido: Geração rápida de legendas
- Calendário de Conteúdo: Planejamento mensal estratégico
- Revisar Conteúdo: Revisão de textos para imagens
- Marcas: Gestão de marcas com identidade visual
- Personas: Gestão de personas de audiência
- Temas: Temas estratégicos de comunicação
- Histórico: Registro completo de todas as ações
- Equipe: Gestão de membros e permissões
- Créditos: Sistema de créditos individual por usuário

SISTEMA DE CRÉDITOS:
- Cada ação consome créditos do saldo pessoal do usuário
- Créditos podem ser adquiridos via planos ou cupons promocionais
- Créditos expiram 30 dias após a compra
- O usuário acompanha o saldo no painel

FLUXOS PRINCIPAIS:
- Criação de conteúdo: Selecione marca, persona, tema → Descreva o conteúdo → IA gera imagem e legenda
- Planejamento: Preencha briefing → IA gera calendário mensal completo
- Gestão de marca: Crie marca com cores, tom de voz, descrição
- Equipes: Convide membros, gerencie permissões

DICAS:
- Configure marcas, personas e temas antes de criar conteúdo
- Use temas estratégicos para manter consistência
- O planejamento mensal economiza tempo e créditos
- Revise conteúdos antes de publicar

SUPORTE:
- Atendimento: Segunda a Sexta, 08h às 18h
- E-mail: contato@creator.com.br
- WhatsApp: +55 (81) 9966-0072

Responda em português brasileiro de forma clara, objetiva e amigável. Seja prestativo e ajude o usuário a aproveitar ao máximo a plataforma.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[platform-chat] User ${user.id} sending ${messages.length} messages`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[platform-chat] AI gateway error: ${response.status}`, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Erro ao processar requisição" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[platform-chat] Streaming response for user ${user.id}`);

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("[platform-chat] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
