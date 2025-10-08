# 🧪 Guia Completo de Testes Stripe

## ✅ Status da Configuração

### Sistema já configurado com:
- ✅ Produtos Stripe criados (Basic, Pro, Enterprise)
- ✅ Preços configurados (R$ 59,90 | R$ 99,90 | R$ 499,90)
- ✅ Planos no banco de dados atualizados
- ✅ Mapeamento Product ID → Plan ID configurado
- ✅ Edge Functions prontas (`create-checkout` e `check-subscription`)

## 🔑 Verificação da Chave Stripe

**IMPORTANTE**: Certifique-se de que está usando uma chave de TESTE do Stripe.

- Chave de teste começa com: `sk_test_...`
- Chave de produção começa com: `sk_live_...`

A chave está configurada como secret `STRIPE_SECRET_KEY` no backend.

## 💳 Cartões de Teste do Stripe

### ✅ Cartões de Sucesso

| Número | Descrição | Uso |
|--------|-----------|-----|
| `4242 4242 4242 4242` | Sucesso simples | Teste padrão |
| `4000 0025 0000 3155` | Requer 3D Secure | Teste autenticação |
| `5555 5555 5555 4444` | Mastercard sucesso | Teste alternativo |

### ❌ Cartões de Erro

| Número | Erro | Uso |
|--------|------|-----|
| `4000 0000 0000 0002` | Cartão recusado | Teste falha genérica |
| `4000 0000 0000 9995` | Fundos insuficientes | Teste falha específica |
| `4000 0000 0000 0127` | CVC incorreto | Teste validação |

**Dados adicionais para todos os testes:**
- **Data de validade**: Qualquer data futura (ex: 12/25)
- **CVV**: Qualquer 3 dígitos (ex: 123)
- **CEP**: Qualquer válido (ex: 12345)

## 🧪 Procedimento de Testes

### Fase 1: Teste de Checkout Básico

1. **Fazer login no sistema**
   - Acesse a aplicação
   - Faça login com sua conta de teste

2. **Navegar para planos**
   - Vá para `/plans`
   - Visualize os planos disponíveis

3. **Iniciar assinatura**
   - Clique em "Assinar Agora" em qualquer plano
   - Verifique se abre nova aba do Stripe Checkout

4. **Completar pagamento**
   - Use cartão `4242 4242 4242 4242`
   - Preencha dados fictícios
   - Complete o checkout

5. **Verificar redirecionamento**
   - Deve voltar para `/plans?success=true`
   - Aguarde processamento (até 30 segundos)

### Fase 2: Validação de Assinatura

**Sistema faz 10 tentativas automáticas:**
- Intervalo: 3 segundos entre tentativas
- Total: ~30 segundos de processamento

**O que deve acontecer:**

1. ✅ Plano da equipe atualizado
2. ✅ Créditos restaurados
3. ✅ Data de renovação configurada
4. ✅ Status de assinatura atualizado
5. ✅ Interface mostrando novo plano

### Fase 3: Testes de Erro

#### Teste 1: Cartão Recusado
- Use cartão `4000 0000 0000 0002`
- Verifique mensagem de erro do Stripe
- Confirme que plano não mudou

#### Teste 2: Cancelamento de Checkout
- Inicie processo de assinatura
- Feche a aba do Stripe antes de completar
- Verifique que retorna para `/plans?canceled=true`
- Confirme que nenhuma cobrança foi feita

#### Teste 3: 3D Secure
- Use cartão `4000 0025 0000 3155`
- Complete autenticação adicional
- Verifique processamento bem-sucedido

### Fase 4: Verificação de Dados

#### No Banco de Dados (tabela `teams`):

```sql
SELECT 
  name,
  plan_id,
  stripe_subscription_id,
  subscription_status,
  subscription_period_end,
  credits_quick_content,
  credits_suggestions,
  credits_plans,
  credits_reviews
FROM teams 
WHERE admin_id = 'SEU_USER_ID';
```

**Validar:**
- `plan_id` mudou para o plano escolhido
- `stripe_subscription_id` foi preenchido
- `subscription_status` está como 'active'
- `subscription_period_end` é uma data futura
- Créditos foram restaurados

#### No Stripe Dashboard:

1. Acesse: https://dashboard.stripe.com/test/payments
2. Verifique se aparece o pagamento
3. Acesse: https://dashboard.stripe.com/test/subscriptions
4. Confirme que a assinatura está ativa

