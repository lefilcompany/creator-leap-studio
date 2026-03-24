

# Plano: Componente "Ponto de Vista" (Ângulo de Câmera) para Criação de Imagem

## O que será feito

Criar um novo componente `CameraAngleGrid` no mesmo padrão visual do `VisualStyleGrid` — card com imagem de preview do ângulo selecionado que abre modal com todas as opções. Posicionar lado a lado com o Estilo Visual no desktop, empilhados no mobile. Garantir que o valor selecionado seja enviado corretamente ao backend (já suportado).

## Etapas

### 1. Gerar imagens de referência para cada ângulo
Criar 7 imagens ilustrativas (uma por ângulo) usando o AI Gateway e salvar em `src/assets/angles/`:
- `eye_level.jpg` — Nível dos Olhos
- `top_down.jpg` — Vista Superior  
- `low_angle.jpg` — Ângulo Baixo
- `high_angle.jpg` — Ângulo Alto
- `close_up.jpg` — Close-up
- `wide_shot.jpg` — Plano Geral
- `dutch_angle.jpg` — Ângulo Holandês

### 2. Criar componente `CameraAngleGrid`
Novo arquivo: `src/components/quick-content/CameraAngleGrid.tsx`

- Seguir exatamente a mesma estrutura do `VisualStyleGrid`:
  - Card com imagem de preview, ícone, título e descrição do ângulo selecionado
  - Botão "Alterar" com chevron
  - Modal (`Dialog`) com grid de cards visuais para todos os 7 ângulos
- Props: `value: string`, `onChange: (value: string) => void`
- Cada ângulo terá ícone, label, descrição breve e imagem de referência

### 3. Atualizar `CreateImage.tsx`
- Importar `CameraAngleGrid`
- Envolver `VisualStyleGrid` + `CameraAngleGrid` em um grid responsivo:
  ```
  grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch
  ```
- Remover a referência ao `cameraAngle` da seção colapsável "Informações adicionais" (se existir lá)
- O valor já é enviado ao backend via `formData.cameraAngle`, sem mudanças necessárias na lógica de submit

### 4. Backend
Nenhuma alteração necessária — tanto `generate-image` quanto `generate-quick-content` já recebem e processam `cameraAngle` no prompt enviado ao Gemini (linha `Câmera: ${cameraAngle}`).

## Detalhes técnicos

- Valor default: `eye_level` (já definido no formData inicial)
- O backend já faz o mapeamento: se `cameraAngle !== 'eye_level'`, inclui `Câmera: {valor}` nas configurações visuais avançadas
- Responsividade: `grid-cols-1` em telas pequenas, `lg:grid-cols-2` em desktop grande — ambos os cards ocupam metade da largura

