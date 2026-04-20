

## Plano: Refinamentos no Export PPTX

Três ajustes no fluxo de exportação de histórico para PPT.

### 1. Logo da marca no header de cada slide

No header de cada slide (ao lado do nome da marca), inserir a logo da marca quando `brands.avatar_url` existir.

- Em `src/lib/exportHistoryToPptx.ts`:
  - Pré-buscar todas as logos únicas das marcas selecionadas (1 fetch por marca, em paralelo) e converter para base64 — assim como já fazemos com as imagens.
  - Em `addContentSlide`, se a marca tiver logo: renderizar um quadrado de ~0.4" x 0.4" à esquerda do nome (x: 0.3) e empurrar o texto do nome para `x: 0.8`. Sem logo, mantém layout atual.
  - Aplicar o mesmo tratamento no slide de capa (logo da marca dominante ou múltiplas logos pequenas, se houver várias marcas).

### 2. Modal de exportação com período de referência

Criar um novo componente `src/components/historico/ExportPptxDialog.tsx`:

```text
+----------------------------------------+
|  Exportar para PowerPoint              |
|----------------------------------------|
|  ○ Sem período específico              |
|    (usa a data de hoje na capa)        |
|                                        |
|  ● Conteúdo de um período              |
|    [De: 07/04/2026] [Até: 13/04/2026]  |
|----------------------------------------|
|  ☐ Exportar sem marca d'água Creator   |
|    (consome 2 créditos)                |
|----------------------------------------|
|  Você tem 47 créditos disponíveis      |
|                                        |
|         [Cancelar]  [Exportar (12)]    |
+----------------------------------------+
```

- Dois `Popover` com `Calendar` (date picker) para "De" e "Até" — só ativos quando o radio "período" está selecionado.
- Validação: se período escolhido, ambas as datas obrigatórias e `de <= até`.
- O contador no botão mostra a contagem de slides selecionados.
- Switch "sem marca d'água" desabilitado quando o usuário não tem 2 créditos, com mensagem inline.

### 3. Marca d'água do Creator + opção paga de remover

**Marca d'água (padrão):**
- Adicionar a logo `creator-symbol.png` (já existe em `src/assets/`) como marca d'água em todos os slides — incluindo o slide de capa.
- Posição: canto inferior direito, tamanho ~0.55" x 0.55", opacidade ~25% (via `transparency: 75` do PptxGenJS).
- Carregar a logo uma única vez no início da geração e converter para base64.

**Sem marca d'água (custo: 2 créditos):**
- Quando o usuário marca a opção, ao confirmar:
  1. Frontend chama uma nova edge function `charge-pptx-export` que valida créditos e deduz 2 (`deductUserCredits`) registrando em `credit_history` com `action_type: 'PPTX_EXPORT_NO_WATERMARK'`.
  2. Só após o sucesso da cobrança, a geração começa sem incluir a logo do Creator nos slides.
  3. Refresh do saldo via `refreshUserCredits()` do `AuthContext`.
- Em caso de falha pós-cobrança (ex: erro ao baixar imagens), mostrar toast informando que a cobrança foi efetuada mas a geração falhou; o usuário pode retentar gratuitamente nessa mesma sessão (controle simples via flag local: se `paidWatermarkRemoval === true`, próxima retry não cobra).

### Mudanças técnicas resumidas

| Arquivo | Mudança |
|---|---|
| `src/lib/exportHistoryToPptx.ts` | Aceita opções `{ periodStart?, periodEnd?, includeWatermark }`. Pré-busca logos das marcas. Renderiza marca d'água condicionalmente. Capa mostra "Conteúdo de DD/MM/AAAA a DD/MM/AAAA" quando há período. |
| `src/components/historico/ExportPptxDialog.tsx` | **novo** — modal com radio de período, date pickers, switch de marca d'água, exibição do saldo. |
| `src/components/historico/BulkSelectionBar.tsx` | Botão "Exportar PPT" agora abre o modal em vez de chamar export direto. |
| `src/pages/History.tsx` | `handleBulkExportPptx` recebe as opções do modal; chama edge function de cobrança quando `removeWatermark === true` antes de gerar. |
| `supabase/functions/charge-pptx-export/index.ts` | **nova edge function** — valida JWT, verifica e deduz 2 créditos, registra no histórico. Retorna `{ success, newCredits }`. |
| `supabase/config.toml` | Registra a nova função (`verify_jwt = true`). |
| `src/lib/creditCosts.ts` | Adiciona `PPTX_EXPORT_NO_WATERMARK: 2` para reuso na UI. |

### Notas

- A logo do Creator já existe em `src/assets/creator-symbol.png` — será importada como módulo e convertida para base64 no client.
- As logos de marca vêm de bucket público do Supabase Storage (mesma origem das imagens de conteúdo, já testado e funcional).
- Custo de 2 créditos alinhado com `CAPTION_REVIEW`/`TEXT_REVIEW` (operações leves), refletindo que é cobrança simbólica por personalização e não geração de IA.
- O fluxo mantém retrocompatibilidade: se o usuário escolher "sem período" e "com marca d'água", o PPT é idêntico ao atual + watermark.

