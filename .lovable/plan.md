
# Redesign da Pagina /privacy

## Objetivo
Redesenhar a pagina de Politica de Privacidade para seguir o padrao visual estabelecido no sistema (banner com imagem + header card sobreposto + conteudo scrollavel), mantendo-a como rota publica.

## Mudancas Planejadas

### 1. Criar imagem de banner para privacidade
- Adicionar uma nova imagem de banner tematica (privacidade/seguranca de dados) no diretorio `src/assets/`
- Seguir o padrao de banners existentes (ex: `brands-banner.jpg`, `profile-banner.jpg`)
- Caso nao haja imagem disponivel, usar um banner com gradiente e icone de escudo como fallback visual

### 2. Reestruturar o layout da pagina `src/pages/Privacy.tsx`
A pagina sera reestruturada para seguir o padrao das paginas internas do sistema:

- **Container scrollavel**: Envolver todo o conteudo em um container com `overflow-y-auto` e `h-screen` para permitir scroll
- **Banner no topo**: Imagem de fundo com overlay gradiente (padrao `bg-gradient-to-t from-background/80 via-background/20 to-transparent`)
- **Header card sobreposto**: Card com `-mt-12` contendo icone Shield, titulo e descricao, seguindo o padrao de `Brands.tsx`
- **Secoes com Accordion**: Converter as secoes em um layout de accordion (ou manter cards empilhados) com scroll natural
- **Botao de voltar**: Manter como breadcrumb overlay no banner, seguindo o padrao `PageBreadcrumb`
- **Margem negativa**: Usar `-m-4 sm:-m-6 lg:-m-8` caso esteja dentro do DashboardLayout, ou ajustar para standalone

### 3. Estrutura do novo layout

```text
+--------------------------------------------------+
|  BANNER (imagem ou gradiente com escudo)          |
|  [<- Voltar]                                      |
+--------------------------------------------------+
|  +--------------------------------------------+  |
|  | [Shield]  Politica de Privacidade           |  |  <- Header card (-mt-12)
|  |           Transparencia e seguranca...      |  |
|  +--------------------------------------------+  |
|                                                   |
|  [Secao 1: Introducao]                           |
|  [Secao 2: Definicoes]                           |
|  [Secao 3: Dados Coletados]                      |
|  ...                                              |
|  [Secao 13: Canal de Atendimento]                |
|                                                   |
|  Rodape com copyright                             |
+--------------------------------------------------+
```

### 4. Detalhes tecnicos

- **Banner**: Usar gradiente com cores do tema (`from-primary/20 via-secondary/10 to-background`) com icones decorativos de seguranca (Shield, Lock) em opacidade baixa, ja que nao temos uma imagem especifica de privacidade
- **Scroll**: A pagina e uma rota publica standalone, entao usar `min-h-screen overflow-y-auto` no container raiz (remover `overflow-hidden` do html/body via classe local)
- **Secoes**: Manter os cards de cada secao com hover shadow, mas alinhar padding e spacing com o padrao do sistema (`px-4 sm:px-6 lg:px-8`)
- **Responsividade**: Banner com `h-48 md:h-56`, header card responsivo
- **Dark mode**: Funciona automaticamente via variaveis CSS do tema

### 5. Arquivos modificados
- `src/pages/Privacy.tsx` - Redesign completo do layout
