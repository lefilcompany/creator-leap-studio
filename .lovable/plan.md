
# Plano: Alterar Créditos Grátis de 20 para 5

## Resumo
Alterar a quantidade de créditos grátis dados a novos usuários de 20 para 5 créditos.

## Alterações Necessárias

### 1. Migração do Banco de Dados
Criar uma nova migração SQL para:

- **Alterar o valor padrão da coluna `credits`** na tabela `profiles` de 20 para 5
- **Atualizar a função `handle_new_user()`** que é executada automaticamente quando um novo usuário se registra, alterando o valor inserido de 20 para 5

```text
┌─────────────────────────────────────────────────────────┐
│                    ANTES                                │
│  INSERT INTO profiles (..., credits, ...)               │
│  VALUES (..., 20, ...)                                  │
├─────────────────────────────────────────────────────────┤
│                    DEPOIS                               │
│  INSERT INTO profiles (..., credits, ...)               │
│  VALUES (..., 5, ...)                                   │
└─────────────────────────────────────────────────────────┘
```

### 2. Atualizar Texto na UI
**Arquivo:** `src/pages/OnboardingCanceled.tsx` (linha 45)

- Alterar a mensagem "Você ainda tem os 20 créditos de boas-vindas" para "Você ainda tem os 5 créditos de boas-vindas"

## Detalhes Técnicos

### Migração SQL
```sql
-- Atualizar o valor padrão de credits para 5
ALTER TABLE public.profiles ALTER COLUMN credits SET DEFAULT 5;

-- Atualizar a função handle_new_user para dar 5 créditos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, credits, plan_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    5,  -- Alterado de 20 para 5
    'free'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

## Impacto
- **Usuários existentes:** Não serão afetados (mantêm seus créditos atuais)
- **Novos usuários:** Receberão 5 créditos ao criar conta
- A alteração é retrocompatível e não afeta nenhuma outra funcionalidade
