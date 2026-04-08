

# Plano: Tela de Carregamento com Logo GIF na Criação Rápida

## Resumo

Quando o usuário clicar em "Gerar Imagem Rápida", a página `/quick-content` substituirá o formulário por uma tela de carregamento elegante com a logo animada (GIF extraído do vídeo .mov), uma barra de progresso com porcentagem simulada, e o texto motivacional. O usuário pode navegar para outras páginas livremente — a geração continua em segundo plano via sidebar.

---

## O que será feito

### 1. Converter o vídeo .mov em GIF transparente
- Usar ffmpeg para extrair o vídeo como GIF com fundo transparente
- Salvar o GIF em `public/images/logo-loading.gif`

### 2. Criar componente `QuickContentLoading`
- Novo componente `src/components/quick-content/QuickContentLoading.tsx`
- Exibe a logo GIF com animação de pulsação (scale up/down via CSS)
- Barra de progresso com porcentagem numérica que simula progresso (0% → ~90% gradualmente enquanto gera, pula para 100% ao completar)
- Texto: "Um instante, estamos criando a imagem perfeita para você"
- Barra de progresso estilizada com gradiente primary
- Botão sutil informando que pode navegar livremente

### 3. Modificar `QuickContent.tsx`
- Quando `isGenerating` for true e o usuário ainda estiver na página, renderizar o `QuickContentLoading` no lugar do formulário
- Manter toda a lógica de background task e auto-navegação ao resultado
- O usuário continua podendo sair — a sidebar mostra o progresso

### 4. Progresso simulado
- Timer que incrementa de 0% a ~90% ao longo de ~25 segundos (tempo médio de geração)
- Ao completar (task status = "complete"), pula para 100% e redireciona

---

## Detalhes Técnicos

| Item | Detalhe |
|------|---------|
| Conversão vídeo | `ffmpeg -i logo.mov -vf "fps=15,scale=200:-1" -gifflags +transdiff -y logo-loading.gif` |
| Componente | `QuickContentLoading.tsx` com progress state via `useEffect` + `setInterval` |
| Animação logo | CSS `animate-pulse` ou keyframe customizado de scale 0.95↔1.05 |
| Progress bar | Componente `Progress` do shadcn + texto numérico centralizado |
| Integração | Condicional no return do `QuickContent.tsx`: `isGenerating ? <QuickContentLoading> : <formulário>` |

