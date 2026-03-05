

# Modo "Anúncio Profissional" + Novos Estilos de Design + Prompt Otimizado para Ads

## Objetivo
Criar um modo "Anúncio Profissional" que automaticamente configure o layout ideal para peças publicitárias brasileiras, adicionar 3 novos estilos de design de texto e atualizar o prompt do backend para gerar anúncios com padrões profissionais.

---

## Mudanças

### 1. Frontend: `src/pages/CreateImage.tsx`

**Novo campo no FormData:**
- `adMode: 'standard' | 'professional'` — aparece apenas quando `contentType === 'ads'`
- `priceText?: string` — campo para preço/oferta (ex: "R$ 29,90", "50% OFF")

**Comportamento do modo "Anúncio Profissional":**
Quando ativado, auto-configura:
- `imageIncludeText: true`
- `fontStyle: 'impactful'`
- `textDesignStyle: 'badge'` (novo)
- Exibe campo extra de "Preço / Oferta" (max 30 chars)
- Exibe checkbox "Incluir logo da marca no canto"

**UI:** Botão toggle dentro da seção de tipo de conteúdo, visível apenas quando "Anúncio" está selecionado. Layout similar ao toggle Orgânico/Anúncio mas como sub-opção: "Modo Padrão" | "Modo Profissional".

**3 novos estilos em `TEXT_DESIGN_OPTIONS`:**
- `badge` — "Badge/Selo": Texto dentro de selo/etiqueta colorida com destaque visual
- `plaquinha` — "Plaquinha": Texto em placa de madeira/metal com textura realista  
- `card_overlay` — "Card Overlay": Painel com informações sobrepostas na foto

### 2. Backend: `supabase/functions/generate-image/index.ts`

**Novos prompts em `TEXT_DESIGN_PROMPTS`:**
- `badge`: Instrução para renderizar texto dentro de selos/etiquetas coloridas com formato de badge, destaque visual tipo "promoção"
- `plaquinha`: Instrução para texto em placa de madeira/metal com textura e profundidade
- `card_overlay`: Instrução para painel semitransparente com ícones e informações sobrepostas na foto

**Atualização do `buildDirectorPrompt`:**
- Novo parâmetro `adProfessionalMode: boolean`
- Novo parâmetro `priceText: string`
- Novo parâmetro `includeBrandLogo: boolean`

Quando `adProfessionalMode === true`, adicionar seção especial no prompt:

```
### MODO ANÚNCIO PROFISSIONAL
Esta imagem deve parecer uma PEÇA PUBLICITÁRIA PROFISSIONAL de design gráfico brasileiro. Siga estes padrões:

LAYOUT:
- Fundo de cor sólida vibrante (usar cor principal da marca ou cor complementar forte)
- Elementos decorativos 3D ao redor (raios de luz, formas geométricas, megafones, setas)
- Produto/sujeito principal em destaque absoluto no centro ou terço áureo

HIERARQUIA DE TEXTO (ordem de importância visual):
1. HEADLINE: Texto principal em tipografia BOLD GIGANTE (hero text), ocupando 30-40% da área visual
2. PREÇO/OFERTA: "${priceText}" em destaque com badge/selo colorido contrastante
3. CTA: "${ctaText}" em botão arredondado com cor contrastante
4. DETALHES: Informações secundárias em texto menor

DESIGN GRÁFICO:
- Use badges/selos coloridos para destacar preços e ofertas
- Cards sobrepostos com informações (estilo material design)
- Elementos 3D decorativos para dinamismo
- Logo da marca no canto (superior ou inferior)
- Contraste forte entre texto e fundo
- Visual IMPACTANTE, chamativo, estilo design gráfico profissional brasileiro
```

**Lógica de envio do `priceText` e `adMode`:**
- Receber os novos campos do request e passá-los ao `buildDirectorPrompt`

### 3. Fluxo de dados

```
Frontend (CreateImage.tsx)
  ├── adMode: 'professional'
  ├── priceText: "R$ 29,90"
  ├── ctaText: "Compre agora"
  ├── textDesignStyle: 'badge'
  └── includeBrandLogo: true
       │
       ▼
Backend (generate-image/index.ts)
  ├── Recebe novos campos
  ├── buildDirectorPrompt com seção MODO ANÚNCIO PROFISSIONAL
  └── Prompt final otimizado para peça publicitária
```

---

## Arquivos Modificados

1. **`src/pages/CreateImage.tsx`** — Novo modo profissional, campos de preço/oferta, 3 novos estilos de design
2. **`supabase/functions/generate-image/index.ts`** — 3 novos `TEXT_DESIGN_PROMPTS`, seção "Anúncio Profissional" no `buildDirectorPrompt`, novos parâmetros

