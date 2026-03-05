

# Plano: Garantir que o prompt do usuário é preservado na geração

## Problema Identificado

No fluxo atual em `generate-quick-content/index.ts`, o prompt do usuário passa pelo **LLM Refiner** (`expandBriefing`) que o transforma numa descrição cinematográfica. O resultado substitui completamente o texto original do usuário (linha 210):

```
const visualDescription = briefingResult.expandedPrompt || prompt;
```

O prompt final enviado ao modelo de imagem é `visualDescription + suffixos de estilo`, sem incluir o texto original. Se o Refiner interpretar mal o pedido, o modelo nunca vê o que o usuário realmente escreveu.

## Solução

Modificar a construção do prompt final para **sempre incluir o pedido original do usuário como instrução primária**, usando a expansão do Refiner apenas como enriquecimento complementar.

### Mudança em `supabase/functions/generate-quick-content/index.ts`

Na seção de construção do prompt final (~linha 226), alterar de:

```
let userPrompt = `${imageRolePrefix}${visualDescription}, ${promptSuffix}`;
```

Para:

```
let userPrompt = `${imageRolePrefix}INSTRUÇÃO PRINCIPAL: ${cleanInput(prompt)}\n\nDETALHES VISUAIS: ${visualDescription}, ${promptSuffix}`;
```

Isto garante que:
1. O texto exato do input do usuário aparece primeiro como **instrução principal**
2. A expansão do Refiner complementa com detalhes visuais cinematográficos
3. Se o Refiner falhar, o prompt original continua presente

### Arquivo afetado
- `supabase/functions/generate-quick-content/index.ts` — ~1 linha alterada

