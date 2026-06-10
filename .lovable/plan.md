## ADR 0003 — Pipeline de IA para Templates (TDD)

Implementa os 4 estágios da ADR 0003 substituindo os stubs deixados pela ADR 0001. Princípio inegociável: **IA cuida da imagem, servidor cuida do texto**.

### Decisões confirmadas
- **Canvas:** `npm:@napi-rs/canvas` no Deno (registerFont, loadImage).
- **Escopo:** pipeline completo agora (Estágios 1+2+3+4).
- **IA:** `GEMINI_API_KEY` direto (mantém padrão do `geminiClient.ts`). Modelos: `gemini-2.5-flash` (Vision), `gemini-3-pro-image-preview` (Inpainting), `gemini-3.1-flash-image-preview` (Branch B).
- **Fontes:** cache em memória por invocação + persistência num bucket privado `template-fonts` (Google Fonts e custom).

### Infraestrutura nova
- Bucket privado `template-fonts` (apenas service_role lê/escreve; nada via cliente).
- Sem migration de schema — `brand_templates`, `font_assets`, `text_zones` e `logo_slot` já existem da ADR 0001.

### Estrutura de arquivos (novos)

```text
supabase/functions/_shared/
  templateCanvas.ts          # carrega imagem, registra fontes, desenha zonas, auto-shrink, cola logo
  templateCanvas_test.ts     # unit tests puros (medições, auto-shrink, fit logo)
  templateVision.ts          # chama Gemini Vision, valida JSON estrito de text_zones + logo_slot
  templateVision_test.ts     # mock de resposta Gemini → parsing/validação
  templateInpainting.ts      # chama Gemini image-edit, salva clean_background.png
  templateFontCache.ts       # Google Fonts API + bucket template-fonts (LRU em memória)
  templateFontCache_test.ts  # cache hit/miss, fallback bucket → Google
  templateRasterize.ts       # PDF (pdfjs-dist) e PNG → PNG normalizado + width/height

supabase/functions/import-brand-template/index.ts      # AGORA chama Vision + Inpainting reais (fake-ai continua para system admin)
supabase/functions/generate-from-template/index.ts     # AGORA roda pipeline real (Branch A/B + Canvas + compliance)
```

### Plano TDD (slices verticais)

Cada slice = um teste falhando → mínimo código pra passar.

**Slice 1 — Rasterização**
- T: PNG entra, sai PNG normalizado com `width`/`height` corretos.
- T: PDF 1 página renderiza em PNG ≥200 DPI.

**Slice 2 — Vision (detecção de zonas)**
- T: resposta válida do Gemini → array de `text_zones` com `label`, `bbox` normalizado, estimativas.
- T: detecta `logo_slot` quando presente.
- T: JSON inválido → erro tratado, não derruba função.
- T: 4xx do provider → erro fail-fast (sem retry). 5xx/429 → backoff (3 tentativas).

**Slice 3 — Inpainting (clean_background)**
- T: gera PNG sem texto preservando fundo (verifica chamada com bboxes + prompt correto).
- T: resultado salvo em `{workspace}/{brand}/{template}/clean_background.png` no bucket `brand-templates`.

**Slice 4 — `import-brand-template` integrado**
- T: fluxo end-to-end real (com `x-template-fake-ai: 1` para system admin continua mockável).
- T: cria `brand_templates` com `status='draft'`, `text_zones`, `logo_slot`, `clean_background_path`.

**Slice 5 — Cache de fontes**
- T: Google Fonts → download → grava em `template-fonts/google/<family>-<weight>.ttf`.
- T: segunda chamada → vem do bucket (sem hit externo).
- T: custom font → resolve `custom_fonts.font_id` → `custom-fonts` bucket.

**Slice 6 — Composição Canvas**
- T: desenha 1 zona com fonte registrada, respeita `bbox`/`align`/`color`.
- T: auto-shrink em passos de 2px até caber (piso 12px), erro se não couber.
- T: logo slot — `fit: contain` dentro do bbox com `padding`.
- T: exporta PNG com dimensões `width×height`.

**Slice 7 — Branch A (reusar clean_background)**
- T: `generate-from-template` com `background_mode='reuse'` → baixa `clean_background.png`, compõe, sobe em `content-images`. 0 chamadas IA.

**Slice 8 — Branch B (novo fundo)**
- T: `background_mode='new'` + `background_prompt` → Art Director enriquece → Gemini image gera fundo sem texto → compõe.
- T: aspect ratio do prompt = `width:height` do template.

**Slice 9 — Compliance + finalização**
- T: cada `zone_values` passa por `complianceCheck` antes do desenho; bloqueio → 422 com motivo, sem debitar.
- T: sucesso → debita `TEMPLATE_IMAGE=4`, cria `actions(type='template_image', details, result)`, dispara `generate-caption`.

**Slice 10 — Guardrails**
- T: Branch B nunca recebe instrução de desenhar texto (snapshot do prompt).
- T: logo nunca passa por IA (composição usa `brands.logo` diretamente).

### Detalhes técnicos

- `corsHeaders` mantido como já está no projeto (não usar `npm:@supabase/supabase-js@2/cors` para não quebrar padrão).
- Backoff: exponencial 500ms→1s→2s, respeita `Retry-After`. Fail-fast em 4xx.
- Cache de fontes em memória: `Map<string, Uint8Array>` por invocação. Bucket é a camada persistente.
- Auto-shrink: usa `ctx.measureText` para validar largura; respeita `max_chars` se presente.
- `templates_test.ts` (já existente) permanece intocado.
- Verificação: `supabase--test_edge_functions` rodando os `*_test.ts` novos + lint.

### Riscos conhecidos
- `@napi-rs/canvas` em Deno via `npm:` — se falhar em runtime, fallback é `skia-canvas`. Decisão à vista do primeiro erro (não autônomo: paro e pergunto).
- `pdfjs-dist` em Deno pode exigir polyfill de canvas para `getViewport().render()` — se quebrar, paro e pergunto se aceita fallback (só PNG no MVP).

### Fora do escopo
- Frontend (ADR 0002).
- Telemetria/observabilidade adicional.
- Cleanup de fontes órfãs do bucket.

### O que preciso confirmar antes de codar
1. **Bucket `template-fonts` privado** — ok criar? (não exibe lista de buckets para o usuário, só confirmo o nome).
2. **`background_mode` na API** — aceito `'reuse' | 'new'` no body de `generate-from-template`, com `background_prompt` obrigatório só no `'new'`. Pode ser?
3. **Compliance bloqueia sem debitar** — se qualquer zona falhar em `complianceCheck`, retorno 422 *antes* de chamar IA/Canvas. Confirma?
4. **Caption automático** — disparar `generate-caption` no fim do `generate-from-template` é parte do MVP (ADR diz que sim). Confirma?
