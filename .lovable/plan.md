
# Corrigir Toast "Rascunho recuperado" Aparecendo Sem Dados

## Problema
O toast "Rascunho recuperado" aparece toda vez que voce entra nas telas de criacao e revisao, mesmo sem ter nenhum rascunho real salvo. Isso acontece porque:

1. O hook `useFormPersistence` salva o estado do formulario no sessionStorage automaticamente
2. Ao carregar a pagina, o formulario vazio e salvo no storage
3. Na proxima visita, `loadPersistedData()` retorna esse objeto vazio (que passa no `if (persisted)`)
4. O toast e exibido mesmo sem dados relevantes

Apenas a pagina QuickContent usa a verificacao `hasRelevantData` antes de exibir o toast. Todas as outras paginas exibem o toast incondicional.

## Solucao

Mover a validacao de dados relevantes para dentro do proprio hook `useFormPersistence`, tornando-a obrigatoria para todos os consumidores.

### 1. Atualizar `src/hooks/useFormPersistence.ts`

- Modificar `loadPersistedData` para retornar `null` quando os dados forem vazios/padrao (todos os valores sao strings vazias, arrays vazios, ou nulos)
- Adicionar uma funcao interna que verifica se o objeto tem pelo menos um campo com valor significativo (string nao-vazia, array com itens, etc.)

### 2. Atualizar 5 paginas que usam `useFormPersistence`

Adicionar verificacao com `hasRelevantData` antes de exibir o toast em cada pagina:

- **`src/pages/ReviewContent.tsx`** (linha 117): Adicionar checagem se os dados persistidos tem conteudo real antes do `toast.info`
- **`src/pages/CreateContent.tsx`** (linha 174): Idem
- **`src/pages/CreateImage.tsx`** (linha 248): Idem
- **`src/pages/PlanContent.tsx`** (linha 61): Idem
- **`src/pages/QuickContent.tsx`**: Ja usa `hasRelevantData` - manter como esta

### 3. Atualizar 3 dialogs que usam `useDraftForm`

Adicionar verificacao com `hasFormData` antes de exibir o toast:

- **`src/components/personas/PersonaDialog.tsx`** (linha 99): Verificar se o draft tem dados reais
- **`src/components/temas/ThemeDialog.tsx`** (linha 128): Idem
- **`src/components/marcas/BrandDialog.tsx`**: Verificar se ja tem protecao (provavelmente nao exibe toast)

### Detalhes tecnicos

**Padrao a aplicar em cada pagina** (exemplo ReviewContent):
```text
// ANTES:
if (persisted) {
  // restaurar campos...
  toast.info("Rascunho recuperado");
}

// DEPOIS:
if (persisted && hasRelevantData(persisted)) {
  // restaurar campos...
  toast.info("Rascunho recuperado");
}
```

Para as paginas que nao expoe `hasRelevantData` do hook, sera necessario:
- Desestruturar `hasRelevantData` do retorno de `useFormPersistence` (ja existe no hook)
- Ou criar uma funcao auxiliar simples que verifica se algum valor do objeto e significativo

### Arquivos modificados
- `src/pages/ReviewContent.tsx`
- `src/pages/CreateContent.tsx`
- `src/pages/CreateImage.tsx`
- `src/pages/PlanContent.tsx`
- `src/components/personas/PersonaDialog.tsx`
- `src/components/temas/ThemeDialog.tsx`

Nenhuma funcionalidade sera removida - apenas o toast nao aparecera mais quando nao houver dados reais salvos.
