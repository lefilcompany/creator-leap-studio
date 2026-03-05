

## Plano: Agente de Enriquecimento de Prompt (Prompt Agent)

### Situação Atual

O pipeline já existe e funciona em 3 etapas:
1. **expandBriefing** (LLM Refiner) — recebe briefing completo e retorna JSON com `briefing_visual`, `headline`, `subtexto`
2. **buildDirectorPrompt** — monta prompt final de 6 seções para o modelo de imagem
3. **Gemini Image** — gera a imagem

O `expandBriefing` já recebe todos os dados (marca, tema, persona, tons, estilo) e já usa o Gemini para enriquecer. O `buildDirectorPrompt` já monta um prompt grande e detalhado.

**O sistema já faz o que você pediu.** O usuário escreve um prompt curto e leigo, e o pipeline enriquece com todos os campos da tela.

### O Que Falta / Pode Melhorar

O pipeline atual tem um ponto fraco: o `expandBriefing` usa `gemini-2.5-flash` via API direta, mas poderia ser mais agressivo no enriquecimento. A mudança principal seria:

1. **Melhorar o system prompt do Refiner** para ser mais explícito em transformar linguagem leiga em linguagem técnica de direção de arte (termos como "golden ratio", "rim light", "bokeh", "negative space", etc.)

2. **Incluir a legenda no pipeline** — atualmente o refiner só retorna `briefing_visual`, `headline`, `subtexto`. Podemos adicionar um campo `legenda` ao output do refiner para que ele também gere uma legenda otimizada para a plataforma.

3. **Feedback visual no frontend** — mostrar ao usuário que seu prompt está sendo "enriquecido por IA" antes da geração.

### Mudanças Propostas

#### 1. `supabase/functions/_shared/expandBriefing.ts`
- Reescrever o system prompt para enfatizar a transformação de linguagem leiga → técnica
- Adicionar campo `legenda` ao output (legenda para a plataforma, com hashtags do tema)
- Adicionar exemplos de transformação no prompt (few-shot) para o modelo entender o padrão
- Manter `gemini-2.5-flash` via API direta (já funciona, GEMINI_API_KEY existe)

#### 2. `supabase/functions/generate-image/index.ts`
- Propagar o novo campo `legenda` do refiner para o resultado final
- Salvar a legenda no campo `result` da action junto com headline/subtexto
- Retornar `legenda` na resposta JSON

#### 3. `src/pages/CreateImage.tsx`
- Processar o novo campo `legenda` na resposta
- Passar para a página de resultado (ContentResult)

#### 4. `src/pages/ContentResult.tsx`
- Exibir a legenda gerada pelo agente (se existir) como texto copiável abaixo da imagem

### Detalhes Técnicos

**Novo output do Refiner:**
```typescript
interface RefinerOutput {
  briefing_visual: string;  // Descrição cinematográfica (200-400 palavras)
  headline: string;         // Texto principal (max 10 palavras)
  subtexto: string;         // CTA (max 15 palavras)
  legenda: string;          // Legenda para a plataforma (com hashtags)
}
```

**Exemplo de transformação que o agente fará:**
- Input do usuário: "foto de uma mulher tomando café"
- Output do agente: "Uma fotografia cinematográfica em close-up, capturada com lente 85mm f/1.4, de uma mulher jovem segurando delicadamente uma xícara de café artesanal. Iluminação golden hour lateral suave criando rim light nos cabelos. Profundidade de campo rasa com bokeh cremoso ao fundo. Paleta warm tones com âmbar, marrom café e bege. Expressão serena de contemplação..."

### Arquivos Modificados
1. `supabase/functions/_shared/expandBriefing.ts` — Melhorar system prompt + adicionar `legenda`
2. `supabase/functions/generate-image/index.ts` — Propagar `legenda` no resultado
3. `src/pages/CreateImage.tsx` — Processar `legenda` na resposta
4. `src/pages/ContentResult.tsx` — Exibir legenda copiável

