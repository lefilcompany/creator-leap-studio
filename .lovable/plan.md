

# Plano: Unificar generate-quick-content com o pipeline do generate-image

## Resumo

O `generate-quick-content` (569 linhas) usa um pipeline simplificado com modelo Flash e prompt flat. O `generate-image` (1190 linhas) usa um pipeline completo com `buildBriefingDocument()`, `buildDirectorPrompt()`, modelo Pro com fallback, timeout de 90s e suporte a texto na imagem. Vamos reescrever o quick content para usar exatamente o mesmo pipeline.

## Diferenças-chave atuais

| Aspecto | generate-image | generate-quick-content |
|---------|---------------|----------------------|
| Briefing | `buildBriefingDocument()` estruturado | Inline simplificado |
| Prompt | `buildDirectorPrompt()` com 7 seções | Prompt flat |
| Modelo | `gemini-3-pro-image-preview` + fallback Flash | `gemini-2.5-flash-image` sem fallback |
| Timeout | 90s com AbortController | Sem timeout |
| Art Director | Gera headline/subtexto/legenda | Ignora headline/legenda |
| Texto | Suporte completo (tipografia, CTA, design styles) | Nunca inclui texto |
| Negative prompt | Composição inteligente | Fixo + "no text" sempre |

## Etapas

### 1. Criar `supabase/functions/_shared/imagePromptBuilder.ts`

Extrair do `generate-image/index.ts` as seguintes funções e constantes:
- `cleanInput()`, `normalizeImageArray()`
- `FONT_STYLES`, `TEXT_DESIGN_PROMPTS`, `PLATFORM_ASPECT_RATIO`
- `getStyleSettings()`
- `isPortraitRequest()`
- `buildBriefingDocument()`
- `buildDirectorPrompt()`
- `extractImageFromResponse()`
- `convertToGeminiParts()`

### 2. Atualizar `generate-image/index.ts`

Remover as funções/constantes extraídas e importar do módulo compartilhado. O handler (serve) permanece inalterado.

### 3. Reescrever `generate-quick-content/index.ts`

Substituir o pipeline atual para usar as funções compartilhadas:
- Usar `buildBriefingDocument()` para o briefing (mapeando `prompt` -> `description`)
- Usar `expandBriefing()` com parâmetros completos (incluindo headline/legenda)
- Usar `buildDirectorPrompt()` para o prompt final (com `includeText: false` por padrão)
- Usar modelo `gemini-3-pro-image-preview` como primário com fallback para `gemini-2.5-flash-image`
- Usar timeout de 90s com AbortController
- Retornar headline/subtexto/legenda do Art Director no resultado

**Mantém inalterado:**
- Custo de créditos: `QUICK_IMAGE` (3) vs `COMPLETE_IMAGE` (8)
- Tipo de ação: `CRIAR_CONTEUDO_RAPIDO`
- Parâmetros de entrada (backward compatible)
- Modo marketplace

## Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/_shared/imagePromptBuilder.ts` | **Novo** — funções compartilhadas |
| `supabase/functions/generate-image/index.ts` | Refatorar — importar do shared |
| `supabase/functions/generate-quick-content/index.ts` | Reescrever — usar pipeline completo |

## Detalhes técnicos

- Importação via caminho relativo: `../_shared/imagePromptBuilder.ts`
- O quick content passará a enviar `formData`-like ao `buildBriefingDocument` mapeando os campos existentes (`prompt` -> `description`, etc.)
- O resultado do quick content incluirá `headline`, `subtexto` e `legenda` gerados pelo Art Director
- Nenhuma mudança no frontend necessária — os campos extras são adicionais e opcionais

