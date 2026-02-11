
## Corrigir scroll da pagina de Historico

### Problema
A pagina de Historico tem `overflow-hidden` e restricoes de altura (`h-[calc(100%+2rem)]`) no container raiz, o que faz o banner ficar fixo e cria um scroll interno separado. Isso tambem causa o problema visivel na segunda screenshot onde o conteudo some e o background aparece "quadrado" fora do board.

### Solucao
Remover as restricoes de altura e `overflow-hidden` do container raiz da pagina de Historico, seguindo exatamente o mesmo padrao da pagina de Marcas que usa scroll natural do DashboardLayout.

### Mudanca no arquivo

**`src/pages/History.tsx`** (1 edicao):

- Linha 207: Trocar o className do container raiz de:
  ```
  flex flex-col -m-4 sm:-m-6 lg:-m-8 h-[calc(100%+2rem)] sm:h-[calc(100%+3rem)] lg:h-[calc(100%+4rem)] overflow-hidden
  ```
  Para (identico ao padrao de Marcas):
  ```
  flex flex-col -m-4 sm:-m-6 lg:-m-8
  ```

- Linha 261: No `<main id="history-list">`, remover `flex-1 min-h-0 overflow-y-auto` que forçavam o scroll interno, mantendo apenas o padding original:
  ```
  px-4 sm:px-6 lg:px-8 pt-4 pb-4 sm:pb-6 lg:pb-8
  ```

Isso fara o banner, header e lista de acoes scrollarem juntos naturalmente dentro do board do DashboardLayout, exatamente como funciona na pagina de Marcas.
