
# Refatoracao Completa do Pipeline de Geracao e Revisao de Imagens

## Resumo

Adaptar os 4 edge functions (`generate-image`, `generate-quick-content`, `edit-image`, `expandBriefing`) para seguir a arquitetura documentada no `IMAGE_PIPELINE_DOCUMENTATION.md`, implementando um pipeline de 3 etapas que garante que o modelo de imagem respeite as instrucoes do usuario.

**Nota importante:** O documento referencia campos politicos (`political_role`, `political_party`, etc.) e uma shared `politicalProfile.ts` que NAO existem no projeto atual. A tabela `profiles` nao possui esses campos. O plano adapta a arquitetura documentada ao sistema existente, sem criar campos/tabelas politicas que nao existem.

---

## Arquitetura Proposta (3 Etapas)

```text
Frontend Form Data
       |
       v
STEP 1: LLM Refiner (Gemini Flash via Lovable AI Gateway)
  - Recebe briefing estruturado + descricao bruta do usuario
  - Retorna JSON: { briefing_visual, headline, subtexto }
       |
       v
STEP 2: Master Prompt Builder (buildDirectorPrompt)
  - 6 secoes estruturadas com TODOS os dados contextuais
  - Gerado APENAS para consumo do modelo de imagem
       |
       v
STEP 3: Image Generation (Gemini 3 Pro Image Preview via Lovable AI Gateway)
  - Recebe master prompt + imagens de referencia (max 3)
  - Retry logic: 3 tentativas com 2s delay
  - Extracao de imagem em 3 formatos (images[], content[], inlineData)
```

---

## Mudancas por Arquivo

### 1. `supabase/functions/_shared/expandBriefing.ts` -> Refatorar como "LLM Refiner" (Step 1)

**O que muda:**
- Trocar de chamada direta ao Gemini API para chamada via **Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1/chat/completions`)
- Usar modelo `google/gemini-3-flash-preview` em vez de `gemini-2.5-flash`
- Autenticacao via `LOVABLE_API_KEY` (ja existe como secret)
- System prompt reescrito como "Estrategista de Marketing Senior" que transforma dados brutos em briefing visual cinematografico
- Input: recebe descricao bruta + contexto consolidado do formulario (marca, tema, persona, plataforma, tom, tipo de conteudo)
- Output: JSON com `{ briefing_visual, headline, subtexto }` em vez de texto puro
- Adicionar mapeamento de tom visual (combativo, didatico, emocional, institucional) -> parametros visuais (lighting, composition, contrast, focus)
- Temperatura: 0.7, formato de resposta JSON estrito

### 2. `supabase/functions/generate-image/index.ts` -> Pipeline de 3 Etapas Completo

**O que muda:**

**Step 1 - Busca de dados completos no banco:**
- Buscar dados COMPLETOS da marca (incluindo `goals`, `promise`, `restrictions`, `logo`, `moodboard`, `reference_image`, `brand_color`)
- Buscar dados completos do tema (`macro_themes`, `expected_action`, `best_formats`, `hashtags`)
- Buscar dados completos da persona (`location`, `challenges`, `interest_triggers`, `purchase_journey_stage`, `beliefs_and_interests`)
- Buscar em paralelo usando `Promise.all`

**Step 2 - Chamar o LLM Refiner (expandBriefing atualizado):**
- Passar todos os dados contextuais consolidados
- Receber `{ briefing_visual, headline, subtexto }`

**Step 3 - Construir Master Prompt (`buildDirectorPrompt`):**
Nova funcao com 6 secoes baseada na documentacao:
1. ROLE: "Consultor de Marketing e Designer de Campanha de Alto Nivel"
2. CONTEXTO DO UTILIZADOR E MARCA: dados completos da marca + persona + cores
3. DIRETRIZES ESTRATEGICAS: fase, objetivo, publico, tom, tema estrategico
4. COMPOSICAO DA IMAGEM: descricao enriquecida do Step 1 + estilo visual + iluminacao + composicao + plataforma + tipo conteudo
5. TEXTO E DESIGN: se includeText=true, bloco com instrucao de tipografia perfeita; se false, instrucao "SEM TEXTO"
6. ESPECIFICACOES TECNICAS: formato, resolucao, compliance etico (CONAR/CDC)

**Step 4 - Geracao da imagem:**
- Trocar de chamada direta Gemini API para **Lovable AI Gateway**
- Usar modelo `google/gemini-3-pro-image-preview` (melhor qualidade que `gemini-2.5-flash-image`)
- Montar `messageContent` com texto + imagens de referencia (max 2 marca + 1 estilo)
- Adicionar instrucao de papeis das imagens no inicio do prompt
- Extracao de imagem com suporte a 3 formatos de resposta (gateway retorna diferente do Gemini direto)
- Retry logic: 3 tentativas, 2s delay, sem retry em 429/402
- Upload para Storage + deducao de creditos

**Step 5 - Resposta enriquecida:**
- Retornar `{ imageUrl, description, headline, subtexto, actionId, success }`
- Salvar headline e subtexto no campo `result` da action

### 3. `supabase/functions/generate-quick-content/index.ts` -> Mesma Arquitetura Simplificada

**O que muda:**
- Aplicar o mesmo pipeline de 3 etapas mas de forma simplificada (quick content nao tem texto na imagem, tipografia, etc.)
- Trocar para Lovable AI Gateway para geracao de imagem
- Usar `google/gemini-3-pro-image-preview` para melhor qualidade
- Buscar dados completos de marca/tema/persona do banco (atualmente busca parcial)
- Limitar imagens: max 2 marca + 1 estilo
- Adicionar `imageRolePrefix` com instrucao de papeis
- Negative prompt sempre inclui `text, watermark, typography, letters, signature, words, labels`
- Extracao de imagem com suporte a 3 formatos
- Retry logic igual ao generate-image
- Upload para Storage (atualmente retorna base64 direto — mudar para upload e retornar publicUrl)

### 4. `supabase/functions/edit-image/index.ts` -> Migrar para Lovable AI Gateway

**O que muda:**
- Trocar de chamada direta Gemini API para **Lovable AI Gateway**
- Usar modelo `google/gemini-2.5-flash-image` (via gateway)
- O prompt `buildRevisionPrompt` ja esta bom, manter a estrutura atual
- Adicionar retry logic (3 tentativas, 2s delay)
- Extracao de imagem com suporte a 3 formatos do gateway

### 5. Frontend: `src/pages/CreateImage.tsx`

**O que muda:**
- Adicionar campos `brandId`, `themeId`, `personaId` ao request (enviar IDs para busca completa no backend, nao apenas nomes)
- Processar novos campos na resposta: `headline`, `subtexto`
- Passar esses dados para a pagina de resultado

### 6. Deploy de Edge Functions

Redeployar: `generate-image`, `generate-quick-content`, `edit-image`

---

## Detalhes Tecnicos

### Formato de chamada ao Lovable AI Gateway

```typescript
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${LOVABLE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'google/gemini-3-pro-image-preview',
    messages: [{ role: 'user', content: messageContent }],
    modalities: ['image', 'text'],
  }),
});
```

### Extracao de imagem (3 formatos)

```typescript
const data = await response.json();
const message = data.choices?.[0]?.message;
let imageUrl: string | null = null;

