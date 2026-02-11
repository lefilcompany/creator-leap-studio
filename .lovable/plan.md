

# Redesign da Pagina de Acao (ActionView)

## Problema Atual
A pagina de detalhes da acao usa componentes `Card` basicos com estilo generico, contrastando com o design refinado das paginas de Marcas, Temas e Personas que utilizam `SectionCard` com gradientes, blur, e layout em grid com sidebar.

## Mudancas Propostas

### 1. Introduzir o componente SectionCard na ActionView
Reutilizar o mesmo padrao visual da BrandView: cards com backdrop-blur, bordas arredondadas (rounded-2xl), cabecalho com icone e gradiente sutil baseado na cor do tipo de acao.

### 2. Reorganizar o layout em grid 2/3 + 1/3
- **Coluna principal (2/3)**: Detalhes da solicitacao, resultado textual (legenda, titulo, hashtags, plano, review)
- **Sidebar (1/3)**: Imagem/video gerado, metadados (data, marca, criador, status), botoes de download

### 3. Substituir os 4 cards de info por metadados na sidebar
Em vez de 4 cards separados (Data, Marca, Criado por, Status), usar um card compacto estilo metadata na sidebar, similar ao rodape de datas da BrandView.

### 4. Mover status e revisoes para badges no hero
Os badges de Status, Aprovado e Revisoes serao integrados ao hero header ao lado do titulo, em vez de ocupar um card separado.

### 5. Melhorar a exibicao de midia
- Imagens e videos ficam na sidebar com apresentacao mais elegante (rounded-xl, sombra, overlay de download no hover)
- Imagem original (review) tambem fica na sidebar

### 6. Campos de detalhes por tipo de acao em SectionCards
Cada grupo de detalhes (Objetivo, Plataforma, Tom, etc.) sera renderizado dentro de um SectionCard com o padrao visual correto, usando labels uppercase e tracking-wider.

---

## Detalhes Tecnicos

### Estrutura do layout atualizado

```text
+-----------------------------------------------+
|  Hero Header (gradiente + icone + titulo)     |
|  Breadcrumb | Tipo | Marca | Badges status   |
+-----------------------------------------------+
|                    |                          |
|  SectionCard:      |  SectionCard:            |
|  Detalhes da       |  Midia Gerada            |
|  Solicitacao       |  (imagem/video)           |
|                    |                          |
|  SectionCard:      |  Metadados               |
|  Resultado         |  (data, marca, user,     |
|  (legenda, titulo, |   status, revisoes)      |
|   hashtags, plano) |                          |
|                    |                          |
+-----------------------------------------------+
```

### Cor de destaque por tipo de acao
Cada tipo de acao tera uma cor associada para o gradiente do SectionCard:
- CRIAR_CONTEUDO / CRIAR_CONTEUDO_RAPIDO: `hsl(var(--primary))`
- REVISAR_CONTEUDO: `hsl(var(--accent))`
- PLANEJAR_CONTEUDO: `hsl(var(--secondary))`
- GERAR_VIDEO: `hsl(var(--primary))`

### Componentes reutilizados da BrandView
- `SectionCard` (sera extraido ou recriado localmente)
- Padrao de labels: `text-xs text-muted-foreground font-medium uppercase tracking-wider`
- Card de metadata no rodape da sidebar

### Arquivo modificado
- `src/pages/ActionView.tsx` - Redesign completo do layout mantendo toda a logica existente (download, copy, formatacao markdown, etc.)

