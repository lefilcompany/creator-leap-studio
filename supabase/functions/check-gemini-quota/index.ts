import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação e role de system
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Usuário não autenticado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar se é admin do sistema
    const { data: hasRole, error: roleError } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "system",
    });

    if (roleError || !hasRole) {
      return new Response(
        JSON.stringify({ error: "Acesso negado. Apenas administradores do sistema." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(
        JSON.stringify({ 
          error: "GEMINI_API_KEY não configurada",
          status: "not_configured"
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📊 Verificando quota da API Gemini...");

    // Fazer uma requisição de teste para verificar se a API está acessível
    // A API Gemini não tem endpoint de quota direto, então testamos com uma chamada simples
    const testResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`,
      { method: "GET" }
    );

    const testData = await testResponse.json();

    // Buscar estatísticas de uso dos últimos 30 dias da nossa tabela
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: videoActions, error: actionsError } = await supabase
      .from("actions")
      .select("id, created_at, status, result")
      .eq("type", "GERAR_VIDEO")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    if (actionsError) {
      console.error("Erro ao buscar ações:", actionsError);
    }

    // Calcular estatísticas
    const totalRequests = videoActions?.length || 0;
    const successfulRequests = videoActions?.filter(a => a.status === "completed").length || 0;
    const failedRequests = videoActions?.filter(a => a.status === "failed").length || 0;
    const pendingRequests = videoActions?.filter(a => a.status === "pending" || a.status === "processing").length || 0;

    // Verificar erros recentes de quota
    const quotaErrors = videoActions?.filter(a => {
      const result = a.result as any;
      return result?.apiStatus === 429 || result?.error?.includes("quota");
    }).length || 0;

    // Verificar últimos erros específicos
    const recentErrors = videoActions?.filter(a => a.status === "failed").slice(0, 5).map(a => {
      const result = a.result as any;
      return {
        date: a.created_at,
        error: result?.error || "Erro desconhecido",
        apiStatus: result?.apiStatus,
        model: result?.modelUsed,
      };
    }) || [];

    // Determinar status geral
    let quotaStatus: "healthy" | "warning" | "critical" | "unknown" = "unknown";
    let statusMessage = "";

    if (!testResponse.ok) {
      if (testResponse.status === 429) {
        quotaStatus = "critical";
        statusMessage = "Quota esgotada. Aguarde o reset ou atualize seu plano.";
      } else if (testResponse.status === 403) {
        quotaStatus = "critical";
        statusMessage = "API Key inválida ou sem permissões.";
      } else {
        quotaStatus = "warning";
        statusMessage = `Erro ao verificar API: ${testResponse.status}`;
      }
    } else {
      // API respondeu OK, verificar taxa de erro recente
      const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;
      const quotaErrorRate = totalRequests > 0 ? (quotaErrors / totalRequests) * 100 : 0;

      if (quotaErrorRate > 20) {
        quotaStatus = "critical";
        statusMessage = "Alta taxa de erros de quota nos últimos 30 dias.";
      } else if (quotaErrorRate > 5 || errorRate > 30) {
        quotaStatus = "warning";
        statusMessage = "Taxa moderada de erros. Monitorar uso.";
      } else {
        quotaStatus = "healthy";
        statusMessage = "API funcionando normalmente.";
      }
    }

    // Calcular uso por dia (últimos 7 dias)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const last7DaysActions = videoActions?.filter(a => 
      new Date(a.created_at) >= sevenDaysAgo
    ) || [];

    const dailyUsage: { date: string; requests: number; success: number; failed: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      
      const dayActions = last7DaysActions.filter(a => 
        a.created_at.startsWith(dateStr)
      );
      
      dailyUsage.push({
        date: dateStr,
        requests: dayActions.length,
        success: dayActions.filter(a => a.status === "completed").length,
        failed: dayActions.filter(a => a.status === "failed").length,
      });
    }

    // Modelos disponíveis
    const availableModels = testData.models?.filter((m: any) => 
      m.name.includes("veo") || m.name.includes("gemini")
    ).map((m: any) => ({
      name: m.name,
      displayName: m.displayName,
      supportedGenerationMethods: m.supportedGenerationMethods,
    })) || [];

    const response = {
      status: quotaStatus,
      statusMessage,
      apiAccessible: testResponse.ok,
      apiKeyConfigured: true,
      stats: {
        last30Days: {
          totalRequests,
          successfulRequests,
          failedRequests,
          pendingRequests,
          quotaErrors,
          successRate: totalRequests > 0 
            ? Math.round((successfulRequests / totalRequests) * 100) 
            : 0,
        },
        dailyUsage,
      },
      recentErrors,
      availableModels: availableModels.slice(0, 10),
      checkedAt: new Date().toISOString(),
    };

    console.log("✅ Verificação de quota concluída:", quotaStatus);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Erro ao verificar quota:", error);
    return new Response(
      JSON.stringify({ 
        error: "Erro interno ao verificar quota",
        details: error instanceof Error ? error.message : String(error),
        status: "error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
