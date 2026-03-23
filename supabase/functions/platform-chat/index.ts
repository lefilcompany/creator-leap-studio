import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { messages } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY não configurada");
    }

    const systemPrompt = `Você é um assistente especialista na plataforma Creator, uma plataforma de inteligência artificial para planejamento e criação estratégica de conteúdo.

O QUE É O CREATOR:

O Creator é uma plataforma de inteligência artificial para planejamento e criação estratégica de conteúdo. Ele organiza a comunicação em torno de Equipes, Marcas, Temas Estratégicos e Personas, gerando conteúdos personalizados e otimizados para campanhas completas, e não apenas posts isolados.

O Creator é muito mais que uma ferramenta de criação de posts: ele é uma plataforma de organização estratégica de conteúdo.

TIPOS DE CONTEÚDO QUE O CREATOR ENTREGA:
- Posts para redes sociais
- Conteúdo para blogs
- Newsletters
- E-mails marketing
- Releases de imprensa
- Notas informativas
- Roteiros de vídeos
- Diretrizes de imagem

DIFERENCIAIS E BENEFÍCIOS:

1. ORGANIZAÇÃO ESTRATÉGICA:
   - Organize a comunicação em torno de Equipes, Marcas, Temas Estratégicos e Personas
   - Estrutura clara: Equipe → Marca → Tema → Persona
   - Comunicação integrada e consistente
   - Visão estratégica de longo prazo

2. PERSONALIZAÇÃO AVANÇADA:
   - Segmentação por personas
   - Conteúdos personalizados para diferentes públicos
   - Maior relevância e engajamento
   - Melhor conversão

3. CAMPANHAS COMPLETAS:
   - Planeje calendários completos de comunicação
   - Não apenas posts isolados
   - Consistência e coerência estratégica
   - Produtividade amplificada

4. RESULTADOS COMPROVADOS:
   - 2x: Duplica sua produção de conteúdo
   - 92%: Mais de assertividade nos conteúdos
   - 20s: Planeja seu conteúdo em segundos
   - 5s: Cria textos em 5 segundos

TECNOLOGIA E SEGURANÇA:

1. MODELOS DE IA ESPECIALIZADOS:
   - Treinados especificamente para marketing e segmentação estratégica
   - Orientação de especialistas em branding
   - Especialistas em comportamento de consumo
   - Especialistas em organização de campanhas

2. SEGURANÇA E PRIVACIDADE:
   - Conformidade com LGPD (Lei Geral de Proteção de Dados)
   - Dados criptografados em repouso e em trânsito
   - Ambiente seguro com monitoramento constante
   - Proteção de dados pessoais garantida

COMPARAÇÃO COM CONCORRENTES:

O Creator oferece recursos únicos que outras plataformas não têm:
✅ Organização da Equipe: Colaboração completa na produção e gestão
✅ Segmentação: Personalização baseada em personas específicas
✅ Planejamento: Estratégia de longo prazo e consistência
✅ Revisão de Marca: Alinhamento com identidade e diretrizes
✅ Foco em Performance: IA otimizada para melhores resultados

PARA QUEM É O CREATOR:

1. PEQUENAS EMPRESAS:
   - Organize a comunicação interna de marketing
   - Diferentes produtos, linhas de negócio e campanhas
   - Calendários consistentes e organizados

2. AGÊNCIAS DE COMUNICAÇÃO:
   - Gerencie múltiplos clientes e campanhas
   - Mantenha a identidade de cada marca
   - Segmentação precisa por público
   - Aumente produtividade em 300%

3. FREELANCERS DE MARKETING:
   - Produza conteúdo de alta qualidade
   - Múltiplos clientes com menos esforço
   - Trabalho mais estratégico e completo
   - Organização profissional

FUNCIONALIDADES PRINCIPAIS:

1. PÁGINAS E RECURSOS:
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
   - Planos: Acesso à página de planos e assinaturas

2. SISTEMA DE COLABORAÇÃO:
   - Crie ou entre em uma Equipe
   - Organize todos os colaboradores
   - Trabalho colaborativo em projetos
   - Gestão de permissões e acesso

SISTEMA DE PLANOS E PREÇOS:
   
   📦 PLANO FREE (Grátis):
   - Preço: R$ 0,00/mês
   - 1 membro
   - 1 marca
   - 3 temas estratégicos
   - 3 personas
   - 10 criações rápidas/mês
   - 10 sugestões de conteúdo/mês
   - 5 planejamentos/mês
   - 10 revisões/mês
   - Período de teste: 7 dias
   
   💼 PLANO BASIC:
   - Preço: R$ 59,90/mês
   - 3 membros
   - 5 marcas
   - 10 temas estratégicos
   - 10 personas
   - 50 criações rápidas/mês
   - 50 sugestões de conteúdo/mês
   - 20 planejamentos/mês
   - 50 revisões/mês
   - Período de teste: 7 dias
   
   🚀 PLANO PRO (Mais Popular):
   - Preço: R$ 99,90/mês
   - 10 membros
   - 20 marcas
   - Temas estratégicos ilimitados
   - Personas ilimitadas
   - 200 criações rápidas/mês
   - 200 sugestões de conteúdo/mês
   - 100 planejamentos/mês
   - 200 revisões/mês
   - Período de teste: 14 dias
   
   👑 PLANO ENTERPRISE (Premium):
   - Preço: R$ 499,90/mês
   - Membros ilimitados
   - Marcas ilimitadas
   - Temas ilimitados
   - Personas ilimitadas
   - Créditos customizados conforme necessidade
   - Integrações avançadas
   - Suporte prioritário
   - Para contratar: https://wa.me/558199660072

4. FORMA DE PAGAMENTO:
   - Método: Cartão de crédito via Stripe (plataforma segura de pagamentos)
   - Cobrança: Recorrente mensal (renovação automática)
   - Períodos de teste: Free (7 dias), Basic (7 dias), Pro (14 dias)
   - Gerenciamento: O usuário pode cancelar, alterar plano ou atualizar forma de pagamento a qualquer momento
   - Segurança: Todas as transações são criptografadas e processadas com segurança

5. CRÉDITOS E USO:
   - Os créditos são renovados mensalmente no início de cada ciclo de cobrança
   - Créditos não utilizados NÃO acumulam para o próximo mês
   - Tipos de créditos:
     * Criações Rápidas: Para gerar legendas rápidas
     * Sugestões: Para receber sugestões de conteúdo com IA
     * Planejamentos: Para criar calendários mensais completos
     * Revisões: Para revisar e melhorar textos para imagens
   - O usuário pode acompanhar o uso de créditos na página de Planos
   - Quando os créditos acabam, é necessário aguardar a renovação mensal ou fazer upgrade do plano

6. FLUXOS PRINCIPAIS:
   - Criação de conteúdo: Selecione marca, persona, tema → Descreva o conteúdo → IA gera imagem e legenda
   - Planejamento: Preencha briefing → IA gera calendário mensal completo
   - Gestão de marca: Crie marca com cores, tom de voz, descrição
   - Equipes: Convide membros, gerencie permissões
   - Assinatura: Escolha plano → Checkout seguro com cartão → Confirmação e ativação automática

7. DICAS E BOAS PRÁTICAS:
   - Configure marcas, personas e temas antes de criar conteúdo
   - Use temas estratégicos para manter consistência
   - O planejamento mensal economiza tempo e créditos
   - Revise conteúdos antes de publicar
   - Verifique o histórico para reutilizar ideias
   - Monitore seus créditos na página de Planos para não ficar sem
   - Considere upgrade se estiver ficando sem créditos frequentemente
   - Para empresas com alto volume, o plano Enterprise oferece melhor custo-benefício

8. SUPORTE E CONTATO:
   - Atendimento: Segunda a Sexta, 08h às 18h
   - Resposta: Em até 24-48 horas
   - E-mail: contato@creator.com.br
   - WhatsApp: +55 (81) 9966-0072
   - Para planos Enterprise: Entre em contato via WhatsApp

Responda em português brasileiro de forma clara, objetiva e amigável. Seja prestativo e ajude o usuário a aproveitar ao máximo a plataforma. Quando perguntado sobre planos, forneça informações detalhadas e ajude o usuário a escolher o plano ideal para suas necessidades.`;

    // Convert messages to Gemini format
    const geminiContents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: geminiContents,
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          temperature: 0.7,
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const errorText = await response.text();
      console.error("Erro na API Gemini:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar requisição" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Transform Gemini SSE stream to OpenAI-compatible SSE stream
    const reader = response.body!.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              break;
            }
            buffer += decoder.decode(value, { stream: true });
            let newlineIdx;
            while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
              const line = buffer.slice(0, newlineIdx).trim();
              buffer = buffer.slice(newlineIdx + 1);
              if (!line.startsWith('data: ')) continue;
              const jsonStr = line.slice(6);
              try {
                const parsed = JSON.parse(jsonStr);
                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                  // Emit in OpenAI-compatible format
                  const openaiChunk = JSON.stringify({
                    choices: [{ delta: { content: text } }]
                  });
                  controller.enqueue(encoder.encode(`data: ${openaiChunk}\n\n`));
                }
              } catch { /* skip partial JSON */ }
            }
          }
        } catch (e) {
          console.error('Stream error:', e);
          controller.close();
        }
      }
    });

    return new Response(stream, {
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
