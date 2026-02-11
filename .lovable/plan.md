

## Corrigir scroll externo na pagina de Historico

### Problema
Quando os cards do historico carregam, o conteudo cresce e um scroll aparece no fundo rosa (layout externo ao board). Isso acontece porque o `html` e o `body` nao possuem `overflow: hidden`, permitindo que o navegador crie uma barra de rolagem no nivel do documento. O scroll deveria ocorrer apenas dentro do board (o container branco com bordas arredondadas), controlado pelo `<main>` no DashboardLayout.

### Solucao
Adicionar `overflow: hidden` ao `html` e `body` no CSS global para garantir que nenhum scroll externo ao board seja possivel. Todo o scroll deve acontecer exclusivamente no `<main>` do DashboardLayout (que ja tem `overflow-y-auto`).

### Detalhes tecnicos

**`src/index.css`** - Adicionar regra para html e body dentro do `@layer base` existente (linhas 72-83):

```css
html, body {
  @apply overflow-hidden h-screen;
}
```

Isso sera adicionado junto ao bloco existente do `body` (linha 77), mantendo os estilos atuais (`bg-background text-foreground`, gradiente, font-family) e adicionando as restricoes de overflow e altura.

Essa abordagem e segura porque:
- O DashboardLayout ja usa `h-screen overflow-hidden` no container raiz e `overflow-y-auto` no `<main>`
- Paginas publicas (Login, Register, etc.) tambem funcionam dentro de containers com scroll proprio
- Nenhuma outra pagina depende do scroll do documento
