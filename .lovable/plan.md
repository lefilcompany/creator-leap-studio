# Plano — Carrossel dentro de "Criar Conteúdo"

Implementação fiel ao `prompt-carrossel-em-criar-conteudo.md`: o carrossel **não é uma rota nova**, é apenas mais um formato no `FormatPreview` do fluxo `/create/image`. Cada slide é uma thread independente que dispara a edge `generate-image` já existente (que já carrega contexto de marca/editoria/persona e cobra créditos por slide), com **slide 0 sequencial → 1..N-1 em `Promise.all`**.

Vou entregar em 4 fases, cada uma com um arquivo `.md` em `/mnt/documents/` descrevendo exatamente o que será feito antes do código. Isso permite validar fase por fase.

---

## Fase 1 — Edge function `generate-carousel-images` (orquestrador)

Arquivo: `/mnt/documents/fase-1-edge-function.md` + implementação.

- Nova função `supabase/functions/generate-carousel-images/index.ts`.
- Auth: valida JWT via `getClaims()` (Authorization header obrigatório).
- Input validado por Zod: `actionId`, `slidesCount (2-10)`, `slides[]` (index, prompt, visualStyle?, cameraAngle?, lighting?, composition?, mood?, referenceImageUrl?), `brandId`, `themeId?`, `personaId?`, `platform: "Carrossel"`, `contentType`, opcional `onlyIndex` (para regerar 1 slide).
- Cliente Supabase com `SUPABASE_SERVICE_ROLE_KEY` para `PATCH` granular em `actions.result.carousel.slides[i]` (merge via leitura+escrita do JSON, sem sobrescrever outros campos).
- Para cada slide: chama `generate-image` (fetch interno com Authorization do user, para preservar cobrança individual por slide), com `aspectRatio:"4:5"`, `width:1080`, `height:1350`, `imageIncludeText:false`, passando `brandId/themeId/personaId/contentType` + campos visuais.
- Compliance: nada de bypass — o `generate-image` chamado já executa `_shared/complianceCheck.ts`.
- Fluxo: marca slide 0 como `generating` → chama → atualiza para `done`/`error`; depois `Promise.all` para 1..N-1 com a mesma lógica.
- Resposta 202 imediata (`{ ok: true, actionId }`); o trabalho continua em background usando `EdgeRuntime.waitUntil`.
- CORS via `npm:@supabase/supabase-js@2/cors`.
- Sem `verify_jwt` custom em `supabase/config.toml`.

## Fase 2 — `FormatPreview` + componentes do painel do carrossel

Arquivo: `/mnt/documents/fase-2-ui-painel.md` + implementação.

- Em `src/components/quick-content/FormatPreview.tsx`: inserir `{ platform: "Carrossel", label: "Carrossel (4:5)", width: 1080, height: 1350, aspectRatio: "4:5" }` logo após o "Quadrado". Mapear ícone (reaproveitar `ImageIcon`/Layers).
- Criar `src/components/create-content/carousel/SlideImageSettingsForm.tsx` — config visual por slide (visualStyle, cameraAngle, lighting, composition, mood) + upload opcional de referência no bucket `content-images` (path `carousel-refs/{userId}/{actionId}/{slideIndex}.{ext}`).
- Criar `src/components/create-content/carousel/CarouselPanel.tsx`:
  - Seletor `Quantidade de slides (1–10)` (default 3).
  - Lista de cartões por slide: `prompt` curto + `SlideImageSettingsForm` colapsável.
  - Botões `+ Adicionar slide` / `Remover` (clamp 1..10).
  - Estado controlado: `slides: SlideBriefing[]`, `onChange`.
- Criar `src/components/create-content/carousel/CarouselGallery.tsx` (read-only): grid de slides com status (skeleton/blur enquanto `pending|generating`, imagem quando `done`, retry quando `error`), botão **Regerar slide** por card e download.
- Criar hook `src/hooks/useCarouselSlides.ts`: `useQuery` em `actions` por `actionId`, `refetchInterval: 3000` enquanto algum slide estiver `pending|generating`.

