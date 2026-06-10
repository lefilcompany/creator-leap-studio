# ADR 0003 — Templates por Marca (Agente de IA)

- **Status:** Proposto
- **Data:** 2026-06-10
- **Escopo:** Pipeline de IA, prompts, modelos, composição final e guardrails para a funcionalidade de Templates.
- **ADRs relacionadas:** [0001 — Backend](./0001-templates-backend.md), [0002 — Frontend](./0002-templates-frontend.md)

---

## 1. Contexto

O grande risco técnico da feature é a **fidelidade tipográfica**: modelos de edição de imagem (Gemini, GPT-image) ainda falham em manter fonte, kerning, ortografia e posição exatas ao reescrever texto sobre uma imagem. Reproduzir o template "pintando" tudo via IA produz peças com letras tortas, palavras inventadas ou tipografia inconsistente — inaceitável para uso de marca.

Por outro lado, **forçar fundo 100% determinístico** (sempre reusar o fundo original) tira a flexibilidade que faz a funcionalidade valer a pena: o usuário muitas vezes quer o mesmo *layout*, mas com fundo diferente para nova campanha.

A decisão validada no grilling combina as duas abordagens em um pipeline híbrido.

## 2. Decisão

### 2.1. Princípio diretor

> **A IA cuida da imagem. O servidor cuida do texto.**
> Nenhum pixel de texto final é gerado por modelo generativo. Nenhuma palavra digitada pelo usuário é reescrita pela IA.

Esse princípio é inegociável e dá nome à fidelidade tipográfica que o produto promete.

### 2.2. Pipeline em 4 estágios

