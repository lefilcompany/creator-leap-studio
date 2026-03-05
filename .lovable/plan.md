

# Adicionar "Criar Imagem Rápida" ao Seletor de Criação

## Objetivo
Adicionar um terceiro card "Criar Imagem Rápida" (5 créditos) ao seletor, ao lado de "Criar Imagem" (6 créditos) e "Criação de Vídeo" (20 créditos).

## Mudanças

### `src/pages/ContentCreationSelector.tsx`

1. Expandir o tipo `CreationType` para incluir `"quick-image"`
2. Adicionar rota `"quick-image": "/create/quick"` no mapa de rotas
3. Mudar o grid de `md:grid-cols-2` para `md:grid-cols-3`
4. Adicionar novo card "Criar Imagem Rápida" com:
   - Ícone `Zap` (raio) para diferenciar da imagem completa
   - Cor de destaque (amber/warning) para diferenciação visual
   - Custo: `CREDIT_COSTS.QUICK_IMAGE` (5 créditos)
   - Descrição: "Crie imagens rapidamente com IA de forma simplificada"
5. Atualizar o popover de ajuda para listar as 3 opções

### Arquivos modificados
- **`src/pages/ContentCreationSelector.tsx`** — novo card + grid 3 colunas

