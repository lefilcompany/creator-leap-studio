

## Plano: Atualização de Custos de Créditos e Preços no Stripe

### Resumo das Alterações

| Ação | Antes | Depois |
|------|-------|--------|
| Imagem rápida (QUICK_IMAGE) | 5 | **3** |
| Imagem completa (COMPLETE_IMAGE) | 6 | **8** |
| Vídeo (VIDEO_GENERATION) | 20 | **25** |
| Revisão de imagem (após completa) | 2 | **4** (novo tipo) |
| Revisão de imagem (após rápida) | 2 | **2** (mantém) |
| Revisão de conteúdo (legenda/texto) | 2 | **2** (mantém) |
| Calendário de conteúdo (CONTENT_PLAN) | 3 | **8** |
| Preço por crédito avulso | R$ 2,50 | **R$ 2,90** |

**Novos preços dos pacotes (R$ 2,90/crédito):**
- Basic (80 créditos): R$ 197 → **R$ 232,00**
- Pro (160 créditos): R$ 398 → **R$ 464,00**
- Premium (320 créditos): R$ 749 → **R$ 928,00**
- Business (640 créditos): R$ 1.499 → **R$ 1.856,00**
- Enterprise: mantém sob consulta via WhatsApp

---

### Etapas de Implementação

#### 1. Atualizar custos de créditos (frontend)
**Arquivo:** `src/lib/creditCosts.ts`
- Alterar `QUICK_IMAGE: 3`, `COMPLETE_IMAGE: 8`, `VIDEO_GENERATION: 25`, `CONTENT_PLAN: 8`
- Adicionar novo tipo `IMAGE_REVIEW_COMPLETE: 4` (revisão após imagem completa)
- Manter `IMAGE_REVIEW: 2` (revisão após imagem rápida)

#### 2. Atualizar custos de créditos (backend)
**Arquivo:** `supabase/functions/_shared/creditCosts.ts`
- Mesmas alterações do frontend, incluindo `IMAGE_REVIEW_COMPLETE: 4`

#### 3. Diferenciar revisão por contexto
**Arquivos afetados:**
- `src/pages/ContentResult.tsx` — Trocar `IMAGE_REVIEW` por `IMAGE_REVIEW_COMPLETE` (4 créditos)
- `src/pages/QuickContentResult.tsx` — Mantém `IMAGE_REVIEW` (2 créditos)
- `src/pages/ReviewContent.tsx` — Manter como está (usa `IMAGE_REVIEW` = 2)
- `supabase/functions/review-image/index.ts` — Aceitar parâmetro `source` do frontend para usar `IMAGE_REVIEW_COMPLETE` (4) ou `IMAGE_REVIEW` (2)

#### 4. Atualizar preço do crédito avulso
**Arquivos:**
- `src/pages/Credits.tsx` — `CREDIT_PRICE = 2.9`
- `src/pages/Onboarding.tsx` — `CREDIT_PRICE = 2.9`
- `src/components/PostRegistrationPurchaseModal.tsx` — `CREDIT_PRICE = 2.9`
- `supabase/functions/create-checkout/index.ts` — `credits * 290` (290 centavos) e atualizar descrição

#### 5. Criar novos preços no Stripe
Criar novos preços para cada produto com os valores atualizados:
- Basic: R$ 232,00 (23200 centavos)
- Pro: R$ 464,00 (46400 centavos)
- Premium: R$ 928,00 (92800 centavos)
- Business: R$ 1.856,00 (185600 centavos)

#### 6. Atualizar tabela `plans` no banco de dados
Atualizar `price_monthly` e `stripe_price_id_monthly` de cada pacote com os novos valores e IDs de preço do Stripe.

#### 7. Atualizar labels e descrições
- Adicionar label para `IMAGE_REVIEW_COMPLETE` em `getCreditCostLabel`
- Atualizar texto da descrição nos Stripe products

---

### Detalhes Técnicos

- A diferenciação de custo de revisão de imagem será feita enviando um parâmetro `source` ("complete" ou "quick") do frontend para a edge function `review-image`, que usará `CREDIT_COSTS.IMAGE_REVIEW_COMPLETE` ou `CREDIT_COSTS.IMAGE_REVIEW` conforme o caso.
- Os preços antigos no Stripe serão mantidos (não é possível deletá-los se já tiveram transações), mas os novos serão referenciados no banco.
- A compra avulsa dinâmica usará `290` centavos por crédito em vez de `250`.

