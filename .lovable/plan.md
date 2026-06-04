
## Objetivo

Aplicar TDD (skill `tdd` — fatias verticais red→green) para cobrir o fluxo de carrossel com testes unitários e E2E, e endurecer o CI no GitHub Actions (lint estrito, cobertura mínima, typecheck, e2e/selenium obrigatórios).

## Fatos / Riscos a confirmar antes de codar

1. **E2E "geração completa" consome créditos reais a cada execução de CI.** Como você optou por usar o usuário real do Test com créditos, cada PR vai gastar pelo menos `slidesCount * custo_imagem` créditos por run. Recomendo confirmar:
   - Qual `slidesCount` usar no teste pesado? (sugestão: 2, mínimo válido, para reduzir custo).
   - Pode haver poluição de histórico no usuário. OK?
2. **Tornar e2e/selenium "obrigatórios sem skip silencioso"** exige que `E2E_BASE_URL`, `E2E_USER_EMAIL`, `E2E_USER_PASSWORD` estejam **sempre** disponíveis como secrets nos workflows. Hoje os testes pulam se faltarem. Confirmar que os secrets já existem em `Settings → Secrets`.
3. **Forks/Dependabot** não recebem secrets — o job E2E vai falhar nesses PRs. Sugestão: condicionar o job a `github.event.pull_request.head.repo.full_name == github.repository`. Confirmar abordagem.
4. **Cobertura mínima**: você marcou "rodar com cobertura mínima" mas não definiu o número. Sugestão inicial: `lines/statements: 60%`, `branches: 50%`, `functions: 60%`, subindo gradualmente. Confirmar threshold.
5. **`bun run lint --max-warnings=0`**: vai falhar agora se houver qualquer warning existente. Posso rodar o lint antes para listar warnings e decidir se corrigimos junto ou ajustamos regras. Confirmar.
6. **Mock do supabase-js em unit tests**: `RegenerateImageDialog` chama `supabase.storage.from(...).upload(...)`, `supabase.functions.invoke(...)` e usa `useAuth`. Vou mockar `@/integrations/supabase/client` e `@/hooks/useAuth` via `vi.mock` (compatível com a política de não tocar em `client.ts`). Confirmar que está OK.

## O que será implementado (após confirmação dos pontos acima)

### A. Testes unitários (Vitest + RTL), via TDD vertical

Cada item abaixo segue 1 teste → 1 mudança/asserção, em ciclos RED→GREEN. Não escrevo todos os testes de uma vez.

1. **`src/hooks/useCarouselSlides.test.ts`** (novo)
   - `carouselSignature` (exportar a função para teste, ou testar via comportamento de `structuralSharing`):
     - mesma assinatura → preserva referência;
     - mudança de `status`/`imageUrl`/`error` → troca referência;
     - mudança em `caption` → troca referência.
   - `refetchInterval`:
     - sem dados → 3000;
     - pendentes/generating → 5000;
     - todos `done` + caption presente → `false`;
     - todos `done` mas sem caption → 5000.
   - Mock de `supabase.from(...).select(...).eq(...).single()`.

2. **`src/components/create-content/carousel/CarouselGallery.test.tsx`** (novo)
   - Renderiza header `Slide 1 de N`.
   - Overlay `Gerando...` quando `status==="generating"`.
   - Overlay de erro com botão `Regerar slide` quando `status==="error"`.
   - Dots: a quantidade certa, o ativo recebe largura `w-6`.
   - Botões `Próximo`/`Anterior` desabilitam nos extremos.
   - Clique em `Regerar este slide` abre o `RegenerateImageDialog` (mockado) com o slide certo.
   - Memoização: re-render com mesmos dados não muda referências relevantes (smoke).

3. **`src/components/create-content/regenerate/RegenerateImageDialog.test.tsx`** (novo)
   - Mocks: `@/hooks/useAuth` (`{ user: { id, credits } }`), `@/integrations/supabase/client` (`storage.from().upload()`, `storage.from().getPublicUrl()`, `functions.invoke`), `sonner`.
   - **Custo dinâmico**:
     - `regenerationCount=0` → mostra "regeração gratuita" + botão "Regerar (grátis)";
     - `regenerationCount=1` → mostra "4 créditos" + botão "Regerar (4 cr)";
     - `credits=0` e custo=4 → exibe aviso "Créditos insuficientes" e botão desabilitado.
   - **Validação**: submit desabilitado sem instruções; com instruções e créditos, habilita.
   - **Upload**: simular `change` no input file → chama `storage.upload` no path `regenerate-refs/<userId>/...` → ref aparece no grid (até 3); 4ª tentativa mostra toast de erro.
   - **Submit**: chama `supabase.functions.invoke("generate-carousel-images", { body })` com `onlyIndex`, `regenerationInstructions` compostas (concat de `whatWentWrong + instructions`), `regenerationReferenceImages`, `avoid`, `keepOriginalPrompt`; toast de sucesso; `onOpenChange(false)`.
   - **Reset**: reabrir com outro `slide.index` limpa os campos.

