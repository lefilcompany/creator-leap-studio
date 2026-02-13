
# Refatorar Tela de Planejar Conteudo para o Padrao Visual do Sistema

## Objetivo
Alinhar a pagina de Planejar Conteudo (`/plan`) ao padrao visual usado em Revisar Conteudo (`/review`) e demais paginas de gestao: banner ilustrativo, breadcrumb overlay, header card sobreposto e formulario em cards tematicos.

## Mudancas

### 1. Gerar imagem de banner para planejamento
- Usar a IA de imagem integrada para criar um banner ilustrativo no estilo flat/cartoon (mesmo estilo dos outros banners do sistema)
- Tema: calendario de conteudo, redes sociais, planejamento de posts
- Proporcao 3:1 (1000x300), tons pastel, sem texto
- Salvar como `src/assets/plan-banner.jpg`

### 2. Refatorar layout completo do `src/pages/PlanContent.tsx`

**Estrutura nova (igual ao ReviewContent):**

```text
div (flex flex-col -m-4 sm:-m-6 lg:-m-8)
  |-- Banner (relative, h-48 md:h-56, com imagem)
  |     |-- PageBreadcrumb variant="overlay"
  |     |-- img (plan-banner.jpg)
  |     |-- gradient overlay
  |
  |-- Header Card (-mt-12, sobrepondo o banner)
  |     |-- Icone Calendar + Titulo + Descricao
  |     |-- Card de creditos (lado direito)
  |
  |-- Main Content (px-4 sm:px-6 lg:px-8)
        |-- Card "Configuracao Basica" (marca, plataforma, quantidade)
        |-- Card "Temas Estrategicos" (selecao de temas)
        |-- Card "Detalhes do Planejamento" (objetivo, info adicional)
        |-- Botao "Gerar Planejamento"
```

**Mudancas especificas:**
- Wrapper externo: trocar `min-h-full w-full p-3 sm:p-6` por `flex flex-col -m-4 sm:-m-6 lg:-m-8 min-h-full` (padrão de paginas com banner)
- Adicionar banner com `PageBreadcrumb variant="overlay"` e imagem de fundo
- Mover header para card sobreposto com `-mt-12` e `z-10`
- Separar "Temas Estrategicos" em seu proprio card (atualmente esta junto com Configuracao Basica)
- Manter os cards de Detalhes e Botao como estao, ajustando classes menores para consistencia
- Corrigir texto "Revisoes Restantes" para "Creditos Restantes" no card de creditos (esta errado atualmente)

### 3. Melhorar campos do formulario
- Usar o mesmo padrao de labels do CreateContent: `text-xs md:text-sm font-semibold` com `<span className="text-destructive">*</span>` para obrigatorios
- Cards com `rounded-2xl` e headers com gradiente sutil
- Inputs com `h-10 md:h-11 rounded-xl border-2` (padrão CreateContent) em vez de `h-12 rounded-2xl`

## Arquivos modificados
- `src/pages/PlanContent.tsx` - Refatoracao completa do layout
- `src/assets/plan-banner.jpg` - Nova imagem de banner (gerada por IA)
