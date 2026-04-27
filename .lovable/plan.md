
# Workflow de Criação de Conteúdo com Briefing

Hoje o usuário entra em **Criar Conteúdo** e preenche um formulário grande que dispara direto a geração de imagem + legenda. Vamos transformar isso em um **fluxo guiado de 4 passos** que parte de uma ideia (briefing) e termina na geração — preservando todo o motor atual de imagem/legenda.

---

## Visão geral do novo fluxo

```text
┌────────────┐   ┌────────────────┐   ┌─────────────────┐   ┌──────────────┐
│ 1.Briefing │ → │ 2.Plano (1     │ → │ 3.Editar        │ → │ 4.Gerar      │
│ (ideia)    │   │   template +   │   │   template      │   │ (imagem +    │
│            │   │   alternativas)│   │   confirmado    │   │  legenda)    │
└────────────┘   └────────────────┘   └─────────────────┘   └──────────────┘
   marca           IA propõe          usuário ajusta         pipeline atual
   editoria        direção visual      visual / legenda       (CreateContent)
   persona         + copy + cores      cores / tom
   objetivo
   ideia inicial
```

- O **fluxo padrão** do botão "Criar Conteúdo" passa a ser este wizard.
- Há um **atalho discreto "Já sei o que quero criar"** que pula o briefing e leva direto ao formulário atual.
- Toda a etapa 4 reaproveita o que já existe em `CreateContent.tsx` (campos, geração, créditos, persistência) — não reescrevemos o motor.

---

## Backend

### 1. Nova edge function `generate-content-templates`

Recebe o briefing e devolve **1 template detalhado** (ou N alternativas quando o usuário pedir mais).

**Payload (POST):**
```json
{
  "briefingId": "uuid",
  "brandId": "uuid",
  "themeId": "uuid|null",
  "personaId": "uuid|null",
  "platform": "instagram|...",
  "objective": "string",
  "contentType": "organic|ads",
  "idea": "string longa (briefing do usuário)",
  "tone": ["inspirador", "..."],
  "additionalNotes": "string",
  "mode": "initial" | "more_alternatives",
  "existingTemplates": [...]  // só em mode=more_alternatives, p/ evitar repetição
}
```

**Saída:** array de templates com a mesma estrutura de um "post" do Calendário, **expandida com direção visual completa** para alimentar `CreateContent`:

```json
{
  "templates": [{
    "id": "uuid-local",
    "title": "...",
    "format": "Reels | Carrossel | Post estático | ...",
    "bigIdea": "...",
    "summary": "2-3 frases",
    "caption": "legenda completa pronta",
    "hashtags": ["..."],
    "cta": "...",
    "visualDirection": {
      "description": "descrição visual detalhada da imagem",
      "visualStyle": "realistic|animated|...",
      "mood": "...",
      "lighting": "...",
      "composition": "...",
      "cameraAngle": "...",
      "colorPalette": "...",
      "aspectRatio": "1:1|4:5|9:16|...",
      "imageText": { "include": false, "content": "", "position": "center" }
    }
  }]
}
```

**Lógica:**
- Valida JWT, valida briefing (não aceita campos com `xxx`, `aaa`, `...` — heurística simples + tamanho mínimo de ~30 chars na ideia).
- Carrega contexto da marca (segmento, valores, paleta), tema (tom, público) e persona (se houver).
- Chama Gemini (modelo `gemini-2.5-flash`, JSON via `responseSchema`) com prompt que reusa as diretrizes do `generate-plan` mas aprofunda a parte visual.
- Em `mode: "more_alternatives"`, envia os títulos/big ideas existentes na instrução e pede 2 variações distintas de ângulo.
- **Não cobra créditos aqui** — o briefing+plano fazem parte do pacote único (ver tabela de preços abaixo).

### 2. Nova tabela `content_briefings`

Armazena o briefing e os templates gerados, permitindo retomar e auditar:

