

# Plano: Agente de Compliance/Moderação Pós-Geração

## Objetivo
Adicionar uma etapa automática de verificação de compliance em todas as criações de imagem. Após a imagem ser gerada e antes de retornar o resultado ao usuário, um agente de IA (Gemini) analisa a imagem e seu conteúdo textual para detectar violações de diretrizes, leis, conteúdo ofensivo, marcas registradas, etc.

## Arquitetura

```text
Geração da Imagem → Upload ao Storage → [NOVO] Agente de Compliance → Retorno ao Usuário
                                              │
                                              ├─ APROVADO → retorna normalmente
                                              └─ REPROVADO → retorna com flag + motivos
```

O resultado **nunca é bloqueado** — a imagem é entregue ao usuário, mas acompanhada de um campo `complianceCheck` com status e alertas. Isso permite que o usuário decida, mas com total transparência sobre riscos.

## Detalhes Técnicos

### 1. Criar módulo compartilhado `_shared/complianceCheck.ts`
Função reutilizável que:
- Recebe a URL pública da imagem (ou base64) e o texto/legenda associados
- Envia para Gemini Vision (gemini-2.5-flash) com um prompt de moderação
- Analisa: conteúdo ofensivo, discriminatório, violação de direitos autorais/marcas, informações falsas, conteúdo regulado (saúde, financeiro), nudez/violência, textos ilegíveis ou enganosos
- Retorna um objeto estruturado: `{ approved: boolean, score: number, flags: string[], details: string }`

### 2. Integrar nos 3 pipelines de geração de imagem

**Funções afetadas:**
- `generate-image/index.ts` (criação completa)
- `generate-quick-content/index.ts` (criação rápida / marketplace)
- `edit-image/index.ts` (edição de imagem)

Em cada uma, após o upload ao storage e antes do retorno final:
- Chamar `checkCompliance(imageUrl, textos)`
- Incluir o resultado no campo `result` da action salva e na resposta JSON

### 3. Exibir alertas no frontend

**Páginas afetadas:**
- `ContentResult.tsx`
- `QuickContentResult.tsx`
- `ActionView.tsx`

Criar um componente `ComplianceAlert` que:
- Mostra um badge verde "Aprovado" se sem flags
- Mostra alertas amarelos/vermelhos com os motivos encontrados
- Permite ao usuário reconhecer e prosseguir

### 4. Prompt do Agente de Compliance

O agente verificará:
- Conteúdo sexual, violento ou discriminatório
- Uso indevido de símbolos protegidos, marcas registradas ou logotipos
- Alegações de saúde, financeiras ou jurídicas sem embasamento
- Textos ilegíveis, truncados ou com erros graves
- Violação de direitos de imagem (rostos identificáveis sem contexto)
- Conteúdo que possa violar leis brasileiras (CDC, LGPD, ECA, Marco Civil)

### 5. Sem custo extra de créditos
A verificação de compliance não consome créditos do usuário — é uma etapa de segurança do sistema.

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/_shared/complianceCheck.ts` | **Criar** — módulo compartilhado |
| `supabase/functions/generate-image/index.ts` | Modificar — integrar chamada |
| `supabase/functions/generate-quick-content/index.ts` | Modificar — integrar chamada |
| `supabase/functions/edit-image/index.ts` | Modificar — integrar chamada |
| `src/components/ComplianceAlert.tsx` | **Criar** — componente de alerta |
| `src/pages/ContentResult.tsx` | Modificar — exibir compliance |
| `src/pages/QuickContentResult.tsx` | Modificar — exibir compliance |
| `src/pages/ActionView.tsx` | Modificar — exibir compliance |

## Impacto no Tempo de Geração
A verificação adiciona ~3-5 segundos (uma chamada Gemini Vision leve). Se falhar, a imagem é entregue normalmente sem o check (fail-open para não bloquear o usuário).

