
Objetivo: impedir que imagens de referência ditem o formato final; o formato deve sempre seguir a plataforma selecionada.

Diagnóstico confirmado (código + runtime):
- A função `generate-image` já tenta aplicar `imageConfig.aspectRatio`, mas recebe `aspectRatio` como `undefined`.
- No request real capturado para `generate-image`, o payload não inclui `aspectRatio`.
- Em `src/pages/CreateImage.tsx`, o `requestData` enviado para `generate-image` não contém `aspectRatio`.
- Em `src/pages/CreateContent.tsx` (fluxo legado que também chama `generate-image`), também não envia `aspectRatio`.
- Resultado: sem `imageConfig.aspectRatio`, o modelo tende a copiar proporção da imagem de referência.

Plano de implementação:

1) Corrigir envio do `aspectRatio` no frontend (fonte principal do bug)
- Arquivo: `src/pages/CreateImage.tsx`
  - Adicionar `aspectRatio` no estado/form tipado.
  - Sempre calcular ratio efetivo da plataforma com `getPlatformImageSpec(platform, "feed", contentType)`.
  - Incluir `aspectRatio` no `requestData` enviado para `generate-image`.
  - Recalcular `aspectRatio` também quando trocar `contentType` (orgânico/ads), para evitar ratio stale.
- Arquivo: `src/pages/CreateContent.tsx`
  - Mesmo ajuste: manter `aspectRatio` no estado e enviar no `requestData` de `generate-image`.
  - No `handleSelectChange("platform")` e no toggle de `contentType`, atualizar ratio efetivo.

2) Adicionar fallback robusto no backend (proteção contra clientes antigos)
- Arquivo: `supabase/functions/generate-image/index.ts`
  - Criar resolução única de aspect ratio:
    - prioridade 1: `formData.aspectRatio` recebido
    - prioridade 2: fallback por `platform + contentType` (mapa compatível com valores reais do frontend: `Instagram`, `Facebook`, `TikTok`, `LinkedIn`, `Twitter/X`, `Comunidades`)
    - prioridade 3: `'1:1'`
  - Usar esse ratio resolvido em:
    - `dimensionPrefix` do prompt
    - `buildDirectorPrompt` (`aspectRatio`)
    - `generationConfig.imageConfig.aspectRatio` (normalizado para valores suportados pelo Gemini)
  - Melhorar log para depuração: ratio final + origem (`request` | `platform_fallback` | `default`).

3) Compatibilidade adicional (opcional, mas recomendado)
- Arquivo: `supabase/functions/generate-quick-content/index.ts`
  - Manter comportamento atual e só adicionar fallback por `platform` caso `aspectRatio` venha ausente.
  - Isso evita regressão em chamadas externas/antigas.

Validação após implementação:
- Teste 1: Instagram + referência 16:9 → saída deve ser 4:5.
- Teste 2: TikTok + referência 1:1 → saída deve ser 9:16.
- Teste 3: Facebook/LinkedIn para garantir fallback de plataforma.
- Verificar logs da função:
  - presença de `Aspect ratio: 4:5 -> Gemini: 4:5`
  - presença da origem (`request` ou `platform_fallback`).
- Confirmar dimensões finais da imagem no resultado (não apenas prompt/log).

Arquivos-alvo:
- `src/pages/CreateImage.tsx`
- `src/pages/CreateContent.tsx`
- `supabase/functions/generate-image/index.ts`
- `supabase/functions/generate-quick-content/index.ts` (fallback opcional recomendado)

Sem mudanças de banco de dados necessárias.
