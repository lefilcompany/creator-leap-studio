import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const systemPrompt = `Você é um assistente especialista na plataforma Creator, uma plataforma de gestão de conteúdo para redes sociais.

INFORMAÇÕES SOBRE A PLATAFORMA:

1. FUNCIONALIDADES PRINCIPAIS:
   - Criação de conteúdo com IA para redes sociais
   - Geração de imagens, legendas e vídeos
   - Planejamento de conteúdo mensal
   - Gestão de marcas, personas e temas estratégicos
   - Histórico completo de ações
   - Sistema de equipes colaborativas

2. PÁGINAS E RECURSOS:
   - Dashboard: Visão geral e acesso rápido
   - Criar Conteúdo: Geração completa de posts (imagem + legenda)
   - Conteúdo Rápido: Geração rápida de legendas
   - Planejar Conteúdo: Planejamento mensal estratégico
   - Revisar Conteúdo: Revisão de textos para imagens
   - Marcas: Gestão de marcas com identidade visual
   - Personas: Gestão de personas de audiência
   - Temas: Temas estratégicos de comunicação
   - Histórico: Registro completo de todas as ações
   - Equipe: Gestão de membros e permissões
   - Planos: Free, Basic, Pro e Enterprise

3. SISTEMA DE PLANOS:
   - Free: Acesso básico limitado
   - Basic: Mais gerações mensais
   - Pro: Acesso completo com gerações ilimitadas
   - Enterprise: Customizado, contato via WhatsApp

4. FLUXOS PRINCIPAIS:
   - Criação de conteúdo: Selecione marca, persona, tema → Descreva o conteúdo → IA gera imagem e legenda
   - Planejamento: Preencha briefing → IA gera calendário mensal completo
   - Gestão de marca: Crie marca com cores, tom de voz, descrição
   - Equipes: Convide membros, gerencie permissões

5. DICAS E BOAS PRÁTICAS:
   - Configure marcas, personas e temas antes de criar conteúdo
   - Use temas estratégicos para manter consistência
   - O planejamento mensal economiza tempo
   - Revise conteúdos antes de publicar
   - Verifique o histórico para reutilizar ideias

Responda em português brasileiro de forma clara, objetiva e amigável. Seja prestativo e ajude o usuário a aproveitar ao máximo a plataforma.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes." }), 
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("Erro na API:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar requisição" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Erro no chat:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