## 📊 Monitoramento de Logs

### Logs do Edge Function `create-checkout`:

Procure por:
- `[CREATE-CHECKOUT] Function started`
- `[CREATE-CHECKOUT] User authenticated`
- `[CREATE-CHECKOUT] Checkout session created`

### Logs do Edge Function `check-subscription`:

Procure por:
- `[CHECK-SUBSCRIPTION] Function started`
- `[CHECK-SUBSCRIPTION] User authenticated`
- `[CHECK-SUBSCRIPTION] Valid subscription found`
- `[CHECK-SUBSCRIPTION] Team updated successfully`

## 🎯 Checklist de Validação Final

- [ ] Checkout abre em nova aba
- [ ] Pagamento processado com sucesso
- [ ] Redirecionamento funciona
- [ ] Plano atualizado automaticamente
- [ ] Créditos restaurados corretamente
- [ ] Interface mostra novo plano
- [ ] Logs confirmam sucesso
- [ ] Stripe Dashboard mostra assinatura ativa
- [ ] Cartões de erro funcionam corretamente
- [ ] Cancelamento não cobra nada

## 🔄 Fluxo Completo do Sistema

```
Usuário clica "Assinar"
    ↓
create-checkout cria sessão
    ↓
Stripe Checkout processa pagamento
    ↓
Redireciona para /plans?success=true
    ↓
Sistema chama check-subscription (10x)
    ↓
check-subscription verifica no Stripe
    ↓
Encontra assinatura ativa
    ↓
Atualiza plano e créditos no banco
    ↓
Interface atualiza automaticamente
```

## ⚠️ Pontos de Atenção

### ❌ NÃO FAZER:

1. **NÃO** misture chaves de teste e produção
2. **NÃO** use cartões reais em modo teste
3. **NÃO** teste em produção sem planejamento
4. **NÃO** esqueça de verificar logs em caso de erro

### ✅ FAZER:

1. **USE** sempre cartões de teste
2. **VERIFIQUE** logs em cada teste
3. **AGUARDE** os 30 segundos de processamento
4. **DOCUMENTE** qualquer comportamento inesperado

## 🐛 Troubleshooting

### Problema: Plano não atualiza após pagamento

**Solução:**
1. Aguarde 30 segundos completos
2. Verifique logs do `check-subscription`
3. Verifique se Product ID está no mapeamento
4. Confirme que assinatura está "active" no Stripe

### Problema: Checkout não abre

**Solução:**
1. Verifique console do navegador
2. Confirme que `STRIPE_SECRET_KEY` está configurada
3. Verifique logs do `create-checkout`
4. Confirme autenticação do usuário

### Problema: Erro "No customer found"

**Solução:**
1. Sistema cria customer automaticamente
2. Se persistir, verifique email do usuário
3. Confirme que Stripe está em modo teste

## 📈 Métricas de Sucesso

Um teste bem-sucedido deve ter:
- ✅ Tempo de checkout < 2 minutos
- ✅ Atualização automática em < 30 segundos
- ✅ 0 erros nos logs
- ✅ Dados consistentes entre Stripe e banco
- ✅ Interface refletindo mudanças imediatamente

## 🎓 Mapeamento Atual

### Produtos e Preços:

| Plano | Product ID | Price ID | Valor Mensal |
|-------|-----------|----------|--------------|
| Basic | `prod_T9jUCs242AIVtk` | `price_1SDQ1kAGsH8eqXqH5qIn9Fwh` | R$ 59,90 |
| Pro | `prod_T9jXbWuVLAjyRy` | `price_1SDQ49AGsH8eqXqHpfPRNVi8` | R$ 99,90 |
| Enterprise | `prod_T9jXEcmoxn2ROu` | `price_1SDQ4QAGsH8eqXqHygze0JAf` | R$ 499,90 |

### Créditos por Plano:

| Plano | Criações Rápidas | Sugestões | Planos | Revisões |
|-------|------------------|-----------|---------|----------|
| Free | 100 | 50 | 10 | 20 |
| Basic | (ver banco) | (ver banco) | (ver banco) | (ver banco) |
| Pro | (ver banco) | (ver banco) | (ver banco) | (ver banco) |
| Enterprise | (ver banco) | (ver banco) | (ver banco) | (ver banco) |

---

**Última atualização**: 2025-10-08
**Status**: Sistema pronto para testes
**Modo**: Teste (Test Mode)
