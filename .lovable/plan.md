## Problema

`src/hooks/useCategories.ts` cria um canal Realtime com nome fixo `'categories-realtime'`. Quando o hook `useCategories()` é montado por mais de um componente ao mesmo tempo (ou remontado rápido em StrictMode/Suspense, como acontece ao entrar em `/history` que também usa a sidebar/outros consumidores), o segundo mount reutiliza o mesmo canal já `subscribe()`-ado e tenta anexar o listener `postgres_changes` depois — o Supabase lança:

`cannot add postgres_changes callbacks for realtime:categories-realtime after subscribe()`

Isso derruba a página inteira via ErrorBoundary.

## Correção

1. Tornar o nome do canal único por instância do hook em `src/hooks/useCategories.ts`:
   - Usar `` `categories-realtime-${user.id}-${crypto.randomUUID()}` `` ao criar o canal dentro do `useEffect`.
2. Manter a limpeza atual (`supabase.removeChannel(channel)` no cleanup) — já correta.
3. Sem mudanças de schema, sem mudanças de UI, sem mexer em outras subscriptions.

## Verificação

- Abrir `/history` (e navegar entre rotas que usam `useCategories`) sem crash.
- Confirmar nos logs do console que não há mais o erro de `postgres_changes callbacks ... after subscribe()`.
