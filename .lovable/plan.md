## Objetivo

Eliminar o erro "Tempo esgotado" em carrosséis grandes (6-10 slides) limitando a concorrência no servidor, tolerar falhas parciais no polling do overlay e deixar o botão de **regerar slide individual** bem visível na tela de resultado (a infra de `onlyIndex` já existe).

## 1. Limitar concorrência no servidor — `supabase/functions/generate-carousel-images/index.ts`

Trocar o `Promise.all(sorted.map(run))` por um **pool de concorrência fixo = 3**.

```ts
const CONCURRENCY = 3;
async function runWithPool<T>(items: T[], worker: (item: T) => Promise<void>) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      const next = queue.shift();
      if (!next) break;
      await worker(next);
    }
  });
  await Promise.all(workers);
}
// uso:
await runWithPool(sorted, run);
```

Efeitos:
- Máximo 3 chamadas simultâneas ao `generate-image` → some o rate limit do Gemini.
- Reduz contenção no `patchSlide` (read-modify-write em `actions.result`).
- 8 slides: ~3 lotes ≈ 60-90s (antes: paralelo travava em rate limit).

Não muda nada para `onlyIndex` (regeneração single) — continua disparando 1 slide direto.

## 2. Polling tolerante a falhas parciais — `src/pages/CreateImage.tsx` (linhas ~768-802)

Hoje: timeout estoura → exception → toast "Erro na geração" (mesmo com 6/8 prontos).

Novo comportamento:
- **Timeout: 6 min → 10 min** (margem para 10 slides em lotes de 3).
- **Considera "pronto" quando** `done + error === total` **E** `caption` existe (ou expirou esperando legenda por 60s).
- Se houver `done >= 1` ao final, **resolve com sucesso** e redireciona para `/result` (usuário vê os que deram certo + botão regerar nos que falharam).
- Só lança exception se `errorCount === total` (todos falharam) ou timeout total com 0 prontos.
- Mensagens de progresso continuam iguais, mas adiciona "X de Y slides prontos..." quando há mistura.

```ts
const TIMEOUT_MS = 10 * 60 * 1000;
const CAPTION_WAIT_MS = 60 * 1000;
let allSlidesReadyAt: number | null = null;
// ... no loop:
const settled = doneCount + errorCount;
if (settled >= total) {
  if (car?.caption) { onProgress("Finalizando..."); break; }
  allSlidesReadyAt ??= Date.now();
  if (Date.now() - allSlidesReadyAt > CAPTION_WAIT_MS) break; // segue sem legenda
  onProgress("Slides prontos. Gerando legenda...");
  continue;
}
if (Date.now() - startedAt > TIMEOUT_MS) {
  if (doneCount === 0) throw new Error("Falha ao gerar o carrossel.");
  break; // resolve parcial
}
onProgress(`Gerando slide ${Math.min(doneCount + 1, total)} de ${total}...`);
```

## 3. Realçar regeneração por slide — `src/components/create-content/carousel/CarouselGallery.tsx`

A função `handleRegenerate` + `onlyIndex` **já existe** (linhas 74-102). Ajustes só de UX:

- Quando um slide tem `status === "error"`, exibir overlay claro sobre a imagem: ícone de alerta, texto "Falha ao gerar este slide" + botão **"Regerar slide"** primário.
- Quando `status === "generating"` (após clicar regerar), trocar o botão por spinner + "Gerando...".
- Adicionar botão discreto "Regerar" no menu de ações de todos os slides (mesmo os bem-sucedidos), para o caso do usuário não gostar do resultado.
- Toast de sucesso já existe; manter o `useCarouselSlides` polling que já recarrega o slide quando o status muda.

Nenhuma mudança no contrato do edge — só consumimos `onlyIndex` que já é suportado.

## 4. (Opcional, mas recomendado) Limite na UI

No formulário de carrossel (`CarouselPanel`), avisar discretamente quando o usuário escolhe **>6 slides**:
> "Carrosséis com muitos slides podem demorar 1-2 minutos. Slides que falharem podem ser regerados individualmente."

Só copy, sem bloquear.

## Resumo dos arquivos tocados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/generate-carousel-images/index.ts` | Pool de concorrência 3 no lugar de `Promise.all` |
| `src/pages/CreateImage.tsx` | Polling tolerante, timeout 10min, resolve parcial |
| `src/components/create-content/carousel/CarouselGallery.tsx` | Overlay de erro com botão "Regerar" destacado |
| `src/components/create-content/carousel/CarouselPanel.tsx` | (Opcional) aviso para >6 slides |

## O que NÃO muda

- Schema do edge function (`onlyIndex`, payload). Sem migração.
- Hook `useCarouselSlides` (polling do `/result` continua igual).
- Geração de legenda e custo de créditos.
- Fluxo de imagem única.

## Resultado esperado

- 8 slides geram sem erro de timeout (lotes de 3, ~60-90s total).
- Se 1-2 slides falharem, usuário cai no `/result` com os prontos + botão claro para regerar os que faltaram (cada regen consome 1 chamada e ~15s).
- Overlay de "Gerando..." continua mostrando progresso passo a passo.