```text
┌─────────────────────────────────────────────────────────────────────┐
│ ESTÁGIO 1 — IMPORTAÇÃO (executado 1x por template, no upload)       │
├─────────────────────────────────────────────────────────────────────┤
│  arquivo → rasterização → Vision (zonas) → Inpainting (clean bg)    │
│                          ↘ retorna ao usuário para ajuste manual    │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ commit
┌─────────────────────────────────────────────────────────────────────┐
│ ESTÁGIO 2 — FUNDO (executado em cada geração)                       │
├─────────────────────────────────────────────────────────────────────┤
│  Branch A: lê clean_background.png (custo IA = 0)                   │
│  Branch B: gera fundo novo via Gemini image (custo IA reduzido)     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ ESTÁGIO 3 — COMPOSIÇÃO (Canvas server-side, determinístico)         │
├─────────────────────────────────────────────────────────────────────┤
│  carrega fontes → desenha cada text_zone → cola logo (se slot)      │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│ ESTÁGIO 4 — COMPLIANCE & FINALIZAÇÃO                                │
├─────────────────────────────────────────────────────────────────────┤
│  complianceCheck → upload content-images → action + caption         │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3. Estágio 1 — Importação

**Rasterização**
- PDF (1 página) → `pdfjs-dist` (já no projeto) em DPI alto (≥ 200), exporta PNG base.
- PNG/JPG → normaliza para PNG, calcula `width`/`height`.

**Detecção de zonas (Vision)**
- Modelo: `google/gemini-2.5-flash` via `LOVABLE_API_KEY` no AI Gateway (`/v1/chat/completions`, multimodal).
- Prompt estruturado pede JSON estrito (tool calling) com array de `text_zones`:
  - `label` semântico ("Título", "Subtítulo", "CTA", "Data", "Preço", "Endereço", "Outro").
  - `bbox` normalizado.
  - `original_text`.
  - Estimativas de `font_family`, `font_weight`, `font_size_px`, `color`, `align`.
- Pede também `logo_slot` se identificar uma área típica de logo (canto superior/inferior, pequena, isolada).
- **Não retry em 4xx** (regra do AI Gateway).

**Inpainting (geração do `clean_background`)**
- Modelo: `google/gemini-3-pro-image-preview` (edit) via Gateway com mensagem multimodal e `modalities: ["image","text"]`.
- Prompt: "Remova *apenas* o texto e elementos tipográficos identificados nestas regiões. Preserve exatamente o fundo, gradientes, fotos, formas decorativas e qualquer área não-textual. Não adicione novo texto."
- Envia bboxes como referência textual. Resultado salvo em `clean_background.png` (custo amortizado).

**Retorno ao usuário**
- A função retorna `template_id (draft)` + zonas + slot sugeridos. O ajuste manual da ADR 0002 é **obrigatório** — princípio "OCR sugere, humano confirma" do projeto.

### 2.4. Estágio 2 — Fundo (por geração)

| Branch | Origem | Custo IA |
|---|---|---|
| **A — Reusar** | `clean_background.png` do bucket | 0 |
| **B — Gerar novo** | `google/gemini-3.1-flash-image-preview` (Nano Banana 2), aspect ratio = `width:height` do template | 1 chamada |

Branch B usa o **Art Director** existente (mem `art-director-enrichment`) para enriquecer a descrição do usuário, e injeta as Top 3 recipes aprovadas da marca (mem `brand-style-feedback-system`) como referência de estilo. Sem texto no prompt: o modelo é instruído explicitamente a **não desenhar texto algum**.

### 2.5. Estágio 3 — Composição (Canvas server-side)

Edge function `generate-from-template` usa **`skia-canvas`** ou **`@napi-rs/canvas`** via `npm:` specifier no Deno (mais previsível que canvas via WASM para fontes custom).

Sequência:

1. Carregar imagem de fundo (Branch A ou B).
2. Para cada `font_family` em uso:
   - Se `font_assets.source === "google"`: download da Google Fonts API (cache LRU em memória + Storage).
   - Se `font_assets.source === "custom"`: download do bucket `custom-fonts`.
   - Registrar no canvas (`registerFont`).
3. Para cada zona em `text_zones`:
   - Recuperar `value` digitado pelo usuário.
   - Aplicar `complianceCheck` no texto (mem `content-compliance-moderation`).
   - Desenhar respeitando `bbox`, `font_family`, `font_weight`, `font_size_px`, `color`, `align`, `line_height`.
   - **Auto-shrink:** se largura medida > bbox, reduz `font_size` em passos de 2px até caber, respeitando piso de 12px (mem `text-on-image-specs`). Se ainda assim não couber, retorna erro de "texto excede o espaço".
4. Se `logo_slot` ativo: download de `brands.logo`, aplica fit (`contain`/`cover`) dentro do bbox respeitando `padding`. Logo é **imutável** (mem `reference-image-preservation`).
5. Export PNG.

### 2.6. Estágio 4 — Compliance e finalização

- Texto já passou por `complianceCheck` antes do desenho.
- Imagem final entra no bucket `content-images`.
- Cria `actions(type='template_image', details={template_id, zone_values, background_mode}, result={imageUrl, thumb_path})`.
- Debita 50% do custo de `IMAGE` via `consume_workspace_credits`.
- Dispara `generate-caption` para legenda sugerida no padrão v2 (título + corpo + CTA + 5 hashtags).

### 2.7. Guardrails

- **Logo imutável.** Não há reprocessamento de IA sobre o logo.
- **Sem reescrita.** Texto vai exatamente como o usuário digitou (compliance pode bloquear, nunca substituir).
- **Sem contexto político** (regra core do projeto).
- **Ambiente isolado.** Pipeline roda apenas no ambiente Test até promoção; nenhuma chamada agente toca Live diretamente.
- **Sem retry em 4xx do Gateway.** Em 429/5xx faz backoff exponencial (3 tentativas), respeitando `Retry-After`.

## 3. Consequências

**Positivas**
- Fidelidade tipográfica de 100% (texto via Canvas).
- Custo de IA por geração reduzido: 0 (Branch A) ou 1 (Branch B). Inpainting do clean_background é pago 1x na importação.
- Desconto de 50% no custo da ação fica matematicamente justificado.
- Pipeline auditável: cada estágio tem entrada/saída inspecionável.

**Negativas**
- Servidor passa a depender de uma lib de canvas em Deno — superfície nova de bugs e tamanho de bundle.
- Cache de fontes precisa de governança (TTL, invalidação, limites por workspace).
- Auto-shrink pode reduzir hierarquia visual original; mitigado por validação de `max_chars` no frontend.

**Riscos**
- `skia-canvas`/`@napi-rs/canvas` pode ter incompatibilidades de runtime em Edge Functions; PoC obrigatório antes da implementação.
- Inpainting pode falhar em fundos muito ruidosos; fallback: oferecer ao usuário "regerar fundo limpo" no diálogo de ajuste.

## 4. Alternativas consideradas

1. **Edição ponta-a-ponta via Gemini Pro / GPT-image** — rejeitada: tipografia quebra, palavras inventadas, kerning errado. Violaria o princípio diretor.
2. **Determinístico puro (sem IA no fundo)** — rejeitada: tira a possibilidade de "novo fundo no mesmo layout", que é o caso de uso de campanhas recorrentes.
3. **Inpainting on-demand (sem cache `clean_background`)** — rejeitada: dobra custo de IA por geração, inviabiliza o desconto, aumenta latência percebida.
4. **OpenAI `gpt-image-2` para fundo** — descartada como default: prompts em PT-BR e estilo brasileiro funcionam melhor em Gemini hoje, e Gemini suporta edição (Branch B precisa quando o template original guia o estilo). Pode ser alternativa futura via flag.