```sql
create table public.content_briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  team_id uuid,
  brand_id uuid not null,
  theme_id uuid,
  persona_id uuid,
  platform text,
  objective text,
  content_type text default 'organic',
  idea text not null,
  tone text[] default '{}',
  additional_notes text,
  templates jsonb default '[]',           -- array de templates gerados
  selected_template_id text,              -- id do template escolhido
  edited_template jsonb,                  -- versão final após edição
  status text default 'draft',            -- draft|templates_generated|confirmed|completed
  action_id uuid,                         -- preenchido quando finaliza geração
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.content_briefings enable row level security;
-- Policies idênticas ao padrão `can_access_resource(user_id, team_id)` já em uso.
```

### 3. Modelo de créditos — pacote único

Adicionar ao `lib/creditCosts.ts` e `_shared/creditCosts.ts`:

```ts
CONTENT_BRIEFING_PACKAGE: 10  // briefing + plano + 1 imagem completa + legenda
```

- **Cobrado uma única vez**, no momento em que o usuário clica em **"Gerar conteúdo"** na etapa 4 do workflow (e não na geração dos templates).
- A edge function `generate-content-templates` é gratuita em si — apenas reserva contexto.
- Se o usuário gerar **conteúdos extras** a partir do mesmo briefing (botão "Gerar mais um a partir deste plano"), cobra apenas `COMPLETE_IMAGE` (8 créd) por vez, pois o briefing/plano já foi pago.
- A pré-validação de créditos (`checkUserCredits`) acontece no início do passo 4 para evitar frustração no fim do fluxo.

### 4. Reuso do motor atual

A edge function de geração final continua sendo o pipeline existente (`generate-image` + `generate-caption`). O wizard apenas:
- Pré-preenche o payload do `CreateContent` com os campos do `edited_template`.
- Marca `metadata.briefing_id` na ação salva, para rastreabilidade no histórico.

---

## Frontend

### Estrutura — Stepper horizontal em página única

Nova página `src/pages/CreateContentWorkflow.tsx` montada na rota `/create/content` (a rota atual `/create/image` continua funcionando como **atalho direto**).

Layout:

```text
┌─────────────────────────────────────────────────────────────┐
│  [Banner pequeno + breadcrumb]                              │
├─────────────────────────────────────────────────────────────┤
│  [Stepper]  ●─────●─────○─────○                              │
│             Briefing  Plano  Editar  Gerar                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Conteúdo da etapa atual (componente isolado)              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [← Voltar]                            [Avançar / Gerar →]  │
└─────────────────────────────────────────────────────────────┘
```

- **Estado** mantido em `useReducer` local + persistido em `sessionStorage` (chave `create-content-workflow`) para sobreviver a refresh.
- **Stepper** clicável apenas para etapas já visitadas (não pula para frente).
- **Mobile (< 640px)**: stepper vira lista vertical compacta com check; botões de navegação ficam fixos no rodapé (`sticky bottom-0`).
- **Atalho "Já sei o que quero criar"** aparece como link discreto no canto superior direito do banner, levando a `/create/image?skip_briefing=1`.

### Componentes novos (em `src/components/create-workflow/`)

1. **`StepIndicator.tsx`** — barra de progresso responsiva, recebe `currentStep` e `steps[]`.
2. **`Step1Briefing.tsx`** — formulário do briefing:
   - Marca (obrigatório, reusa carregamento atual)
   - Editoria e Persona (opcionais, filtradas pela marca)
   - Plataforma (obrigatório)
   - Objetivo (obrigatório, select: Autoridade / Engajamento / Conversão / Educação / Marca)
   - Tipo de conteúdo (orgânico / ads)
   - **Ideia / briefing** (textarea grande, mín. 30 chars, validação anti-`xxx`)
   - Tom de voz (multiselect, máx. 4)
   - Notas adicionais (opcional)
   - Helper text com exemplos de bons briefings.
3. **`Step2Plan.tsx`** — exibe o template gerado:
   - Card grande com título, formato, big idea, copy preview, hashtags, miniatura da direção visual (descrita).
   - Botão **"Gerar 2 alternativas"** (chama `generate-content-templates` em `mode: more_alternatives`).
   - Quando há alternativas, mostra como carrossel/grid; usuário marca a escolhida.
   - Loading skeleton enquanto IA processa.
