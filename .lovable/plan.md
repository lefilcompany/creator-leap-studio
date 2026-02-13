

# Melhorar Navegacao e Layout da Tela de Revisao

## Problema Atual

1. **Breadcrumb incorreto**: Quando o usuario seleciona um tipo de revisao (Imagem, Legenda, Texto), o breadcrumb continua mostrando apenas "Revisar Conteudo" sem indicar o tipo selecionado
2. **Botao "Voltar" mal posicionado**: O botao para voltar a selecao de tipo fica la embaixo, dentro do card de acoes, misturado com o botao "Gerar Revisao" - contra-intuitivo e dificil de encontrar
3. **Pagina ReviewResult sem breadcrumb**: A pagina de resultado nao possui breadcrumb nem banner, quebrando o padrao visual do sistema

## Solucao

### 1. Breadcrumb dinamico no ReviewContent

Quando um tipo de revisao for selecionado, o breadcrumb passa a mostrar a hierarquia completa:

```text
Home > Revisar Conteudo > Revisar Imagem
Home > Revisar Conteudo > Revisar Legenda
Home > Revisar Conteudo > Revisar Texto para Imagem
```

O item "Revisar Conteudo" sera clicavel e ao clicar, reseta o formulario para a selecao de tipo (funciona como o botao "Voltar" atual).

### 2. Remover botao "Voltar" do rodape

Como o breadcrumb ja fornece a navegacao de retorno, o botao "Voltar" sera removido do card de acoes. O botao "Gerar Revisao" ocupara a largura total, ficando mais proeminente e limpo.

### 3. Header Card dinamico

O titulo e icone do header card mudam conforme o tipo selecionado:
- Imagem: icone ImageIcon com cor primary
- Legenda: icone FileText com cor secondary
- Texto: icone Type com cor accent

### 4. Pagina ReviewResult com banner e breadcrumb

Adicionar o mesmo padrao visual (banner + breadcrumb overlay + header card) na pagina de resultado, com breadcrumb:

```text
Home > Revisar Conteudo > Resultado da Revisao
```

## Detalhes Tecnicos

### Arquivo: `src/pages/ReviewContent.tsx`

**Breadcrumb dinamico (linha 300-303):**
- Quando `reviewType` e `null`: items = `[{ label: "Revisar Conteudo" }]`
- Quando `reviewType` tem valor: items = `[{ label: "Revisar Conteudo", href: "#", onClick: handleReset }, { label: "Revisar Imagem" }]`
- Como o `PageBreadcrumb` usa `Link` com `href`, sera necessario usar o clique no breadcrumb para chamar `handleReset()` em vez de navegar. Alternativa: usar `href="/review"` com `state: { reset: true }` que ja e suportado pelo componente (linhas 122-128).

**Remover botao "Voltar" (linhas 632-673):**
- Remover o card de acoes que envolve ambos os botoes
- Mover o botao "Gerar Revisao" para ficar diretamente abaixo do card de conteudo, sem wrapper extra
- Remover o botao "Voltar" completamente

### Arquivo: `src/pages/ReviewResult.tsx`

**Adicionar banner e breadcrumb:**
- Importar `reviewBanner` e `PageBreadcrumb`
- Adicionar estrutura de banner identica ao ReviewContent
- Breadcrumb: `Home > Revisar Conteudo > Resultado`
- Converter header existente para o padrao de header card sobreposto (-mt-12)

### Arquivo: `src/components/PageBreadcrumb.tsx`

- Nenhuma alteracao necessaria - o componente ja suporta `href` e `state` nos items intermediarios

### Arquivos modificados
- `src/pages/ReviewContent.tsx`
- `src/pages/ReviewResult.tsx`

