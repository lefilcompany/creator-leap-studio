

# Refatoracao do Pipeline de Geracao de Imagem

## Problema Atual

O `generate-image/index.ts` envia um prompt gigante com tags estruturadas (`[COMPLIANCE]`, `[BRAND CONTEXT]`, `[INSTRUCTION]`, etc.) diretamente para o modelo de imagem. Alem disso, concatena o briefing expandido com o prompt original de forma redundante, e envia ate 5+ imagens de referencia que diluem o resultado. O modelo de imagem recebe instrucoes textuais longas em vez de descricoes visuais puras.

## Arquitetura Proposta

```text
Formulario -> buildBriefingDocument() -> expandBriefing (LLM texto) -> Prompt Visual Puro + Style Suffix + Negative Prompt -> Gemini Image API
```

O LLM de texto (expandBriefing) sera o unico responsavel por digerir TODOS os metadados e retornar uma descricao visual pura em ingles.

## Mudancas Detalhadas

### 1. Renomear `buildDetailedPrompt` para `buildBriefingDocument`

Esta funcao deixa de gerar o prompt final para o modelo de imagem. Passa a gerar um **documento de briefing interno** que sera lido apenas pelo LLM de texto (Gemini Flash). O documento tera formato legivel (sem tags como `[COMPLIANCE]`, `[INSTRUCTION]`), contendo todas as informacoes contextuais: marca, persona, plataforma, tom, tipo de conteudo, configuracoes visuais avancadas, instrucoes de texto, etc. Este documento nunca sera enviado ao modelo de imagem.

### 2. Atualizar `expandBriefing.ts`

Ajustar o system prompt para instruir o LLM a:
- Receber o documento de briefing completo como input
- Retornar APENAS uma descricao visual pura em ingles (paragrafo hiperdescritivo ou tags separadas por virgula)
- Nao incluir tags, marcadores, titulos ou instrucoes
- Incorporar compliance, persona, plataforma diretamente na descricao visual
- Quando houver texto na imagem, usar sintaxe simples: `Include text overlay exactly reading "TEXTO" in modern typography`
- Quando nao houver texto, nao mencionar nada sobre texto (a restricao vai no negative prompt)

### 3. Reestruturar o fluxo no `generate-image/index.ts`

**Antes:**
1. `buildDetailedPrompt()` gera prompt estruturado com tags
2. `expandBriefing()` recebe campos individuais separadamente
3. Resultado expandido e concatenado com o prompt original e injetado no prompt estruturado
4. Tudo enviado ao modelo de imagem

**Depois:**
1. `buildBriefingDocument()` gera documento de briefing legivel (so para o LLM)
2. `expandBriefing()` recebe o documento completo e retorna descricao visual pura
3. Prompt final = `expandedVisualPrompt + ", " + styleSuffix`
4. Negative prompt = `styleNegativePrompt + ", text, signature, watermark, words, typography, spelling"` (quando sem texto)
5. Apenas este prompt limpo + negative prompt + imagens limitadas sao enviados ao modelo de imagem

### 4. Limitar imagens de referencia

- `preserveImages` (marca): maximo 2 imagens (as primeiras)
- `styleReferenceImages`: maximo 1 imagem
- Comentario no codigo explicando que multiplas imagens causam diluicao do prompt
- Total maximo: 3 imagens de referencia

### 5. Tratamento de texto na imagem

- Remover o bloco `[NO TEXT]` com instrucoes longas do prompt
- Quando `includeText = false`: adicionar `text, signature, watermark, words, typography, spelling` ao negative prompt
- Quando `includeText = true`: o LLM de texto incluira na descricao visual: `Include text overlay exactly reading "TEXTO" in modern typography`

## Arquivos Modificados

1. **`supabase/functions/generate-image/index.ts`** - Refatoracao completa do fluxo: nova funcao `buildBriefingDocument`, simplificacao do pipeline, limitacao de imagens, prompt limpo para o modelo
2. **`supabase/functions/_shared/expandBriefing.ts`** - Atualizar system prompt para aceitar documento de briefing completo e retornar apenas descricao visual pura; atualizar interface para receber o briefing document como string unica em vez de campos individuais

## Detalhes Tecnicos

### Nova interface do expandBriefing

```typescript
interface BriefingExpansionInput {
  briefingDocument: string;  // Documento completo gerado por buildBriefingDocument
  visualStyle: string;       // Para referencia do estilo
}
```

### Formato do prompt final enviado ao Gemini Image

```text
[descricao visual pura do LLM em ingles, ~200-400 palavras], [style suffix do estilo selecionado]
```

### Formato do negative prompt

```text
[negative prompt do estilo] + text, signature, watermark, words, typography, spelling (quando sem texto)
```

### Payload final para Gemini Image API

```typescript
contents: [{
  parts: [
    { text: finalCleanPrompt },       // Descricao visual + style suffix
    ...limitedReferenceImages          // Max 3 imagens
  ]
}],
generationConfig: {
  responseModalities: ["IMAGE", "TEXT"]
}
```

