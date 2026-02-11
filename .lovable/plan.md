

## Otimizacao de Performance - Carregamento Rapido das Paginas

### Problemas Identificados

1. **Dashboard usa `useState` + `useEffect` ao inves de React Query**: A pagina Dashboard faz 4 chamadas sequenciais ao banco usando `useState`/`useEffect` manualmente, ignorando completamente o cache do React Query que ja esta configurado no projeto. Isso significa que toda vez que o usuario navega para o Dashboard, TODOS os dados sao buscados novamente do zero, sem cache.

2. **History faz o mesmo**: A pagina de Historico tambem usa `useState`/`useEffect` com chamadas manuais, sem React Query. Cada navegacao refaz todas as queries.

3. **Dashboard bloqueia renderizacao**: O Dashboard mostra um spinner ate que TODOS os dados estejam carregados (`isLoading || !user || !isDataLoaded`). Isso cria a percepcao de lentidao porque o usuario ve um spinner por varios segundos ate que 4 queries completem.

4. **Event Tracking captura TODOS os cliques**: O `useEventTracking` registra literalmente cada clique no DOM e faz um INSERT no banco para cada um. Isso gera trafico de rede desnecessario e pode atrasar outras operacoes.

5. **PresenceTracker inicia junto com o layout**: Faz INSERT no banco + subscribe a um channel de presenca imediatamente, adicionando mais latencia ao carregamento inicial.

6. **AuthContext faz queries sequenciais**: Profile e depois Team sao buscados em sequencia (team depende do profile.team_id), mas a checagem de admin e profile JA rodam em paralelo.

7. **OnboardingProvider faz query separada no profiles**: Busca campos de onboarding em uma query adicional ao profiles, quando esses dados ja poderiam vir na query do AuthContext.

### Plano de Solucao

#### 1. Migrar Dashboard para React Query (impacto ALTO)

Substituir o `useState`/`useEffect` manual por hooks React Query dedicados. Isso habilita cache automatico (5 min staleTime ja configurado), deduplicacao de queries, e renderizacao progressiva.

**Arquivo: `src/pages/Dashboard.tsx`**

- Criar queries individuais com `useQuery` para: contagem de acoes, contagem de marcas, acoes recentes, e creditos do plano
- Remover os estados `dashboardData`, `isDataLoaded`, `planCredits`
- Mostrar o layout imediatamente com skeletons/placeholders enquanto os dados carregam (renderizacao progressiva ao inves de spinner global)
- Cada card carrega independentemente

```text
ANTES:                          DEPOIS:
[Spinner 3s]                    [Layout imediato]
   |                               |
   v                            [Cards com skeleton]
[Tudo de uma vez]                  |
                                [Dados aparecem conforme chegam]
```

#### 2. Migrar History para React Query (impacto ALTO)

**Arquivo: `src/pages/History.tsx`**

- Substituir `useState`/`useEffect` por `useQuery` com queryKeys que incluem filtros e paginacao
- Isso permite cache por pagina/filtro (navegar entre paginas volta instantaneamente)
- Marcas ja carregadas ficam em cache compartilhado com a pagina de Marcas

#### 3. Renderizacao Progressiva no Dashboard (impacto MEDIO)

**Arquivo: `src/pages/Dashboard.tsx`**

- Remover a condicao `!isDataLoaded` que bloqueia toda a renderizacao
- Mostrar o header e layout imediatamente (o nome do usuario ja vem do AuthContext)
- Cada card de estatistica mostra um skeleton individual enquanto sua query carrega
- Resultado: o usuario ve a pagina em menos de 200ms, com dados aparecendo progressivamente

#### 4. Debounce no Event Tracking (impacto MEDIO)

**Arquivo: `src/hooks/useEventTracking.ts`**

- Acumular eventos de clique em um buffer e enviar em batch a cada 5 segundos (ao inves de INSERT individual por clique)
- Usar `navigator.sendBeacon` no `beforeunload` para garantir envio dos eventos pendentes
- Isso reduz drasticamente o numero de requests de rede concorrentes

#### 5. Lazy-load do PresenceTracker (impacto BAIXO)

**Arquivo: `src/components/PresenceTracker.tsx`**

- Adicionar um delay de 3 segundos antes de iniciar o tracking de presenca
- Isso evita que a query de INSERT e o channel subscribe compitam com o carregamento inicial dos dados da pagina

#### 6. Incluir dados de onboarding na query do AuthContext (impacto BAIXO)

**Arquivo: `src/contexts/AuthContext.tsx`** e **`src/components/onboarding/OnboardingProvider.tsx`**

- Na query de `profiles` do AuthContext, ja buscar os campos `onboarding_*_completed`
- O OnboardingProvider consome esses dados do AuthContext ao inves de fazer uma query separada
- Elimina 1 query redundante no carregamento inicial

### Resumo do Impacto

| Mudanca | Queries eliminadas | Percepcao de velocidade |
|---|---|---|
| Dashboard com React Query | Cache evita 4 queries por visita | Instantaneo em revisita |
| History com React Query | Cache por pagina/filtro | Navegacao entre paginas instantanea |
| Renderizacao progressiva | 0 | Layout visivel em menos de 200ms |
| Batch de eventos | ~50-100 requests/min reduzidos | Menos competicao de rede |
| Delay no PresenceTracker | 1 query adiada | Carregamento inicial mais rapido |
| Onboarding no AuthContext | 1 query eliminada | Marginalmente mais rapido |

### Arquivos Modificados

1. `src/pages/Dashboard.tsx` - Migrar para React Query + renderizacao progressiva
2. `src/pages/History.tsx` - Migrar para React Query
3. `src/hooks/useEventTracking.ts` - Batch de eventos com buffer
4. `src/components/PresenceTracker.tsx` - Delay no inicio
5. `src/contexts/AuthContext.tsx` - Incluir campos onboarding na query
6. `src/components/onboarding/OnboardingProvider.tsx` - Consumir dados do AuthContext

