

# Plano: Imagens aprovadas como referência visual na geração

## Situação atual

O sistema já salva `image_url` e `thumb_path` no `creation_feedback` e consolida contagens no `brand_style_preferences`. Porém, as Edge Functions de geração (`generate-image` e `generate-quick-content`) apenas injetam texto sobre os totais — **nunca enviam as imagens aprovadas como referência visual para o modelo**.

## O que será feito

Quando uma marca tem imagens com feedback positivo, as últimas 2-3 imagens aprovadas serão buscadas do Storage e enviadas como referência visual ao modelo de IA, junto com instruções para seguir esse estilo.

## Etapas

### 1. Buscar imagens aprovadas no backend (Edge Functions)

Nas duas Edge Functions (`generate-image` e `generate-quick-content`), após buscar `brand_style_preferences`, adicionar uma query ao `creation_feedback` para obter as últimas 3 imagens com rating positivo para a marca:

```sql
SELECT image_url, thumb_path 
FROM creation_feedback 
WHERE brand_id = ? AND rating = 'positive' 
  AND (image_url IS NOT NULL OR thumb_path IS NOT NULL)
ORDER BY created_at DESC 
LIMIT 3
```

### 2. Converter URLs do Storage em base64

As imagens estão no bucket `content-images` (público). O backend fará fetch dessas URLs, converterá para base64 e as adicionará como `image_url` parts no payload enviado ao modelo Gemini — da mesma forma que as referências manuais do usuário já são enviadas.

### 3. Injetar instruções contextuais no prompt

Junto com as imagens, adicionar ao prompt uma instrução clara:

> "REFERÊNCIAS DE ESTILO APROVADO: As imagens a seguir foram aprovadas pelo usuário como exemplos do estilo visual desejado para esta marca. Use-as como referência forte para cores, composição, atmosfera e estilo geral."

### 4. Limite e prioridade

- Máximo de **3 imagens de feedback** aprovado por geração
- Imagens de referência manuais do usuário têm prioridade sobre as de feedback
- Total de referências (manuais + feedback) limitado ao máximo já existente (5)
- Se o usuário já forneceu 5+ referências manuais, as de feedback não são adicionadas

## Arquivos modificados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/generate-image/index.ts` | Buscar feedback positivo, fetch imagens, adicionar ao prompt |
| `supabase/functions/generate-quick-content/index.ts` | Mesmo tratamento |

## Detalhes técnicos

- As imagens do bucket público são acessíveis via URL direta (`content-images`)
- O fetch será feito no backend (Deno) e convertido para base64 inline
- Timeout de 5s por imagem com fallback silencioso (se falhar, pula)
- Nenhuma mudança no frontend ou banco de dados necessária

