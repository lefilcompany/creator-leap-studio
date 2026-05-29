## Problemas

1. **Imagens de referência ignoradas no carrossel**: no fluxo `isCarousel`, `validateForm` pula `referenceFiles` e a invocação de `generate-carousel-images` não envia nenhuma referência. Resultado: as latas da marca não são respeitadas, ao contrário da geração única.
2. **Tela de resultado diferente da padrão**: `ContentResult` faz um short‑circuit para `CarouselResultView`, que tem layout próprio (galeria + bloco de legenda separado) bem diferente da tela usada para uma imagem só.
3. **Legenda não gerada**: confirmei no banco que a action `a9275571…` tem os 4 slides com `status:done` mas `caption` continua `null`. A função `generateCarouselCaption` é disparada *depois* do `Promise.all` dos slides, sem `EdgeRuntime.waitUntil` cobrindo essa etapa final em todos os cenários, então ela morre quando a invocação inicial responde antes — daí o "Gerando legenda do carrossel…" infinito.

## Mudanças

### 1. Referências obrigatórias no carrossel (frontend)
`src/pages/CreateImage.tsx`
- Remover a exceção `isCarousel ? true : referenceFiles.length > 0` em `validateForm` e em `missingFields` — carrossel passa a exigir as mesmas referências da imagem única.
- No branch `if (isCarousel)`, comprimir `referenceFiles` para base64 (mesma função `compressImage` que o fluxo single usa) **antes** de chamar a edge function, e enviar no body como `referenceImages: string[]` (array compartilhado por todos os slides).

### 2. Propagar referências por slide (backend)
`supabase/functions/generate-carousel-images/index.ts`
- Adicionar ao `BodySchema`: `referenceImages: z.array(z.string()).max(5).optional()`.
- Em `callGenerateImageForSlide`, montar o payload de `generate-image` com `referenceImages: body.referenceImages ?? (slide.referenceImageUrl ? [slide.referenceImageUrl] : undefined)` — assim cada slide recebe exatamente o mesmo array de referências que o fluxo single envia.

### 3. Garantir geração de legenda
`supabase/functions/generate-carousel-images/index.ts`
- Mover o disparo de `generateCarouselCaption` para um caminho garantido: executar `await generateCarouselCaption(...)` ao final de `processCarousel` mesmo se algum slide falhar (basta haver ≥1 `done` e ainda não existir caption), e envolver todo o `processCarousel` em `EdgeRuntime.waitUntil` (já feito) — confirmar que a chamada de caption está dentro desse mesmo `waitUntil` (está, mas adicionar try/catch + log para diagnóstico).
- Trocar a checagem `allDone` para `hasAnyDone` (`finalSlides.some(s => s.status === 'done' && s.imageUrl)`) para não bloquear a legenda quando 1 slide falha.

### 4. Tela de resultado no padrão da imagem única
`src/components/create-content/carousel/CarouselResultView.tsx`
- Reescrever para reusar o **mesmo layout/visual** da `ContentResult` de imagem única:
  - Mesmo header (breadcrumb + título + ações Salvar/Compartilhar/Baixar).
  - Mesmo card de mídia (rounded-2xl bg-card shadow-xl, sem o badge "X/Y prontos" no topo) — para carrossel, substituir a `<img>` única por um Embla `Carousel` (componente `@/components/ui/carousel`) ocupando o mesmo slot da imagem, com indicadores de slide e setas; mantém a mesma proporção 4:5.
  - Mesmo bloco de **Legenda sugerida** abaixo do card, idêntico ao da imagem única (Título / Corpo / Hashtags + botão Copiar + ações de revisão), em vez do bloco simplificado atual.
- `CarouselResultView` continua sendo chamado pelo short‑circuit em `ContentResult.tsx`, mas agora visualmente é a "tela de resultado padrão" com um carrossel de imagens no lugar da imagem única.

## Detalhes técnicos

- Limite de referências mantido em 5 (igual single).
- `referenceImages` no carrossel são compartilhadas por todos os slides (não há UI para referência por slide hoje); o backend ignora `slide.referenceImageUrl` quando `body.referenceImages` está presente.
- Nenhuma migração de banco necessária; estrutura `result.carousel` permanece igual.
- Custo continua `slidesCount * COMPLETE_IMAGE` — sem mudança.

## Arquivos tocados

- `src/pages/CreateImage.tsx` — validação + upload de referências no carrossel.
- `supabase/functions/generate-carousel-images/index.ts` — schema, propagação de referências, robustez da legenda.
- `src/components/create-content/carousel/CarouselResultView.tsx` — reescrita para casar com o padrão de imagem única.
