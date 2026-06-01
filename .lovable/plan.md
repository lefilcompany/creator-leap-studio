## Problema

No fluxo do carrossel, a `asyncFn` da background task resolve assim que a edge function `generate-carousel-images` retorna do `invoke` (apenas dispara a geração). Resultado: o overlay de "Gerando..." vira "Concluído" em segundos, e ao ir para `/result` os slides e a legenda ainda estão sendo gerados em background.

Para imagem única o overlay funciona corretamente porque o `asyncFn` só resolve quando imagem + legenda estão prontas.

## Objetivo

1. O overlay de geração deve permanecer aberto até **todos os slides + a legenda do carrossel** estarem prontos.
2. Exibir uma linha discreta de status que vai sendo substituída conforme avança ("Preparando...", "Gerando slide 2 de 4...", "Gerando legenda...", "Finalizando...").
3. Aplicar a mesma linha discreta de status também ao fluxo de imagem única (passos: gerando imagem → gerando legenda → finalizando).

## Mudanças

### 1. `src/contexts/BackgroundTaskContext.tsx`
- Adicionar campo opcional `progressMessage?: string` em `BackgroundTask`.
- Expor `updateTaskProgress(id, message)` no contexto.
- A função `asyncFn` recebe um segundo parâmetro `onProgress(message)` que chama `updateTaskProgress` internamente. Assinatura nova:
  ```ts
  asyncFn: (onProgress: (msg: string) => void) => Promise<{ route; state }>
  ```

### 2. `src/components/GeneratingOverlay.tsx`
- Abaixo do título "Gerando seu conteúdo...", renderizar uma única linha:
  ```tsx
  <p className="text-xs text-muted-foreground/80 text-center min-h-[1rem] transition-opacity">
    {task.progressMessage ?? "Preparando..."}
  </p>
  ```
- Usar `AnimatePresence`/`motion` com `key={progressMessage}` para fade-in/fade-out suave ao trocar a mensagem (linha única que é substituída).

### 3. `src/pages/CreateImage.tsx` — fluxo do carrossel (linhas ~674-763)
- Após `supabase.functions.invoke("generate-carousel-images", ...)`, **não retornar imediatamente**. Iniciar um loop de polling em `actions.result.carousel`:
  ```ts
  while (true) {
    await sleep(2000);
    const { data } = await supabase.from("actions").select("result").eq("id", actionRow.id).single();
    const car = data?.result?.carousel;
    const slides = car?.slides ?? [];
    const done = slides.filter(s => s.status === "done").length;
    const errored = slides.filter(s => s.status === "error").length;
    
    if (errored === slides.length && slides.length > 0) throw new Error("Falha ao gerar slides");
    
    if (done < slides.length) {
      onProgress(`Gerando slide ${Math.min(done + 1, slides.length)} de ${slides.length}...`);
      continue;
    }
    if (!car?.caption) {
      onProgress("Slides prontos. Gerando legenda...");
      continue;
    }
    onProgress("Finalizando...");
    break;
  }
  ```
- Timeout de segurança (~5 min) — após isso resolver com aviso ou rejeitar.
- Só então retornar `{ route: "/result?actionId=...", state: {} }`.

### 4. `src/pages/CreateImage.tsx` — fluxo de imagem única (linhas ~897-965)
- Encaixar chamadas a `onProgress` nos pontos chave:
  - Antes do fetch `generate-image`: `onProgress("Gerando imagem...")`
  - Antes do fetch `generate-caption` (quando aplicável): `onProgress("Gerando legenda...")`
  - Antes do `return`: `onProgress("Finalizando...")`

### 5. (Opcional, escopo coerente) Outros fluxos que usam `addTask`
- Apenas atualizar a assinatura para receber `onProgress` (sem usá-lo se não precisarem) — necessário para compilar TypeScript. Identificar via `rg "addTask\("`.

## O que NÃO muda

- Edge function `generate-carousel-images` permanece igual (continua gerando em background com fire-and-forget interno). O polling é só no cliente, lendo a tabela `actions`.
- `useCarouselSlides` e a tela `/result` ficam como estão — quando o usuário chegar lá, tudo já estará pronto.
- Sem novas tabelas, sem migrações.

## Resultado esperado

- Ao clicar "Gerar Carrossel", o overlay com logo do Creator fica visível durante toda a geração (~30-60s), mostrando uma linha discreta atualizando os passos.
- O botão "Ver resultado" só aparece quando carrossel + legenda estão completos.
- Mesma experiência consistente para imagem única.
