# Modal de "Regerar imagem"

Hoje o botão "Regerar slide" só dispara o pipeline silenciosamente. Quando o status sai do polling, parece que "nada acontece" e não há como dizer o que precisa mudar. Vamos transformar a ação em um modal guiado.

## O que o usuário verá

Ao clicar em "Regerar slide" (no carrossel) ou "Regerar imagem" (em imagem única), abre um modal com:

1. **Pré-visualização** da imagem atual (miniatura) + bloco "O que deu errado nesta imagem?" (textarea curta, opcional).
2. **Instruções de ajuste** (textarea principal, obrigatória): "Descreva o que quer mudar nesta imagem". Placeholder com exemplos ("Trocar o fundo para um ambiente externo", "Remover o copo da mesa", "Aproximar o produto").
3. **Imagens de referência** (até 3, opcional): mesmo componente de upload já usado em CreateImage (preserveImages). Hint: "Use para mostrar estilo, enquadramento ou elementos a manter".
4. **Ajustes finos** (collapsible "Mais opções"): manter prompt original? (toggle), tom/mood override (input livre opcional), evitar (textarea opcional → vira "negative prompt").
5. **Aviso de custo** dinâmico:
   - "Esta é sua **regeração gratuita** desta imagem."
   - A partir da 2ª: "Esta regeração custa **4 créditos** (metade de uma imagem nova)."
6. Botões: "Cancelar" e "Regerar imagem (X créditos)".

Mobile: bottom-sheet em vez de modal centralizado, mesmo padrão dos outros formulários.

## Regra de custo

- 1ª regeração de uma mesma imagem (slide ou single): **gratuita**.
- 2ª em diante: **4 créditos** (metade do custo padrão de imagem única).
- Contador é por imagem (slide individual ou actionId de imagem única), não por sessão.

## Comportamento depois do envio

- Modal fecha, toast "Regeração iniciada".
- Card do slide/imagem volta para estado "generating" com overlay (já existe `StatusOverlay`).
- Polling é **forçado a reiniciar** mesmo se o carrossel já estava 100% concluído (hoje o `refetchInterval` para quando tudo está done e não retoma — bug que faz o usuário achar que nada acontece).

## Detalhes técnicos

### Frontend

Novo componente `src/components/create-content/regenerate/RegenerateImageDialog.tsx`:

- Props: `open`, `onOpenChange`, `mode: "carousel-slide" | "single-image"`, `actionId`, `slideIndex?`, `currentImageUrl`, `regenerationCount`, `onSubmitted()`.
- Upload de refs: reutiliza `ImageUploader`/`uploadImage` helper já usado em `CreateImage.tsx` (bucket `content-images`), retorna URLs públicas.
- Custo: `cost = regenerationCount === 0 ? 0 : 4`.
- Submit → chama edge function correspondente com payload novo (ver abaixo).

Integrações:

- `src/components/create-content/carousel/CarouselGallery.tsx`: substitui o `handleRegenerate` direto pela abertura do dialog. Remove o caminho que invoca `generate-carousel-images` direto sem instruções (mantém apenas via dialog).
- `src/pages/ContentResult.tsx` (ou o componente equivalente para imagem única — confirmar onde está o botão "Regerar" hoje; se ainda não existe, o dialog já fica disponível e adicionamos o botão no header de ações da imagem única, padrão `ContentResultLayout`).
- `src/hooks/useCarouselSlides.ts`: ajustar `refetchInterval` para também voltar a fazer polling quando algum slide volta para `generating`/`pending` depois de já ter ficado done (compara última versão conhecida; se algum status regrediu, retoma intervalo de 5s).
- Persistir contador de regeração: campo novo `regenerationCount` por slide dentro de `result.carousel.slides[i]` (já é um JSONB em `actions.result`), e `result.regenerationCount` para imagem única. Edge function incrementa.

### Edge functions

`supabase/functions/generate-carousel-images/index.ts`:

- Estender schema do body para aceitar, quando `onlyIndex` está presente:
  - `regenerationInstructions: string`
  - `referenceImages: string[]` (até 3)
  - `avoid?: string`
  - `keepOriginalPrompt: boolean` (default true)
  - `costOverride?: number` (frontend já validou custo; edge revalida via `consume_workspace_credits` com `p_amount = costOverride`).
- Antes de chamar `callGenerateImageForSlide`, monta o prompt final:
  - Se `keepOriginalPrompt`: `prompt = slide.prompt + "\n\nAJUSTES SOLICITADOS:\n" + instructions`.
  - Se `avoid`: anexa `"\n\nEVITAR: " + avoid`.
  - `preserveImages` recebidas substituem (ou se somam, configurável) as refs originais do slide.
- Incrementa `result.carousel.slides[onlyIndex].regenerationCount` ao final.
- Mantém o `AbortController` de 4 min já existente.

`supabase/functions/generate-image/index.ts` (imagem única):

- Mesmo padrão: aceita `regenerationInstructions`, `referenceImages`, `avoid`, `costOverride`, `parentActionId`. Incrementa `result.regenerationCount` no `actions` registro.

### Cobrança

- Frontend mostra custo informativo, mas a fonte da verdade é a edge function: ela lê `regenerationCount` atual do `actions.result`, calcula `0` ou `4`, e chama `consume_workspace_credits` (já existe). Se o frontend pediu valor diferente, prevalece o do servidor (defesa contra adulteração).

## Fora do escopo

- Histórico de versões antigas da imagem (mantemos só a mais recente; pode virar outra entrega).
- Regeração em lote (vários slides ao mesmo tempo com as mesmas instruções).

## Arquivos afetados

- `src/components/create-content/regenerate/RegenerateImageDialog.tsx` (novo)
- `src/components/create-content/carousel/CarouselGallery.tsx`
- `src/pages/ContentResult.tsx` (ou local equivalente do botão de regerar imagem única — confirmo na implementação)
- `src/hooks/useCarouselSlides.ts`
- `supabase/functions/generate-carousel-images/index.ts`
- `supabase/functions/generate-image/index.ts`