4. **`Step3EditTemplate.tsx`** — formulário editável com tudo que veio do template:
   - Tabs: **Visual** (descrição, estilo, mood, paleta, aspect ratio, ângulo, iluminação) + **Legenda** (caption, CTA, hashtags) + **Texto na imagem** (toggle).
   - Reusa componentes existentes: `VisualStyleGrid`, `CameraAngleGrid`, `FormatPreview`.
   - Cada campo tem placeholder com o valor sugerido pela IA + botão "↺ Restaurar sugestão".
5. **`Step4Generate.tsx`** — preview consolidado + botão final:
   - Mostra o resumo do que vai ser gerado.
   - Chip de custo: **10 créditos (pacote completo)** ou **8 créditos** se for "gerar mais um".
   - Botão **"Gerar conteúdo"** dispara o pipeline atual de `CreateContent` e leva para `/result`.
   - Após geração, oferece **"Gerar outro conteúdo a partir deste briefing"** (volta para etapa 2 com novas alternativas, custo reduzido).

### Hook `useContentWorkflow`

Centraliza:
- estado das 4 etapas + validação de avanço,
- chamadas para `generate-content-templates`,
- montagem do payload final para o motor de geração existente,
- persistência em `sessionStorage` + sincronização com tabela `content_briefings`.

### Mudanças no `ContentCreationSelector`

A tela `/create` (seleção entre Imagem / Vídeo / Marketplace / Revisar) continua igual. A diferença é:
- O card **"Criar Conteúdo"** passa a apontar para `/create/content` (nova rota do workflow), e não mais para `/create/image`.
- Adiciona uma badge sutil "Novo • Com briefing IA" no card.

### Página `CreateImage` atual

- Permanece intacta como atalho via `/create/image?skip_briefing=1`.
- Quando aberta com esse param, mostra um banner discreto: *"Você está pulando o briefing assistido. Quer começar do zero com IA? [Voltar ao workflow]"*.

---

## Migrações de banco (resumo)

Uma única migração:

1. `create table public.content_briefings (...)` com RLS.
2. Policies usando `can_access_resource(user_id, team_id)` (já existe).
3. Trigger `update_updated_at_column` (já existe) em `content_briefings`.

Nenhuma alteração em tabelas existentes.

---

## Considerações técnicas

- **Validação anti-briefing-vazio**: front (zod) + back (heurística). Rejeita ideia com `< 30 chars`, ou que tenha `> 50%` de caracteres repetidos, ou que case com regex `/^(x|a|\.|teste)+$/i`.
- **Responsividade**: stepper colapsa em mobile; cards de template usam `grid-cols-1 md:grid-cols-2`; botões de navegação viram `sticky bottom-0` em telas pequenas.
- **Acessibilidade**: stepper marcado com `aria-current="step"`; navegação por teclado entre etapas; foco vai para o primeiro campo da nova etapa ao avançar.
- **Erros e rate limit (429/402)**: a edge function de templates trata e devolve mensagens prontas; o front mostra toast e mantém o estado para o usuário tentar novamente sem perder o briefing.
- **Histórico**: a ação final continua sendo gravada na tabela `actions` (tipo `CONTENT_FROM_BRIEFING`), com `metadata.briefing_id` para conseguir reabrir o briefing.

---

## Entregáveis

**Banco**
- Migração: tabela `content_briefings` + policies + trigger.

**Edge functions**
- Nova: `supabase/functions/generate-content-templates/index.ts`.
- Atualizar: `_shared/creditCosts.ts` (`CONTENT_BRIEFING_PACKAGE: 10`).

**Frontend**
- Nova página: `src/pages/CreateContentWorkflow.tsx`.
- Novos componentes: `src/components/create-workflow/StepIndicator.tsx`, `Step1Briefing.tsx`, `Step2Plan.tsx`, `Step3EditTemplate.tsx`, `Step4Generate.tsx`.
- Novo hook: `src/hooks/useContentWorkflow.ts`.
- Atualizar `src/lib/creditCosts.ts` com `CONTENT_BRIEFING_PACKAGE`.
- Atualizar `src/App.tsx`: rota `/create/content` → `CreateContentWorkflow`.
- Atualizar `src/pages/ContentCreationSelector.tsx`: card "Criar Conteúdo" aponta para `/create/content` e ganha badge "Novo".
- Atualizar `src/pages/CreateImage.tsx`: banner discreto quando `?skip_briefing=1`.