4. **`src/pages/CreateImage.test.tsx`** (apenas o sub-fluxo do warning)
   - Render isolado da seção carrossel com `slidesCount=7` → sem alerta; `slidesCount=8/9/10` → alerta `AlertTriangle` visível com texto sobre perda de qualidade.
   - Se o componente for grande demais para montar isolado, extraio um pequeno componente `CarouselSlidesCountWarning` e testo esse. **Confirmar se posso extrair**.

### B. Testes E2E (Playwright)

`e2e/carousel.spec.ts` ganha specs novas (mantendo a existente):

1. **Aviso de 8–10 slides** (`/criar/imagem`):
   - Seleciona Carrossel → ajusta `slidesCount` para 8 → asserta presença do texto do alerta amber. Repete para 9 e 10. Para 7 → asserta ausência.
2. **Modal de regerar slide**:
   - Pré-requisito: ação de carrossel já criada (criar via UI mínima, 2 slides) **ou** navegar diretamente para uma URL de resultado conhecida via storage state. **Confirmar** se você prefere criar fluxo completo (gasta créditos) ou seedar via API/route.
   - Abre `Regerar este slide` → asserta título do modal, label de custo gratuito, validação ("Descreva o que quer ajustar"), preenche instruções e clica → asserta toast de sucesso.
3. **Geração completa (caminho feliz)**:
   - Cria carrossel de 2 slides (mínimo) → aguarda polling até todos os slides aparecerem como `done` (timeout 5 min, intervalo de 5s) → valida que a legenda aparece. **Custo real de créditos a cada run** — depende da confirmação do ponto 1 dos Fatos.
4. **Seleção + painel de slides**: já existe, mantida.

Espelhar a spec do warning (item 1) também no Selenium (`selenium/carousel-integration.test.ts`) para consistência com o que já existe.

### C. CI no GitHub Actions (`.github/workflows/ci.yml`)

1. **Lint estrito**: trocar `bun run lint` por `bun run lint -- --max-warnings=0` (após corrigir warnings pendentes).
2. **Typecheck**: novo job `typecheck` rodando `bunx tsc -p tsconfig.app.json --noEmit` e `bunx tsc -p tsconfig.node.json --noEmit`.
3. **Cobertura mínima**: adicionar `thresholds` em `vitest.config.ts` (`coverage.thresholds.lines/statements/branches/functions`). O job `unit` já roda `test:ci` com `--coverage`; vai falhar se ficar abaixo do mínimo.
4. **E2E/Selenium obrigatórios**:
   - Remover o `test.skip(!USER...)` (ou mantê-lo só para execução local) e exigir que o job falhe sem secrets.
   - Adicionar `if` para excluir PRs de fork (ver Fato 3).
5. **Branch protection**: documentar em `TESTING.md` que `Typecheck`, `Lint`, `Unit tests`, `Build`, `E2E`, `Selenium` devem ser checks obrigatórios. (Configuração real é feita no GitHub UI pelo dono do repo.)
6. **Cache**: adicionar `cache: bun` via `oven-sh/setup-bun` para acelerar (já é o caso, sem mudança).

## Ordem de execução (TDD vertical)

```text
1. useCarouselSlides           → 1 teste por vez (signature, intervals)
2. CarouselGallery             → header → overlays → dots → integração modal
3. RegenerateImageDialog       → custo → validação → upload → submit → reset
4. CarouselSlidesCountWarning  → unit + extração se necessária
5. E2E warning 8–10            → adicionar e rodar local
6. E2E modal de regerar        → adicionar
7. E2E geração completa        → adicionar (somente se confirmar custo)
8. CI: typecheck → cobertura → lint estrito → obrigatoriedade dos e2e/selenium
```

Cada passo: escrevo o teste, rodo (RED), implemento o mínimo (GREEN), refatoro se houver duplicação, sigo. Sem horizontal slicing.

## Fora de escopo

- Alterar `client.ts`, `types.ts`, `.env` (proibido).
- Alterar a lógica de negócio de cobrança ou da edge function `generate-carousel-images` (apenas testes a cobrem; sem mudanças funcionais).
- Configurar branch protection no GitHub (só documentar).

## Aguardando sua resposta nos 6 pontos da seção "Fatos / Riscos" antes de implementar.
