

## Redesign da tela /create/quick

Reestruturar o layout da Criação Rápida para um design em duas colunas (desktop) com prompt unificado, referências integradas, estilo visual com demonstrações visuais, personalizações opcionais e preview de formato.

### Layout Geral (Desktop)

```text
┌─────────────────────────────────┬──────────────────────────┐
│  Prompt: "Sua ideia de criação" │                          │
│  ┌─────────────────────────┐    │   Preview do Formato     │
│  │ Textarea                │    │   ┌──────────────┐       │
│  │                         │    │   │              │       │
│  │ [file1.jpg] [colar]     │    │   │  1350px      │       │
│  └─────────────────────────┘    │   │              │       │
│                                 │   └──────────────┘       │
│  Referências e anexos (dentro)  │      1080px              │
│  [+ Selecionar] [Colar CTRL+V] │                          │
│                                 │   Formato:               │
│  Estilo visual:                 │   [Instagram ▼] 1080x1350│
│  [📷 Foto] [🎨 3D] [✏️ ...]   │                          │
│                                 │                          │
│  Personalizações (opcional):    │                          │
│  [Marca ▼] [Persona ▼] [Tema▼] │                          │
└─────────────────────────────────┴──────────────────────────┘
│           [⚡ Gerar Imagem Rápida  🪙 5]                   │
└─────────────────────────────────────────────────────────────┘
```

No mobile, coluna única com preview acima do botão.

### Alterações por Arquivo

**1. `src/components/quick-content/UnifiedPromptBox.tsx`** — Reescrita completa:
- Renomear label de "Prompt" para algo como **"Sua ideia de criação"** com subtítulo explicativo
- Mover a seção de referências para **dentro do card** do textarea (abaixo do texto, acima da toolbar), com upload e colagem inline
- Thumbnails de imagens anexadas aparecem como chips com preview inline dentro do card
- Remover seção separada de referências
- Manter estilo visual na toolbar inferior do card (como está)

**2. `src/components/quick-content/VisualStyleGrid.tsx`** — Novo componente:
- Grid horizontal scrollável com cards visuais para cada estilo
- Cada card tem: emoji/ícone representativo + cor de fundo temática + nome + descrição curta
- Cores e ícones específicos por estilo (ex: Camera com gradiente azul para Fotorealístico, cubos roxos para 3D, etc.)
- Estado selecionado com ring + scale

**3. `src/components/quick-content/FormatPreview.tsx`** — Novo componente:
- Exibe um retângulo proporcional ao aspect ratio selecionado com dimensões anotadas (ex: "1080px" × "1350px")
- Seletor de plataforma abaixo com ícone da rede social e dimensões
- Quando nenhuma plataforma selecionada, mostra "1:1 Quadrado" como padrão
- Seletor dropdown ou chips de plataforma com sub-opções de formato (Feed, Stories, etc.)

**4. `src/pages/QuickContent.tsx`** — Reestruturação do layout:
- Dois columns no desktop: coluna esquerda (prompt + estilo + personalizações), coluna direita (preview de formato)
- Mover personalizações (Marca, Persona, Tema) para seção colapsável "Personalizações (opcional)" com os selects existentes (TagSelect)
- Filtrar temas/personas pela marca selecionada (lógica já existe)
- Integrar FormatPreview na coluna direita
- Botão de gerar na largura total abaixo das duas colunas

### Detalhes Técnicos

- **Estilo Visual Grid**: Cards com ~80px de largura, overflow-x-auto no mobile, grid no desktop. Cada estilo tem cor de fundo única (realistic=#E3F2FD, animated=#EDE7F6, cartoon=#FFF3E0, etc.) para diferenciação visual imediata
- **Preview de Formato**: Usa aspect-ratio CSS para manter proporção. Container máximo ~280px de largura com labels de dimensão posicionados nos eixos
- **Referências dentro do prompt**: Após o textarea, uma barra horizontal com botões "Selecionar imagem" e "Colar imagem" + thumbnails dos arquivos anexados, tudo dentro do mesmo rounded-2xl card
- **Personalizações**: Seção com título "Personalizações (opcional)" e 3 TagSelects em grid de 3 colunas no desktop

