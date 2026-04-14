

## Padronizar CORS Headers em Todas as Edge Functions

### Problema
A maioria das edge functions usa headers CORS mínimos (`authorization, x-client-info, apikey, content-type`), enquanto 3 functions (`customer-portal`, `setup-card`, `platform-chat`) incluem headers extras do SDK Supabase. Versões mais recentes do client JS enviam esses headers extras, e se não forem aceitos, o preflight CORS falha.

### Solução
Atualizar **todas as 30+ edge functions** para usar os headers completos do SDK:

```
"authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version"
```

### Arquivos a alterar (~30 files)
Cada arquivo em `supabase/functions/*/index.ts` que define `corsHeaders` com os headers mínimos terá a string `Access-Control-Allow-Headers` atualizada para incluir os 4 headers extras. Nenhuma outra alteração de lógica.

### Functions que já estão corretas (não precisam de alteração)
- `customer-portal/index.ts`
- `setup-card/index.ts`
- `platform-chat/index.ts`

### Functions a atualizar
- `generate-quick-content`, `generate-image`, `generate-video`, `generate-caption`, `generate-plan`
- `edit-image`, `animate-image`, `review-caption`, `review-image`, `review-text-for-image`, `revise-caption-openai`
- `create-checkout`, `check-subscription`, `verify-payment`, `daily-subscription-check`, `stripe-webhook`, `get-stripe-revenue`
- `delete-account`, `deactivate-account`, `reset-user-password`, `send-reset-password-email`
- `redeem-coupon`, `check-gemini-quota`, `cleanup-trash`, `send-report-email`
- `rd-station-integration`, `migrate-brands`, `migrate-users`, `migrate-personas`, `migrate-strategic-themes`, `migrate-action-images`