## Fase 3 — Integrar no `CreateImage.tsx` (modo carrossel)

Arquivo: `/mnt/documents/fase-3-create-image.md` + implementação.

- `const isCarousel = formData.platform === "Carrossel";`
- Estado novo: `const [slides, setSlides] = useState<SlideBriefing[]>([{index:0, prompt:""},{index:1, prompt:""},{index:2, prompt:""}])`.
- Quando `isCarousel`: ocultar `UnifiedPromptBox` e renderizar `<CarouselPanel slides={slides} onChange={setSlides} />`. Manter marca/tema/persona/tom/categoria/contentType intactos.
- Custo: `displayedCost = isCarousel ? slides.length * CREDIT_COSTS.COMPLETE_IMAGE : CREDIT_COSTS.COMPLETE_IMAGE` (validar saldo antes de submeter; bloquear se algum slide com `prompt` vazio).
- No submit (`isCarousel`):
  1. `insert` em `actions` (`type:'CRIAR_CONTEUDO'`, `details: {...formData, slidesCount}`, `result: { carousel: { slidesCount, slides: slides.map(s => ({...s, status:'pending'})) } }`), `.select('id').single()`.
  2. Uploads de referência (se houver) → atualizar `slides[i].referenceImageUrl`.
  3. `supabase.functions.invoke('generate-carousel-images', { body: { actionId, slidesCount, slides, brandId, themeId, personaId, platform:'Carrossel', contentType } })` — fire-and-forget.
  4. Navegar para `/result?actionId=...` (mesma rota usada hoje pelo fluxo padrão).
- Não tocar no caminho não-carrossel.

## Fase 4 — Resultado, legenda única e regeneração

Arquivo: `/mnt/documents/fase-4-resultado-legenda.md` + implementação.

- Em `src/pages/ContentResult.tsx`: detectar `action.result?.carousel` → renderizar `<CarouselGallery />` com polling via `useCarouselSlides`. Manter UI atual para imagem única.
- Botão "Regerar slide" chama `generate-carousel-images` com `onlyIndex: i` (a edge re-executa apenas aquele índice e re-faz o `PATCH`).
- Legenda única do carrossel: quando todos os slides estiverem `done`, disparar **uma vez** `generate-caption` passando `prompts.join("\n\n")` como contexto + marca/persona/tema; salvar `title/body/hashtags` no `action.result` (merge). Pode ser feito pela própria edge `generate-carousel-images` no final do `Promise.all` para evitar lógica no front.
- Acompanhar logs via `supabase--edge_function_logs` e validar 1 ciclo end-to-end (3 slides) antes de fechar.

---

## Detalhes técnicos críticos

- **Cobrança**: 100% delegada ao `generate-image` (já cobra `COMPLETE_IMAGE` por chamada). Se um slide falhar por créditos, é marcado `error` e os demais continuam; o usuário vê e pode regerar depois de comprar créditos.
- **Service role só na edge** para fazer o `PATCH` no `actions.result` (RLS bloquearia merge granular vindo do user).
- **Contexto de marca/editoria/persona em cada thread**: garantido porque cada chamada de `generate-image` recebe `brandId/themeId/personaId` no body — a função já injeta o contexto no prompt do modelo.
- **API key**: o `generate-image` já usa as chaves configuradas (`GEMINI_API_KEY`/`LOVABLE_API_KEY`). Nada novo a configurar.
- **Sem migrações de banco**, sem mexer em `types.ts`/`client.ts`, sem novo card no `ContentCreationSelector`.

## Riscos / pontos a checar antes de cada fase

- Verificar o body exato aceito por `generate-image` (campos opcionais, formato de `referenceImageUrl`) — leitura rápida no início da Fase 1.
- Verificar como `ContentResult.tsx` carrega a action hoje, para encaixar o branch do carrossel sem regredir o caso imagem única — leitura no início da Fase 4.

Quando você aprovar, começo pela Fase 1 (arquivo .md + edge function).
