

# Forçar Dimensões da Imagem pela Plataforma Selecionada

## Problema

Quando o usuário seleciona uma plataforma (ex: Instagram 4:5), o aspect ratio é mencionado apenas como texto no prompt. O modelo Gemini ignora isso e gera a imagem no tamanho da imagem de referência. Não há enforcement real das dimensões.

## Solução

Adicionar uma instrução de aspect ratio **muito mais enfática** no prompt E, principalmente, usar o campo `aspectRatio` que já é enviado pelo frontend para incluir instruções de dimensão obrigatórias no prompt final. Isso se aplica a ambas as edge functions: `generate-image` e `generate-quick-content`.

## Mudanças

### 1. `supabase/functions/generate-image/index.ts`

- Receber `formData.aspectRatio` do frontend (já é enviado pelo `CreateImage.tsx` na linha 731)
- Mapear o aspect ratio para dimensões exatas usando um lookup (ex: `4:5` → `1080x1350`)
- Adicionar uma **instrução obrigatória de dimensão** no topo do prompt final, ANTES de tudo:
  ```
  ⚠️ DIMENSÃO OBRIGATÓRIA: A imagem DEVE ser gerada com proporção EXATA de {aspectRatio} ({width}x{height}px). 
  IGNORE as proporções de qualquer imagem de referência. O OUTPUT deve ter EXATAMENTE esta proporção.
  ```
- Atualizar a seção "ESPECIFICAÇÕES TÉCNICAS" (seção 6/7) do `buildDirectorPrompt` para incluir a dimensão obrigatória
- Adicionar parâmetro `aspectRatio` e `targetDimensions` ao `buildDirectorPrompt`

### 2. `supabase/functions/generate-quick-content/index.ts`

- Já recebe `aspectRatio` do frontend e normaliza (linha 114-124)
- Adicionar a mesma instrução obrigatória de dimensão no prompt, antes de tudo
- Reforçar no negative prompt: "do not follow reference image dimensions"

### 3. Mapeamento de Aspect Ratio → Dimensões

Criar constante compartilhada:
```typescript
const ASPECT_RATIO_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
  '1.91:1': { width: 1200, height: 630 },
  '3:4': { width: 1080, height: 1440 },
  '2:3': { width: 1080, height: 1620 },
};
```

### 4. `buildDirectorPrompt` (dentro de `generate-image/index.ts`)

- Adicionar parâmetro `aspectRatio` e `targetWidth`/`targetHeight`
- Na seção de COMPOSIÇÃO (seção 3), trocar a linha genérica de plataforma por instrução enfática de dimensão
- Na seção de ESPECIFICAÇÕES TÉCNICAS, reforçar a proporção obrigatória

### Arquivos modificados:
1. `supabase/functions/generate-image/index.ts` — instrução de dimensão obrigatória no prompt + parâmetro no buildDirectorPrompt
2. `supabase/functions/generate-quick-content/index.ts` — mesma instrução de dimensão obrigatória