// Formato 1: message.images[]
if (message?.images?.length > 0) {
  imageUrl = message.images[0].image_url?.url;
}
// Formato 2: message.content[] (array)
if (!imageUrl && Array.isArray(message?.content)) {
  for (const part of message.content) {
    if (part.type === 'image_url') {
      imageUrl = part.image_url?.url;
      break;
    }
  }
}
// Formato 3: candidates[].content.parts[].inlineData
if (!imageUrl && data.candidates?.[0]?.content?.parts) {
  for (const part of data.candidates[0].content.parts) {
    if (part.inlineData?.data) {
      imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      break;
    }
  }
}
```

### Resposta JSON do Step 1 (Refiner)

```typescript
interface RefinerOutput {
  briefing_visual: string;  // Descricao cinematografica enriquecida
  headline: string;         // Texto principal sugerido (max 10 palavras)
  subtexto: string;         // CTA ou texto secundario (max 15 palavras)
}
```

### Secao de Texto na Imagem (Step 2 Master Prompt)

Se `includeText = true`:
```text
### 4. TEXTO E DESIGN
- Headline: Renderize PERFEITAMENTE o texto: "${textContent}"
- Tipografia: ${fontStyle}
- Posicao: ${textPosition}. O texto NAO deve obstruir o rosto.
- Legibilidade: O texto DEVE ser o foco principal e 100% legivel.
  Utilize espaco negativo, sobreposicoes de gradiente sutil ou caixas de texto limpas.
```

Se `includeText = false`:
```text
- SEM TEXTO: NAO inclua NENHUM texto, palavras, letras, numeros ou simbolos.
```

### Campos adicionais enviados ao backend (CreateImage.tsx)

```typescript
const requestData = {
  // IDs para busca completa (JA existem no request atual)
  brandId: formData.brand,  // UUID
  themeId: formData.theme,  // UUID  
  personaId: formData.persona, // UUID
  // ... demais campos ja existentes
};
```

---

## Arquivos Modificados

1. `supabase/functions/_shared/expandBriefing.ts` — Reescrever como LLM Refiner via Lovable AI Gateway
2. `supabase/functions/generate-image/index.ts` — Pipeline 3 etapas completo via Gateway
3. `supabase/functions/generate-quick-content/index.ts` — Pipeline 3 etapas simplificado via Gateway + upload Storage
4. `supabase/functions/edit-image/index.ts` — Migrar para Lovable AI Gateway
5. `src/pages/CreateImage.tsx` — Processar headline/subtexto na resposta
6. Deploy das 3 edge functions
