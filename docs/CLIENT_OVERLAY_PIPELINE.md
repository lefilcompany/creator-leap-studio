# Client-side Text Overlay Pipeline (v1)

## Contexto

A Edge Function `generate-image` estava sofrendo HTTP **546** (Deno Deploy: "CPU
time exceeded") porque executava, no worker, todo o pipeline pesado:

```
Gemini → decode PNG (WASM) → crop → resize → encode → SVG overlay → encode → upload
```

Com 1080×1350 essa cadeia estoura o budget de CPU do Edge Runtime.

## Solução (arquitetura b — overlay no cliente)

1. **`generate-image`** (Edge): auth → compliance → Gemini no aspect ratio nativo
   → upload dos bytes crus → cria `actions` com `overlay_status='pending'` (ou
   `'not_needed'`) → retorna `{ imageUrl, actionId, needsClientOverlay, overlayPayload }`.
   Nenhum processamento de pixels no servidor.
2. **Cliente** (`src/lib/finalizeOverlay.ts`): se `needsClientOverlay=true`, roda
   `composeImageOverlay` (Canvas 2D) — crop, resize, headline, subtexto, CTA,
   disclaimer — e envia base64 para o endpoint de finalização.
3. **`finalize-image-overlay`** (Edge): apenas decodifica base64 → upload → marca
   `overlay_status='applied'`. Idempotente e sem cobrança de créditos.

## Contratos

### `POST /functions/v1/generate-image`
- Débito de créditos **acontece uma única vez**, no Step 8, depois de Gemini +
  upload. Falhas antes disso retornam 4xx/5xx sem cobrar o usuário.
- Resposta inclui `overlayPayload` (fontes, posição, cores, dimensões alvo) e
  `needsClientOverlay: boolean`.

### `POST /functions/v1/finalize-image-overlay`
- Body: `{ actionId: uuid, finalImageBase64: string }`.
- 401 sem token, 403 se o `user_id` da action difere, 404 se não existe.
- Idempotente: se `overlay_status='applied'`, devolve a URL atual sem re-upload.
- **Nunca** cobra crédito. Falhas mantêm a imagem crua original intacta.

## Robustez do cliente

`src/lib/clientImageOverlay.ts`:
- `loadImage` faz fallback CORS via `fetch → Blob URL` quando o CDN não retorna
  headers CORS (senão o Canvas ficaria tainted).
- `ensureFontsReady` pré-carrega peso/tamanho via `document.fonts.load` para não
  cair no fallback sans-serif do sistema.

`src/lib/finalizeOverlay.ts`:
- Nunca lança. Se compose ou upload falhar, retorna a `imageUrl` crua original.
- 1 retry automático em erros 5xx / rede, backoff 400 ms.

## Observabilidade

- Coluna nova em `actions`: `overlay_status ∈ {pending, applied, failed, not_needed}`.
- Página `/system/logs` exibe `OverlayFailuresCard` com contagem 24h/7d e as 5
  falhas mais recentes.

## Testes

```
supabase--test_edge_functions { functions: ["generate-image", "finalize-image-overlay"] }
```

Cobrem:
- Preflight CORS.
- 401 sem auth (garante que nenhum crédito é debitado).
- Validação de payload antes de qualquer efeito colateral.
- Idempotência de `finalize-image-overlay`.

## Ainda em aberto

- Migrar `generate-quick-content` para o mesmo padrão (ainda usa `postProcessImage`
  WASM no servidor).
- E2E Playwright completo (`/criar-conteudo` → verificar `overlay_status='applied'`).
- Se o Gemini em si passar a ter latência > CPU budget, migrar para worker
  externo (arquitetura "a") — a Edge Function já está no mínimo possível.
