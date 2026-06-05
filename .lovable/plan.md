## Diagnóstico (verificado no banco)

A action `0adf6331…` mostra duas causas concretas:

1. **Alvo errado**: `regenerationCount=1` ficou no slide com `index=0` (Slide 1). O usuário tinha selecionado o Slide 2. O modal usa `currentSlide = slides[selectedIndex]` do embla — se o `selectedIndex` ainda não foi atualizado ou se o usuário aciona "Regerar este slide" antes do snap, o índice enviado é o errado. Hoje o modal mostra um thumb pequenino que não comunica claramente qual slide será regerado.

2. **Composição "3 em 1"**: os três slides têm **prompt idêntico** no banco: *"Crie uma sequência de 3 imagens realistas para um carrossel promocional…"*. Como o regen concatena `prompt original + instruções do usuário` com `keepOriginalPrompt=true` por padrão, o modelo segue obediente o "sequência de 3 imagens" e devolve um composite com 3 painéis em um quadro só.

## Plano

### 1. Targeting do slide (frontend)

`src/components/create-content/carousel/CarouselGallery.tsx`
- Substituir `currentSlide = slides[selectedIndex]` por uma resolução robusta: usar `selectedIndex` validado contra `emblaApi.selectedScrollSnap()` no momento do clique. Garantir que `openRegenerate` sempre receba o slide visível ativo.
- Botão "Regerar este slide": ler `emblaApi?.selectedScrollSnap() ?? selectedIndex` no `onClick` (snapshot atômico em vez de variável de closure).
- Desabilitar o botão enquanto o embla está em transição (`emblaApi.scrollProgress` não estável) para evitar disparo em slide errado.

`src/components/create-content/regenerate/RegenerateImageDialog.tsx`
- Subir a confirmação visual: thumb maior (≈80–96px), rótulo grande **"Regerar Slide N de Total"** no header, com o prompt resumido logo abaixo. Assim o usuário enxerga imediatamente qual slide vai mudar — se for o errado, fecha.
- Adicionar guard: se `slide.index` recebido não bater com nenhum índice presente em `carousel.slides`, abortar com toast claro.

### 2. Pressão do prompt original (frontend + edge function)

`src/components/create-content/regenerate/RegenerateImageDialog.tsx`
- Inverter o default: `keepOriginalPrompt = false`. O usuário forneceu instruções — elas devem ser o prompt. O toggle (em "Mais opções") passa a se chamar **"Manter prompt original como contexto leve"** (off por padrão).

`supabase/functions/generate-carousel-images/index.ts` (função `callGenerateImageForSlide`)
- Refatorar a composição do prompt quando `isRegenForThisSlide`:
  - Se `keepOriginalPrompt=false` (novo default): `description = instruções do usuário` + bloco rígido `RESTRIÇÕES OBRIGATÓRIAS:` listando "uma única cena fotográfica, NÃO criar colagem/grid/painéis/sequência/múltiplas fotos no mesmo quadro".
  - Se `keepOriginalPrompt=true`: incluir o prompt original **sanitizado** (regex removendo trechos tipo `sequência de N imagens`, `carrossel`, `colagem`, `grid`, `painéis`, `múltiplas cenas`) como "CONTEXTO LEVE (não copiar literalmente)", com as instruções do usuário marcadas como **prioritárias e vinculantes**.
- Adicionar sempre, em modo regen, a diretiva anti-composite no payload `description`, independentemente do `keepOriginalPrompt`.
- Quando o usuário enviar `avoid`, anexar normalmente.

### 3. Higiene da geração inicial (correção de causa raiz, opcional nesta task)

Os 3 slides terem prompt idêntico é bug do gerador de carrossel (não decompõe o master prompt em prompts por slide). Fora do escopo direto do pedido, mas registrar nota no código apontando para investigação separada — assim a regen não precisa carregar a culpa eternamente.

## Validação

1. Abrir o carrossel atual `0adf6331…`, selecionar Slide 2, abrir o modal: header deve dizer **"Regerar Slide 2 de 3"** com thumb grande do slide correto.
2. Escrever "Apenas uma cena: brinde em close, fundo bokeh quente", regerar.
3. Checar no banco: `regenerationCount` deve incrementar **apenas no slide index=1**.
4. Imagem resultante deve ser uma cena única, não composite de 3 painéis.
5. Repetir alternando para Slide 3 → confirmar que só o index=2 muda.

## Fora de escopo

- Reescrever a geração inicial de prompts por slide (causa raiz dos prompts duplicados).
- Mudar a UI do gallery além do necessário para o targeting.
