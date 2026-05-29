## Diagnóstico atual

Hoje existem dois fluxos diferentes:

1. **Imagem única** chama `generate-image` diretamente.
   - Comprime as imagens enviadas.
   - Separa imagens marcadas como **Preservar** das imagens de estilo.
   - Envia para o backend os campos `preserveImages`, `styleReferenceImages`, `brandReferenceImages`, `userReferenceImages` e `preserveImageIndices`.
   - O backend monta um prompt forte dizendo que imagens preservadas são intocáveis e anexa essas imagens ao modelo antes de gerar.

2. **Carrossel** chama `generate-carousel-images`.
   - Ele comprime as imagens enviadas, mas envia tudo em um campo genérico `referenceImages`.
   - Não envia `preserveImageIndices`, `preserveImages`, `styleReferenceImages`, `brandReferenceImages` nem `userReferenceImages`.
   - Dentro de `generate-carousel-images`, cada slide chama `generate-image`, mas passa essas imagens genéricas como `referenceImages`.
   - Só que `generate-image` não usa `referenceImages` no pipeline principal; ele espera os campos do fluxo de imagem única. Resultado: no carrossel, a referência marcada para preservar não entra com a mesma força e pode nem entrar no prompt final como preservação.

Além disso, o carrossel já tenta gerar em paralelo: gera o primeiro slide para definir a thumbnail e depois dispara os demais em `Promise.all`. Mas a chamada para cada slide não está reaproveitando corretamente o mesmo contrato de dados da imagem única.

## Ajuste proposto

1. **Unificar o contrato de referências do carrossel com o da imagem única**
   - No frontend (`CreateImage.tsx`), montar para carrossel os mesmos arrays usados na imagem única:
     - `preserveImages`
     - `styleReferenceImages`
     - `brandReferenceImages`
     - `userReferenceImages`
     - `preserveImageIndices`
   - Respeitar a mesma lógica de priorização: imagens preservadas entram antes; imagens de marca contam como preservação; limite total de referências continua controlado.

2. **Atualizar `generate-carousel-images` para aceitar e repassar esses campos**
   - Expandir o schema da função para aceitar os campos do pipeline premium.
   - Em cada chamada interna para `generate-image`, enviar exatamente esses campos, não apenas `referenceImages`.
   - Manter compatibilidade com `referenceImages` como fallback para carrosséis antigos ou chamadas antigas.

3. **Manter geração paralela com preservação correta**
   - Continuar chamando `generate-image` para cada slide.
   - Cada slide terá seu prompt próprio, mas receberá as mesmas referências preservadas e de estilo do fluxo de imagem única.
   - Ajustar para que, quando `onlyIndex` for usado na regeneração individual, a mesma estrutura de referências continue funcionando.

4. **Salvar metadados úteis no histórico**
   - Registrar no `details/result.carousel` quantas imagens preservadas e de estilo foram usadas.
   - Isso ajuda a auditar quando uma geração não respeitar referência.

## Arquivos a alterar

- `src/pages/CreateImage.tsx`
  - Reaproveitar a lógica de imagens da imagem única no bloco do carrossel.
  - Enviar os campos corretos para `generate-carousel-images`.

- `supabase/functions/generate-carousel-images/index.ts`
  - Atualizar schema.
  - Repassar o payload completo para `generate-image`.
  - Manter fallback com `referenceImages`.

- Possivelmente `src/components/create-content/carousel/types.ts`
  - Só se for necessário refletir metadados de referência no estado do carrossel.

## Resultado esperado

Depois do ajuste, o carrossel passa a usar a mesma função de imagem única por slide, em paralelo, mas com as referências preservadas no formato correto. A imagem/produto enviado e marcado como **Preservar** deve aparecer com muito mais fidelidade nos slides, igual ao comportamento da criação de imagem única.