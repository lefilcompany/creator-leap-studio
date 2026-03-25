

# Plano: Novas Imagens de Ângulo + Plano Americano

## Resumo

1. **Gerar 8 imagens** de um objeto genérico (cubo/esfera geométrica) nas cores do sistema (#C3005E, #B26DC3, #1D80B1, #FFFFFF), sem logo, em cenário clean — uma para cada ângulo incluindo o novo "Plano Americano".

2. **Adicionar o ângulo "Plano Americano"** (`american_shot`) ao sistema com ícone `User` do Lucide e descrição: "Enquadramento dos joelhos para cima, equilibra expressão e ação corporal".

3. **Atualizar todos os pontos de uso:**

### Arquivos a alterar

| Arquivo | Mudança |
|---------|---------|
| `src/assets/angles/*.jpg` | Regenerar todas as 7 imagens + criar `american_shot.jpg` |
| `src/components/quick-content/CameraAngleGrid.tsx` | Adicionar import + entrada para `american_shot`; atualizar grid para `sm:grid-cols-4` (8 itens) |
| `src/pages/CreateContent.tsx` | Adicionar `<SelectItem value="american_shot">Plano Americano</SelectItem>` no dropdown (~linha 2194) |
| `supabase/functions/generate-image/index.ts` | Na linha 244, mapear os valores de cameraAngle para descrições em português no prompt (ex: `american_shot` → `Plano Americano (cowboy shot): enquadramento dos joelhos para cima`) |
| `supabase/functions/generate-quick-content/index.ts` | Mesmo mapeamento na linha 202 |

### Detalhes das imagens

Cada imagem será gerada via AI Gateway com prompt descrevendo o mesmo objeto geométrico abstrato (cubo arredondado com faces nas cores #C3005E, #B26DC3, #1D80B1 e #FFFFFF) em fundo neutro de estúdio, visto do ângulo correspondente. Sem logo, sem texto.

### Mapeamento de ângulos no backend

Atualmente o backend envia o valor bruto (`top_down`, `dutch_angle`, etc.). Será adicionado um mapa de tradução para que o prompt enviado ao Gemini contenha descrições fotográficas claras:

```text
eye_level → "Nível dos olhos: perspectiva natural, câmera na altura do sujeito"
top_down → "Vista superior (top-down/flat lay): câmera diretamente acima"
low_angle → "Contra-plongée: câmera de baixo para cima, transmite grandiosidade"
high_angle → "Plongée: câmera de cima para baixo"
close_up → "Close-up: enquadramento muito próximo, foco em detalhes"
wide_shot → "Plano geral (wide shot): enquadramento amplo com contexto"
dutch_angle → "Ângulo holandês (dutch angle): câmera inclinada, cria dinamismo"
american_shot → "Plano americano (cowboy shot): enquadramento dos joelhos/coxas para cima, equilibra expressão facial e ação corporal"
```

Isso substitui a linha `Câmera: ${cameraAngle}` por `Câmera: ${cameraAngleMap[cameraAngle]}` em ambas as edge functions.

