# Plano: corrigir erro de import em `src/pages/TextEditor.tsx`

## Problema
O Vite falha ao resolver `@uiw/color-convert` porque o pacote não está instalado. Apenas `@uiw/react-color-wheel` e `@uiw/react-color-shade-slider` estão presentes.

## Solução
Substituir o import quebrado por implementações locais das funções `hsvaToHex` e `hexToHsva`, mantendo total compatibilidade com o tipo `Hsva` (`{ h, s, v, a }`) usado pelos componentes `Wheel` e `ShadeSlider`.

## Mudanças
**Arquivo**: `src/pages/TextEditor.tsx`

1. Remover a linha:
   ```ts
   import { hsvaToHex, hexToHsva } from "@uiw/color-convert";
   ```
2. Adicionar funções locais logo após os imports:
   - `hsvaToHex({ h, s, v, a })` → `#RRGGBB` (ou `#RRGGBBAA` quando `a < 1`)
   - `hexToHsva(hex)` → aceita `#RGB`, `#RRGGBB`, `#RRGGBBAA` e retorna `{ h, s, v, a }`

Sem nova dependência, sem mudança de comportamento do color picker, sem alterações em outros arquivos.

## Fora de escopo
- Refatorar o color picker
- Atualizar o `package.json`
- Mexer em outras telas
