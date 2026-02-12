
## Plano: Corrigir contagem de conteudos e carrossel de atividades recentes

### Problemas identificados

**1. Card "Conteudos Criados" mostra 0**
A query direta a tabela `actions` com `.eq('team_id', ...)` retorna erro 500 porque a politica RLS (`can_access_resource`) falha em requests HEAD/count. A solucao e usar o RPC `get_action_summaries` que funciona (SECURITY DEFINER, bypass RLS) e filtrar por tipo.

**2. Carrossel "Atividade Recente" mostra vazio**
O RPC retorna dados corretamente (confirmado nos logs de rede - status 200 com dados), mas a funcao `getImageUrl` no componente descarta imagens base64 porque verifica `startsWith('http')`. Como as imagens vem como `data:image/png;base64,...`, nenhuma imagem e exibida. Alem disso, o `thumb_path` esta null para todos os registros. O resultado e que parece nao ter atividade quando na verdade os dados existem.

### Solucao

**Arquivo 1: `src/pages/Dashboard.tsx`**
- Alterar `actionsCount` para usar o RPC `get_action_summaries` com filtro `p_type_filter` para contar apenas `CRIAR_CONTEUDO` e `CRIAR_CONTEUDO_RAPIDO`, extraindo `total_count` do resultado
- Manter o fallback direto, mas com tratamento de erro

**Arquivo 2: `src/components/dashboard/DashboardRecentActivity.tsx`**
- Corrigir `getImageUrl` para aceitar URLs base64 (`data:`) alem de URLs http
- Garantir que os cards renderizam corretamente com imagens base64

### Detalhes tecnicos

**Dashboard.tsx - actionsCount:**
```typescript
const { data: actionsCount = 0 } = useQuery({
  queryKey: ['dashboard-actions-count', user?.teamId],
  queryFn: async () => {
    if (!user?.teamId) return 0;
    // Usar RPC com filtro de tipo - retorna total_count
    const { data, error } = await supabase.rpc('get_action_summaries', {
      p_team_id: user.teamId,
      p_type_filter: 'CRIAR_CONTEUDO',
      p_limit: 1,
    });
    const criarCount = (!error && data?.[0]?.total_count) || 0;
    
    const { data: data2, error: error2 } = await supabase.rpc('get_action_summaries', {
      p_team_id: user.teamId,
      p_type_filter: 'CRIAR_CONTEUDO_RAPIDO',
      p_limit: 1,
    });
    const rapidoCount = (!error2 && data2?.[0]?.total_count) || 0;
    
    return criarCount + rapidoCount;
  },
  enabled: !!user?.teamId,
});
```

**DashboardRecentActivity.tsx - getImageUrl:**
```typescript
const getImageUrl = (activity: ActionSummary): string | null => {
  if (activity.thumb_path) {
    const { data } = supabase.storage.from('creations').getPublicUrl(activity.thumb_path);
    return data?.publicUrl || null;
  }
  if (activity.image_url) {
    // Aceitar tanto URLs http quanto data URIs (base64)
    if (activity.image_url.startsWith('http') || activity.image_url.startsWith('data:')) {
      return activity.image_url;
    }
  }
  return null;
};
```

### Arquivos alterados
1. `src/pages/Dashboard.tsx` - query actionsCount via RPC
2. `src/components/dashboard/DashboardRecentActivity.tsx` - aceitar imagens base64
