

# Plano: Adaptar o código fornecido ao contexto do sistema (sem política)

## Análise

O código fornecido traz uma versão do `generate-image` focada em **marketing político** (TSE, candidatos, combatividade, partido, etc.). O projeto atual já possui um pipeline funcional de 3 etapas **sem contexto político**, com `expandBriefing.ts` e `generate-image/index.ts` bem estruturados.

**O que o código fornecido adiciona de valor (removendo política):**
1. `_shared/geminiClient.ts` — wrapper `callGemini()` + `extractJSON()` reutilizável
2. `FONT_STYLES` — mapeamento de estilos tipográficos (elegant, modern, fun, impactful)
3. `PLATFORM_ASPECT_RATIO` — aspect ratios por plataforma
4. `TONE_VISUAL_MAP` aprimorado com `fontHint` e `colorHint`
5. `enrichPromptWithFlash` inline — busca dados completos de marca/tema/persona e monta contexto consolidado antes de chamar o LLM

**O que já existe e funciona bem no projeto atual:**
- Pipeline de 3 etapas completo em `generate-image/index.ts`
- `expandBriefing.ts` como LLM Refiner
- `buildDirectorPrompt` com 6 seções
- Retry logic, upload Storage, deduções de créditos

## Mudanças Propostas

### 1. Criar `supabase/functions/_shared/geminiClient.ts`
Utilitário reutilizável com:
- `callGemini(apiKey, { model, messages })` — wrapper para Gemini API direta
- `extractJSON(text)` — extrai JSON de resposta de texto LLM
- Usado por `expandBriefing.ts` e futuras funções

### 2. Atualizar `supabase/functions/_shared/expandBriefing.ts`
Incorporar do código fornecido (sem política):
- Adicionar `fontHint` e `colorHint` ao `TONE_VISUAL_MAP` existente
- Enriquecer o system prompt do Refiner com dados consolidados de marca/tema/persona (contexto mais rico)
- Substituir referências a "Marketing Político" por "Estrategista de Marketing e Diretor de Arte"
- Remover: TSE, candidaturas, cargo político, partido, mandato, `focus_areas`, compliance eleitoral
- Manter: compliance ético genérico (CONAR/CDC), validação de dignidade humana

### 3. Atualizar `supabase/functions/generate-image/index.ts`
- Adicionar `FONT_STYLES` e `PLATFORM_ASPECT_RATIO` como constantes
- Incluir `fontHint` do tom selecionado no bloco de texto do `buildDirectorPrompt` (seção 4)
- Incluir aspect ratio da plataforma nas especificações técnicas (seção 6)
- Manter todo o resto intacto (pipeline já funciona)

### 4. Atualizar `supabase/functions/generate-quick-content/index.ts`
- Mesmas adições de `FONT_STYLES` e `PLATFORM_ASPECT_RATIO` para consistência

## Arquivos Modificados
1. `supabase/functions/_shared/geminiClient.ts` — **novo** (utilitário)
2. `supabase/functions/_shared/expandBriefing.ts` — enriquecer TONE_VISUAL_MAP + system prompt
3. `supabase/functions/generate-image/index.ts` — adicionar FONT_STYLES, PLATFORM_ASPECT_RATIO, usar no prompt
4. `supabase/functions/generate-quick-content/index.ts` — mesmas adições

## O que NÃO será feito
- Não criar `politicalProfile.ts`
- Não adicionar campos políticos à tabela `profiles`
- Não incluir referências a TSE, candidaturas, partidos ou compliance eleitoral
- Não substituir o `expandBriefing.ts` pelo `enrichPromptWithFlash` inline (manter modular)

