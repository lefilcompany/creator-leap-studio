# Plano — Implementação TDD da ADR 0001 (Backend de Templates)

Aprovado: escopo completo (migration + 4 edge functions), Deno.test + psql, `TEMPLATE_IMAGE=4`, migration aplicada ao aprovar o plano.

## Princípio (skill /skill:tdd)
Trabalho em **fatias verticais**: para cada comportamento, um teste vermelho → código mínimo para passar → próximo. Sem escrever todos os testes antes de todo o código. Testes validam comportamento via interface pública (HTTP da edge function, RPCs, RLS efetivo), nunca detalhes internos.

## Fase 0 — Custo `TEMPLATE_IMAGE`
Adicionar `TEMPLATE_IMAGE: 4` em dois arquivos espelhados:
- `supabase/functions/_shared/creditCosts.ts`
- `src/lib/creditCosts.ts`

## Fase 1 — Migration (uma migration única)

Tabela `public.brand_templates` conforme ADR §2.1 + colunas auxiliares padrão.

Estrutura (resumo dos campos relevantes — schemas JSONB validados na app):
- `id uuid PK default gen_random_uuid()`
- `brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE`
- `user_id uuid NOT NULL` (auth.users id, sem FK conforme convenção do projeto)
- `workspace_id uuid` (preenchido por trigger `set_workspace_id_from_user`)
- `name text NOT NULL`
- `source_type text NOT NULL CHECK (source_type IN ('pdf','png'))`
- `source_file_path text NOT NULL`
- `preview_path text`
- `clean_background_path text`
- `width int`, `height int`
- `text_zones jsonb NOT NULL DEFAULT '[]'::jsonb`
- `logo_slot jsonb`
- `font_assets jsonb NOT NULL DEFAULT '{}'::jsonb`
- `status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','failed'))`
- `deleted_at timestamptz`
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`

Índices: `(brand_id) WHERE deleted_at IS NULL`, `(workspace_id)`, `(user_id)`, `(deleted_at)` para o cleanup-trash.

GRANTs:
- `GRANT SELECT, INSERT, UPDATE, DELETE ON public.brand_templates TO authenticated;`
- `GRANT ALL ON public.brand_templates TO service_role;`

RLS (4 policies — `using` e `with check` via `can_access_workspace_resource` resolvendo `team_id` a partir da `brands`):

```text
SELECT/INSERT/UPDATE/DELETE  USING/CHECK
  can_access_workspace_resource(
    user_id,
    workspace_id,
    (SELECT team_id FROM brands WHERE id = brand_id)
  )
```

Triggers:
1. `BEFORE INSERT` → `set_workspace_id_from_user` (já existe no projeto).
2. `BEFORE UPDATE` → `update_updated_at_column` (já existe).
3. `BEFORE INSERT` → nova função `enforce_brand_template_limit()` (SECURITY DEFINER, search_path=public): rejeita se `COUNT(*) WHERE brand_id=NEW.brand_id AND deleted_at IS NULL >= 10` com `RAISE EXCEPTION 'Limite de 10 templates por marca atingido'`.

Bucket: `brand-templates` (privado) criado via `supabase--storage_create_bucket` (não via SQL). Policies em `storage.objects` no mesmo migration:
- 4 policies (SELECT/INSERT/UPDATE/DELETE) restritas a `is_workspace_member((storage.foldername(name))[1]::uuid, auth.uid())`.

Soft-delete: `cleanup-trash` será estendido em fase separada (fora desta ADR) — aqui só garantimos coluna `deleted_at` indexada.

## Fase 2 — Edge functions (TDD vertical, uma por vez)

Para cada função, ciclo: escrever `index.test.ts` com 1 caso → criar `index.ts` mínimo → adicionar próximo caso → repetir → refatorar.

Cobertura de comportamento alvo por função:

### `import-brand-template`
- 401 sem JWT
- 400 sem `brand_id` / arquivo / MIME inválido / PDF >1 página / >5MB
- 403 quando usuário não tem acesso à brand
- 422 quando atingiu limite de 10 templates (via trigger)
- 200 happy path: cria linha `status='draft'`, sobe `source.*` + `preview.png` ao bucket, devolve `{ template_id, text_zones, logo_slot, clean_background_url }`
- IA (Vision/Inpainting): mockada na camada de teste via env flag `TEMPLATE_FAKE_AI=1` (não chama Gemini em testes)

### `commit-brand-template`
- 401/403/404 padrão
- 400 quando `font_assets` não cobre todas as `font_family` em `text_zones`
- 400 quando fonte `custom` aponta para `font_id` que o usuário não pode acessar
- 200: atualiza zonas/logo/fontes e promove `status='ready'`

### `generate-from-template`
- 401/403/404
- 402 quando saldo < `TEMPLATE_IMAGE` (4)
- 422 quando template `status != 'ready'`
- 200: cria `actions(type='template_image', details.template_id=...)`, chama `consume_workspace_credits('template_image', 4)`, persiste imagem final em `content-images`
- Apenas a casca da pipeline aqui; etapas IA detalhadas ficam para ADR 0003 (mocks até lá)

### `delete-brand-template`
- 401/403/404
- 200: marca `deleted_at = now()`, não remove storage
- Após delete: novo INSERT na mesma brand passa (slot liberado)

## Fase 3 — Verificação

1. `supabase--test_edge_functions` rodando todos os `*_test.ts`.
2. psql:
   - `SELECT * FROM pg_policies WHERE tablename='brand_templates'` → 4 linhas.
   - Inserir 11 linhas para a mesma `brand_id` → 11ª falha.
   - `SELECT has_table_privilege('authenticated','brand_templates','SELECT')` → true.
3. `supabase--linter` para garantir RLS e GRANTs ok.

## Ordem de entrega ao sair do plan mode
1. Migration (Fase 0+1 num único `supabase--migration`) — você aprova → roda.
2. Bucket via `storage_create_bucket`.
3. Por edge function (4×): test file → index.ts → `deploy_edge_functions` → `test_edge_functions`.
4. Linter + checagens psql finais.

## Pontos que NÃO entram nesta ADR
- UI/frontend (ADR 0002).
- Pipeline de composição com `skia-canvas` e Art Director (ADR 0003) — `generate-from-template` fica com stub que devolve a `preview.png` como imagem final até a ADR 0003 ser implementada.
- Extensão do `cleanup-trash` para o novo bucket (tarefa separada referenciada).

## Confirmar antes de codar
- OK chamar Gemini com `TEMPLATE_FAKE_AI=1` nos testes (sem custo) e código real apenas no deploy?
- OK o stub de `generate-from-template` retornar a `preview.png` até a ADR 0003?
