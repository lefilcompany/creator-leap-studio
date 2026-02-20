
# Melhoria do Design da Pagina /privacy

## Objetivo
Alinhar o header card e o accordion da pagina de privacidade com o padrao visual usado nas demais paginas do sistema (Marcas, Historico, etc.).

## Mudancas em `src/pages/Privacy.tsx`

### 1. Header Card - Alinhar com padrao do sistema
O header card atual usa `Card` com `CardHeader`, mas o padrao do sistema usa divs com classes especificas. Sera atualizado para:
- Container: `bg-card rounded-2xl shadow-lg p-4 lg:p-5` (igual Brands/History)
- Icone: container com `bg-primary/10 border border-primary/20 shadow-sm rounded-2xl p-3 lg:p-4` e icone maior `h-8 w-8 lg:h-10 lg:w-10`
- Titulo: `text-2xl lg:text-3xl font-bold text-foreground`
- Descricao: `text-sm lg:text-base text-muted-foreground`

### 2. Accordion - Remover Card wrapper e melhorar items
- Remover o `Card` que envolve o accordion (o sistema nao usa card extra para listas)
- Cada item do accordion sera um card individual com:
  - `bg-card rounded-2xl shadow-sm mb-3` para separacao visual
  - Trigger com padding interno adequado (`p-4 lg:p-5`)
  - Icone maior no trigger (`w-10 h-10` com `rounded-2xl`)
  - Hover com `hover:shadow-md` para feedback visual
  - Conteudo com padding consistente e sem margin-left excessivo
- Bordas removidas dos items (usar gap/margin entre cards)

### 3. Detalhes tecnicos
- Substituir `Card`/`CardHeader`/`CardTitle`/`CardDescription` do header por divs estilizadas
- Manter o accordion funcional mas com visual de cards separados
- Manter scroll, breadcrumb e banner como estao (ja funcionando)

### Arquivo modificado
- `src/pages/Privacy.tsx`
