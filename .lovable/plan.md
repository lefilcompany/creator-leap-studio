

# Redesign da Pagina de Acao (ActionView)

## Problema Atual
A pagina de detalhes da acao usa componentes `Card` basicos com estilo generico e layout em coluna unica, contrastando com o design refinado das paginas de Marcas, Temas e Personas que utilizam `SectionCard` com gradientes, blur, e layout em grid com sidebar.

## Mudancas Propostas

### 1. Introduzir o componente SectionCard na ActionView
Reutilizar o mesmo padrao visual da BrandView: cards com `bg-card/80 backdrop-blur-sm rounded-2xl border-border/10`, cabecalho com icone e gradiente sutil baseado na cor do tipo de acao.

### 2. Reorganizar o layout em grid 2/3 + 1/3
- **Coluna principal (lg:col-span-2)**: Detalhes da solicitacao e resultado textual (legenda, titulo, hashtags, plano, review)
- **Sidebar (lg:col-span-1)**: Imagem/video gerado, metadados compactos (data, marca, criador, status, revisoes), botoes de download

### 3. Substituir os 4 cards de info + card de status por metadados na sidebar
Em vez de 4 cards separados + 1 card de status/revisoes (5 cards ao todo), usar um unico card compacto estilo metadata na sidebar com labels `uppercase tracking-wider` e valores abaixo, similar ao rodape de datas da BrandView.

### 4. Mover badges de status para o hero header
Os badges de Status e Aprovado serao exibidos ao lado do subtitulo no hero, em vez de ocupar um card separado.

### 5. Melhorar a exibicao de midia
- Imagens ficam na sidebar com `rounded-xl shadow-md` e overlay de download no hover (mesmo padrao do `FileDetailField` da BrandView)
- Videos ficam na sidebar com controles e botao de download

### 6. Campos de detalhes por tipo de acao em SectionCards
Cada grupo de detalhes (Objetivo, Plataforma, Tom, etc.) sera renderizado dentro de um SectionCard. Labels seguem o padrao `text-xs text-muted-foreground font-medium uppercase tracking-wider`.

### 7. Gradiente dinamico por tipo de acao
Cada tipo de acao tera uma cor de destaque diferente para o hero e section cards:
- `CRIAR_CONTEUDO` / `CRIAR_CONTEUDO_RAPIDO` / `GERAR_VIDEO`: `hsl(var(--primary))`
- `REVISAR_CONTEUDO`: `hsl(var(--accent))`
- `PLANEJAR_CONTEUDO`: `hsl(var(--secondary))`

---

## Detalhes Tecnicos

### Estrutura do layout atualizado

```text
+-----------------------------------------------+
|  Hero Header (gradiente dinamico + icone)     |
|  Breadcrumb | Tipo | Marca | Badges status   |
+-----------------------------------------------+
| grid lg:grid-cols-3                           |
|  lg:col-span-2       |  lg:col-span-1        |
|                       |                       |
|  SectionCard:         |  SectionCard:         |
|  Detalhes da          |  Midia Gerada         |
|  Solicitacao          |  (imagem/video)       |
|                       |                       |
|  SectionCard:         |  SectionCard:         |
|  Resultado            |  Informacoes          |
|  (legenda, titulo,    |  (data, marca, user,  |
|   hashtags, plano,    |   status, revisoes)   |
|   review)             |                       |
+-----------------------------------------------+
```

### Componente SectionCard (local, mesmo da BrandView)

```typescript
const SectionCard = ({ title, icon, children, accentColor }) => (
  <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/10 overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
    <div className="px-5 py-3.5 border-b border-border/10 flex items-center gap-2.5"
      style={accentColor ? { background: `linear-gradient(135deg, ${accentColor}08, ${accentColor}03)` } : {}}>
      {icon && <span className="text-primary">{icon}</span>}
      <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">{title}</h3>
    </div>
    <div className="p-5">{children}</div>
  </div>
);
```

### Funcao de cor por tipo de acao

```typescript
const getAccentColor = (type: string) => {
  if (type.includes('REVISAR')) return 'hsl(var(--accent))';
  if (type.includes('PLANEJAR')) return 'hsl(var(--secondary))';
  return 'hsl(var(--primary))';
};
```

### Card de Metadados na Sidebar
Substituir os 5 cards por um unico bloco com divisores:

```typescript
<SectionCard title="Informacoes" icon={<Info />} accentColor={accentColor}>
  <div className="space-y-4">
    <div>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Data de Criacao</p>
      <p className="text-sm font-medium mt-1">{formatDate(action.createdAt)}</p>
    </div>
    <Separator className="bg-border/10" />
    <div>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Marca</p>
      <p className="text-sm font-medium mt-1">{action.brand?.name}</p>
    </div>
    {/* ... status, user, revisoes */}
  </div>
</SectionCard>
```

### Imagem com overlay de download (padrao BrandView)

```typescript
<div className="relative group rounded-xl overflow-hidden border border-border/10 shadow-sm">
  <img src={imageUrl} alt="Imagem gerada" className="w-full h-auto" />
  <button
    onClick={() => handleDownloadImage(imageUrl)}
    className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm"
  >
    <Download className="text-white h-6 w-6" />
  </button>
</div>
```

### Arquivo modificado
- `src/pages/ActionView.tsx` - Redesign completo do layout mantendo toda a logica existente (download, copy, formatacao markdown, export DOCX/TXT/MD, etc.)

