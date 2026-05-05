
# Carrossel de ponta a ponta no Calendário de Conteúdo

Hoje "carrossel" é apenas um rótulo de formato (`metadata.format = "carrossel"`) e cai exatamente no mesmo fluxo de um post único: 2 briefings, 1 imagem. Vamos transformar em um fluxo nativo com N slides.

## 1. Modelo de dados (migration)

Tudo persistido em `calendar_items.metadata.carousel` para não criar tabela nova:

```json
"carousel": {
  "enabled": true,
  "suggested_count": 6,
  "count": 6,
  "shared_style": { "palette": "...", "typography": "...", "mood": "...", "visual_style": "realistic" },
  "reference_action_id": "uuid-do-slide-1",
  "slides": [
    {
      "index": 1,
      "role": "capa | desenvolvimento | cta",
      "headline": "...",
      "caption_part": "...",
      "image_briefing": "...",
      "design_action_id": "uuid",
      "image_url": "...",
      "status": "pending | generating | done | error",
      "error": null
    }
  ]
}
```
`design_action_id` raiz continua existindo, mas aponta para o slide 1 (capa) por compatibilidade com o resto do app (histórico, thumbs, aprovação final).

## 2. Etapa Calendário (sem mudança visual)
Nada muda — o usuário continua escolhendo formato "Carrossel" como hoje.

## 3. Etapa Briefing (mudanças significativas)

Quando `format === "carrossel"`:

- Aparece um bloco extra "**Estrutura do carrossel**" acima dos campos de briefing:
  - Slider/stepper "Quantos slides?" (3–10), pré-preenchido com sugestão da IA
  - Botão "Sugerir com IA" — chama `suggest-carousel-structure` que retorna `{ suggested_count, slides: [{ role, headline, caption_part, image_briefing }] }`
- Os 2 campos atuais (texto/imagem) viram **abas** dentro de cada slide:
  - Lista vertical/tabs de slides (Slide 1 — Capa, Slide 2…, Slide N — CTA)
  - Para cada slide: campo de copy (headline + parte da legenda) + campo de briefing visual + botão "Gerar este slide com IA"
  - Botão geral "Gerar todos com IA" continua existindo
- Bloco "**Estilo compartilhado**" (paleta, tipografia, mood, visual style) — gerado uma vez e fica fixo; usado em todos os prompts para coerência
- Validação para avançar: todos os slides com `image_briefing.length >= 10` e `headline` preenchido
- Tela de aprovação mostra grid com os N slides resumidos

Edge function `generate-item-briefing` ganha modo `carousel`:
- Recebe `count` e `shared_style`
- Retorna array de slides já estruturados (capa → desenvolvimento → cta) num único call Gemini, com instrução de manter coerência narrativa e visual

## 4. Etapa Design (mudança principal)

Substitui o atual "abrir CreateImage com prefill" por geração inline em paralelo:

- Card por slide num grid responsivo (2 col desktop, 1 mobile) mostrando:
  - Miniatura (placeholder enquanto `pending`/`generating`, imagem quando `done`)
  - Headline do slide, badge do papel (Capa/Desenvolvimento/CTA)
  - Botão "Regenerar" individual (custo: 1× crédito de imagem completa)
  - Status visual (spinner / check / erro com retry)
- CTA principal "**Gerar todas as imagens**" no topo:
  - Confirmação de custo: `N × COMPLETE_IMAGE_MEDIUM` créditos
  - Dispara nova edge function `generate-carousel-images`:
    1. Gera **slide 1 (capa)** primeiro, sozinho — vira referência visual
    2. Faz upload + cria `actions` row para slide 1 → `reference_action_id`
    3. Dispara slides 2..N **em paralelo** (`Promise.all`) usando slide 1 como `image_url` de referência (image-to-image leve via Gemini nano banana, prompt instrui "manter paleta, tipografia, mood, ambientação; trocar cena conforme briefing")
    4. Cada slide gera sua própria `actions` row + atualiza `metadata.carousel.slides[i]`
  - Cliente faz polling em `metadata.carousel` para atualizar UI em tempo real
- Botão "Aprovar carrossel" só fica ativo quando todos os slides têm `status === "done"`
- Aprovação final: marca `final_approved = true` e cria/atualiza ação principal apontando para o conjunto

## 5. Visualização do resultado

- `ActionView` ganha um modo "carousel" quando `details.carousel === true`: carrossel embla com os N slides, navegação dot/seta
- `History` thumbnail usa o slide 1 + badge "Carrossel · N"
- Download/PPTX export gera 1 slide por imagem na ordem

## 6. Feedback e aprendizado

- `AgentFeedback` no painel de Design fica com `agentId="carousel_image"` e snapshot de todos os slides
- O agente revisor já existente (`revise-agent`) reaproveita esses feedbacks para evoluir prompts de carrossel por marca

## Arquivos novos/editados

**Novos:**
- `supabase/functions/suggest-carousel-structure/index.ts`
- `supabase/functions/generate-carousel-images/index.ts`
- `src/components/calendar/carousel/CarouselStructurePanel.tsx`
- `src/components/calendar/carousel/CarouselSlideEditor.tsx`
- `src/components/calendar/carousel/CarouselDesignGrid.tsx`
- `src/components/ActionCarouselViewer.tsx`

**Editados:**
- `supabase/functions/generate-item-briefing/index.ts` — modo carousel
- `src/components/calendar/CalendarItemPanel.tsx` — desvia `StageBriefing`/`StageDesign` quando formato = carrossel
- `src/pages/ActionView.tsx` — render do viewer multi-slide
- `src/components/historico/ActionList.tsx` — badge "Carrossel · N"
- `src/lib/exportHistoryToPptx.ts` — exporta N slides
- `src/lib/creditCosts.ts` (+ shared) — opcional: alias `CAROUSEL_IMAGE` = `COMPLETE_IMAGE_MEDIUM`

## Custos de crédito
- Sugestão de estrutura: grátis (texto leve)
- Briefings: 0 (já gratuito hoje)
- Geração: `N × COMPLETE_IMAGE_MEDIUM` (8 créditos por slide), confirmação clara antes de disparar
- Regeneração individual: 1 × `COMPLETE_IMAGE_MEDIUM`

## Pontos de atenção
- Aspect ratio fixo do carrossel: **4:5** (já mapeado em `FORMAT_TO_ASPECT`)
- Limite hard de 10 slides para evitar custo descontrolado e rate limit do Gemini
- Se uma imagem falhar, o conjunto não bloqueia — usuário regenera só a que falhou
- Polling: já existe padrão em `StageBriefing`, reusar (3.5s, invalidate query)
