

## Redesign da Home - Dashboard com identidade de IA

### Problema Atual
A home atual e generica e nao transmite a identidade de um sistema de criacao de conteudo com IA. Os dados exibidos (contagem de acoes, marcas gerenciadas) nao sao atrativos nem convidam o usuario a produzir. O layout parece um painel administrativo, nao um estudio criativo.

### Nova Visao
Transformar o Dashboard em um **hub criativo** que convida o usuario a agir imediatamente, com visual moderno de plataforma de IA e informacoes relevantes.

### Estrutura da Nova Home

#### 1. Hero de Boas-vindas com CTA principal
- Saudacao personalizada com horario do dia ("Bom dia", "Boa tarde", "Boa noite")
- Frase motivacional contextual sobre criacao com IA
- Botao CTA principal grande e vibrante: "Criar com IA"
- Badge de creditos ao lado do CTA (valor atual de creditos)
- Gradiente de fundo sutil com tons da marca

#### 2. Cards de Acoes Rapidas (grid 2x2 ou 4 colunas)
Quatro cards visuais e interativos que representam as acoes principais do sistema:
- **Criar Conteudo** (icone Sparkles, gradiente primary) - link para /create
- **Revisar Conteudo** (icone CheckCircle, gradiente accent) - link para /review
- **Planejar Conteudo** (icone Calendar, gradiente secondary) - link para /plan
- **Gerar Video** (icone Video, gradiente purple) - link para /create/video

Cada card mostra:
- Icone grande com fundo gradiente
- Titulo da acao
- Descricao curta
- Custo em creditos (badge)

#### 3. Resumo compacto (3 metricas em linha)
Uma barra horizontal com 3 metricas lado a lado:
- Creditos restantes (com barra de progresso mini)
- Conteudos criados (total de acoes)
- Marcas ativas

#### 4. Atividades Recentes (simplificado)
- Lista das 5 ultimas acoes com tipo, marca e data
- Link "Ver historico completo" no final
- Empty state convidando a criar o primeiro conteudo

### Detalhes Tecnicos

**Arquivo: `src/pages/Dashboard.tsx`** - Reescrita completa do componente

Mudancas principais:
- Manter todas as queries React Query existentes (ja otimizadas)
- Manter TourSelector, ExpiredTrialBlocker, TrialBanner
- Manter skeleton de carregamento progressivo
- Redesenhar completamente o JSX do return

Logica de saudacao:
```text
hora < 12  -> "Bom dia"
hora < 18  -> "Boa tarde"
hora >= 18 -> "Boa noite"
```

Cards de acao com custos reais usando `CREDIT_COSTS` do `src/lib/creditCosts.ts`:
- Criar Conteudo: QUICK_IMAGE (5 creditos)
- Revisar Conteudo: CAPTION_REVIEW (2 creditos)
- Planejar Conteudo: CONTENT_PLAN (3 creditos)
- Gerar Video: VIDEO_GENERATION (20 creditos)

Substituicao de icones:
- Remover HomeIcon (generico)
- Usar Sparkles, Wand2, BrainCircuit, Bot como icones de IA
- Manter lucide-react como fonte de icones

Layout responsivo:
- Mobile: 1 coluna para cards de acao, metricas empilhadas
- Tablet: 2 colunas para cards de acao
- Desktop: 4 colunas para cards de acao, metricas em linha

Animacoes:
- Cards com `hover:scale-105` e `transition-all duration-300`
- Entrada com `animate-fade-in` (ja existe no projeto)
- Gradientes sutis nos cards de acao

### Arquivos Modificados

1. `src/pages/Dashboard.tsx` - Redesign completo do componente (unico arquivo)

Nenhum arquivo novo sera criado. Todas as dependencias (React Query, componentes UI, creditCosts) ja existem no projeto.
