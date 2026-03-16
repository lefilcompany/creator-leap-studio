

# Plano: Pós-processamento obrigatório de dimensões e isolamento de referências

## Problema
O Gemini ignora o `imageConfig.aspectRatio` quando recebe imagens de referência, copiando as proporções delas. O enforcement atual é apenas via prompt text + config API, mas não há garantia de que a saída tenha as dimensões exatas.

## Solução
Adicionar **pós-processamento server-side obrigatório** (center-crop + resize) após a geração, e melhorar o frontend para exibir/enviar `width`/`height` junto com `aspectRatio`.

---

## Mudanças

### 1. Frontend: `src/pages/CreateImage.tsx`

- Adicionar `aspectRatio` ao `FormData` interface (já existe implicitamente via `setFormData`, mas formalizar)
- Na resolução do `effectiveAspectRatio` (linha ~406), usar prioridade: `formData.width/height` derivado > `formData.aspectRatio` do PlatformSelector > platform fallback > `'1:1'`
- Enviar `width` e `height` explícitos no `requestData` usando `ASPECT_RATIO_DIMENSIONS` local (copiar do backend ou importar de `platformSpecs`)
- Exibir badge com formato final no UI: ex. `"1080×1350 (4:5)"` próximo ao seletor de plataforma
- Marcar referências com flag `referenceRole: 'style'` (já feito implicitamente, mas tornar explícito no payload)

### 2. Frontend: `src/pages/CreateContent.tsx`

- Mesmo ajuste: garantir `width`, `height`, `aspectRatio` no payload

### 3. Backend: `supabase/functions/generate-image/index.ts`

**3a. Resolução de aspect ratio melhorada (já existe, refinar):**
- Prioridade: `formData.aspectRatio` > derivar de `formData.width/height` > platform fallback > `'1:1'`
- Log estruturado: `rawAspectRatio`, `normalizedAspectRatio`, `geminiAspectRatio`

**3b. Instrução reforçada no prompt:**
- Adicionar ao `imageRolePrefix`: "As imagens de referência servem APENAS para paleta, identidade visual e estilo. IGNORE COMPLETAMENTE as proporções/dimensões das referências."

**3c. Pós-processamento obrigatório (NOVO - núcleo da solução):**
- Após extrair `imageUrl` do Gemini (Step 5), antes do upload (Step 6):
  - Decodificar base64 para `Uint8Array`
  - Usar **canvas offscreen via Deno** não é viável → usar abordagem alternativa: chamar a API Gemini novamente para resize/crop, OU implementar crop via manipulação de bytes PNG/JPEG
  - **Abordagem prática**: Usar o módulo `sharp` não disponível em Deno. Alternativa: usar a biblioteca `imagescript` (Deno-compatible) para center-crop + resize
  - Implementar: `import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts'`
  - Center-crop para o aspect ratio alvo, depois resize para `targetWidth x targetHeight`
  - Upload a imagem pós-processada (não a crua)

**3d. Metadados na resposta:**
- Retornar `finalWidth`, `finalHeight`, `finalAspectRatio`, `requestedAspectRatio` no JSON de resposta
- Salvar esses metadados no campo `result` da action

**3e. Fallback de upload:**
- Se upload falhar, retornar base64 já pós-processado

### 4. Backend: `supabase/functions/generate-quick-content/index.ts`

- Mesmas mudanças de pós-processamento (center-crop + resize)
- Mesmos metadados na resposta
- Mesma instrução reforçada sobre referências

### 5. Shared utility: `supabase/functions/_shared/imagePostProcess.ts` (NOVO)

Criar utilitário compartilhado com:
```typescript
import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts';

interface PostProcessResult {
  processedData: Uint8Array;
  finalWidth: number;
  finalHeight: number;
  finalAspectRatio: string;
  wasCropped: boolean;
}

async function postProcessImage(
  imageData: Uint8Array,
  targetWidth: number,
  targetHeight: number,
  targetAspectRatio: string
): Promise<PostProcessResult>
```

Lógica:
1. Decodificar imagem (`Image.decode`)
2. Calcular crop region (center-crop para aspect ratio alvo)
3. Crop
4. Resize para dimensões exatas
5. Encode como PNG
6. Retornar com metadados

### 6. Frontend: exibição do formato final

- Abaixo do `PlatformSelector`, mostrar badge: `"Formato final: 1080×1350 (4:5)"`
- Atualizar dinamicamente quando plataforma ou tipo de conteúdo muda

---

## Arquivos modificados

| Arquivo | Tipo |
|---|---|
| `src/pages/CreateImage.tsx` | Editar |
| `src/pages/CreateContent.tsx` | Editar |
| `supabase/functions/_shared/imagePostProcess.ts` | **Criar** |
| `supabase/functions/generate-image/index.ts` | Editar |
| `supabase/functions/generate-quick-content/index.ts` | Editar |

## Critérios de aceite cobertos

- Ref vertical + formato 1:1 → saída 1080×1080 ✓ (center-crop + resize)
- Ref quadrada + formato 9:16 → saída 1080×1920 ✓
- Metadados `finalWidth/finalHeight/finalAspectRatio` sempre presentes ✓
- Logs com `rawAspectRatio`, `normalizedAspectRatio`, `geminiAspectRatio`, dimensões pós-processadas ✓
- Sem regressão nos dois fluxos (completo + rápido) ✓

