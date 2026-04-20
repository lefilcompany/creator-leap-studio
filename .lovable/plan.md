

## Plano: Exportar Histórico Selecionado para PowerPoint (.pptx)

### Visão Geral

Adicionar a capacidade de exportar conteúdos selecionados do histórico como um arquivo `.pptx` editável usando **PptxGenJS**. O fluxo aproveita o sistema de seleção em massa que já existe (`BulkSelectionBar`).

### Fluxo do Usuário

1. No `/history`, o usuário ativa o modo seleção e marca os conteúdos desejados.
2. Na barra flutuante de ações em massa surge um novo botão **"Exportar PPT"**.
3. Ao clicar, o sistema busca os dados completos das ações (legenda, imagem, marca, plataforma) e gera o `.pptx`.
4. Um overlay de progresso é exibido enquanto as imagens são baixadas e convertidas em base64.
5. O arquivo é baixado automaticamente: `historico-creator-AAAA-MM-DD.pptx`.

### Estrutura do PPTX

Cada ação selecionada vira **um slide** (16:9, 10" x 5.625"), com layout dividido:

```text
+----------------------------------------------------------+
|  [Logo/Marca] Nome da Marca         Data  •  Plataforma  |
|----------------------------------------------------------|
|                          |                               |
|   IMAGEM/THUMB           |  Título (negrito)             |
|   (com aspect ratio      |                               |
|    correto, sem corte)   |  Legenda completa             |
|                          |  ...                          |
|                          |                               |
|                          |  #hashtag1 #hashtag2          |
|----------------------------------------------------------|
|  Tipo de ação                       Criado por: Creator  |
+----------------------------------------------------------+
```

- **Slide de capa**: título "Histórico Creator", contagem de itens, data de exportação, marca d'água "Creator by Lefil".
- **Slides sem imagem** (texto puro / planos): layout single-column ocupando a largura toda.
- **Vídeos**: usa o thumbnail (frame extraído do vídeo) ou um ícone placeholder + link clicável para a URL.

### Implementação Técnica

**1. Dependência**
- Adicionar `pptxgenjs` (~150 KB gzipped, roda 100% no client).

**2. Novo arquivo: `src/lib/exportHistoryToPptx.ts`**
- Função `exportActionsToPptx(actionIds: string[], onProgress?)`.
- Busca dados completos via `supabase.from('actions').select('*, brands(name, brand_color, avatar_url)').in('id', actionIds)`.
- Converte cada `imageUrl` para base64 via `fetch` + `FileReader` (PptxGenJS exige base64 ou URL com CORS — base64 é mais confiável para o storage do Supabase).
- Detecta dimensões da imagem para preservar proporção (usa `Image()` em memória).
- Sanitiza textos (remove markdown, normaliza quebras de linha).
- Trata fallbacks: imagem ausente → ícone, marca nula → "Sem marca".

**3. Novo botão em `BulkSelectionBar.tsx`**
- Adicionar prop `onBulkExportPptx: () => Promise<void>`.
- Botão entre "Categoria" e "Apagar" com ícone `FileDown` ou `Presentation` e label **"Exportar PPT"**.
- Mostra `Loader2` girando enquanto exporta.

**4. Handler em `History.tsx`**
- `handleBulkExportPptx`: chama `exportActionsToPptx(Array.from(bulkSelectedIds))`, mostra toast de progresso ("Baixando imagens..." → "Gerando PPT..."), e ao final um toast de sucesso com a contagem.
- Limpa a seleção após sucesso.

**5. Tratamento de Erros**
- Imagens que falharem ao baixar (CORS/404): slide é gerado sem imagem, com aviso visual sutil ("Imagem indisponível").
- Erro fatal: toast de erro + mantém seleção para o usuário tentar de novo.
- Limite de segurança: alerta se >50 itens selecionados ("A geração pode demorar alguns segundos").

### Design dos Slides

- **Fonte**: Calibri (compatível PowerPoint/Keynote/Google Slides).
- **Paleta**: cinza-escuro `#2D1F28` (header), branco (fundo), accent `#E91E63` para badges de tipo de ação, cores reais da marca quando disponível em `brand_color`.
- **Imagem**: encaixada em uma área de 4.5" x 4.5" com `sizing: { type: 'contain' }` para nunca cortar.
- **Sem efeitos AI-genéricos**: sem linhas decorativas abaixo de títulos, sem accent lines.

### Arquivos Afetados

| Arquivo | Mudança |
|---|---|
| `package.json` | + `pptxgenjs` |
| `src/lib/exportHistoryToPptx.ts` | **novo** — toda a lógica de geração |
| `src/components/historico/BulkSelectionBar.tsx` | + botão "Exportar PPT" + estado de loading |
| `src/pages/History.tsx` | + `handleBulkExportPptx` + passagem da prop |

### Notas

- Tudo client-side: nenhuma edge function necessária, sem custo de créditos.
- Imagens no bucket `content-images` são públicas, então o `fetch` direto funciona; CORS já está habilitado pelo Supabase Storage.
- O `.pptx` gerado é totalmente editável (texto, imagem e layout) no PowerPoint, Keynote e Google Slides.

