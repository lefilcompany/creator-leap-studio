# Configuração do Webhook do Stripe

## Passos para Configurar o Webhook

### 1. Acesse o Dashboard do Stripe
- Vá para [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
- Faça login na sua conta

### 2. Adicione um Novo Endpoint
- Clique em "Add endpoint" ou "Adicionar endpoint"
- Insira a URL do webhook: `https://afxwqkrneraatgovhpkb.supabase.co/functions/v1/stripe-webhook`

### 3. Selecione os Eventos
Marque os seguintes eventos para o webhook escutar:
- `checkout.session.completed` - Quando uma sessão de checkout é concluída com sucesso

### 4. Copie o Signing Secret
- Após criar o webhook, copie o "Signing secret" (começa com `whsec_...`)
- Esse secret já foi configurado no sistema como `STRIPE_WEBHOOK_SECRET`

### 5. Configure os Produtos no Stripe
Certifique-se de que cada plano tem um Produto e Preço (Price) configurados no Stripe:

| Plano      | Product ID (exemplo)  | Price ID (exemplo)   |
|------------|-----------------------|----------------------|
| Basic      | prod_TQFRF4g5MPxoSG  | price_1234...        |
| Pro        | prod_TQFSnXcPofocWV  | price_5678...        |
| Premium    | prod_TQFSDtV5XhpDH0  | price_9012...        |
| Business   | prod_TQFTk9Rh4tMH3U  | price_3456...        |
| Enterprise | prod_TQFTH5994CZA2y  | price_7890...        |

### 6. Atualize o Mapeamento de Produtos
No arquivo `supabase/functions/stripe-webhook/index.ts`, verifique se o mapeamento está correto:

```typescript
const productToPlanMap: Record<string, { planId: string, credits: number }> = {
  'prod_TQFRF4g5MPxoSG': { planId: 'pack_basic', credits: 80 },
  'prod_TQFSnXcPofocWV': { planId: 'pack_pro', credits: 160 },
  'prod_TQFSDtV5XhpDH0': { planId: 'pack_premium', credits: 320 },
  'prod_TQFTk9Rh4tMH3U': { planId: 'pack_business', credits: 640 },
  'prod_TQFTH5994CZA2y': { planId: 'pack_enterprise', credits: 1280 },
};
```

## Como Funciona o Fluxo

1. **Usuário clica em "Assinar Plano"**
   - O PlanSelector chama a edge function `create-checkout`
   - A função cria uma sessão de checkout no Stripe
   - Usuário é redirecionado para o Stripe Checkout

2. **Usuário completa o pagamento no Stripe**
   - O Stripe processa o pagamento
   - Após sucesso, o Stripe envia um webhook para nossa aplicação

3. **Webhook processa o pagamento**
   - Recebe o evento `checkout.session.completed`
   - Valida a assinatura do webhook usando o `STRIPE_WEBHOOK_SECRET`
   - Busca o usuário pelo email
   - Identifica o plano pelo Product ID
   - **Adiciona os créditos automaticamente ao time**
   - Atualiza o plano da equipe
   - Registra a compra no histórico

4. **Usuário é redirecionado**
   - Após o pagamento, o Stripe redireciona para `/payment-success`
   - A página verifica se os créditos foram adicionados
   - Mostra confirmação ao usuário

## Testando o Webhook

### Usando o Stripe CLI (Local)
```bash
stripe listen --forward-to https://afxwqkrneraatgovhpkb.supabase.co/functions/v1/stripe-webhook
```

### Testando Pagamentos
Use os cartões de teste do Stripe:
- Sucesso: `4242 4242 4242 4242`
- Falha: `4000 0000 0000 0002`

## Logs e Debugging

### Ver logs do webhook no Stripe
- Dashboard → Webhooks → Selecione o endpoint → "Recent events"

### Ver logs da edge function
- Use a ferramenta de logs do Lovable Cloud
- Ou verifique os logs no dashboard do Supabase

## Segurança

✅ **O que está configurado:**
- JWT desabilitado para o webhook (`verify_jwt = false`)
- Validação de assinatura do Stripe usando `STRIPE_WEBHOOK_SECRET`
- Uso de `SUPABASE_SERVICE_ROLE_KEY` para operações privilegiadas
- Verificação de email do usuário antes de adicionar créditos

⚠️ **Importante:**
- NUNCA exponha o `STRIPE_WEBHOOK_SECRET` no código frontend
- NUNCA remova a verificação de assinatura do webhook
- Sempre valide os dados recebidos do webhook antes de processar
