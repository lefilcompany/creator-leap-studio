# Testing Guide

Este projeto possui 4 camadas de validação automatizadas, todas executadas no CI do GitHub Actions.

## 1. Lint

```bash
bun run lint
```

## 2. Testes unitários (Vitest + Testing Library)

```bash
bun run test          # roda uma vez
bun run test:watch    # watch mode
bun run test:coverage # com cobertura
```

Arquivos: `src/**/*.test.{ts,tsx}` ou `*.spec.{ts,tsx}`.

Setup global em `src/test/setup.ts` (mocks de `matchMedia`, `ResizeObserver`, `IntersectionObserver`).

## 3. Testes E2E (Playwright)

```bash
bunx playwright install chromium   # primeira vez
bun run test:e2e
bun run test:e2e:ui                # modo interativo
```

Specs em `e2e/`. Configurável via env:
- `E2E_BASE_URL` — URL alvo (default: domínio publicado)
- `E2E_USER_EMAIL` / `E2E_USER_PASSWORD` — usuário de teste no ambiente **Test**

> ⚠️ Nunca aponte os testes para a base de dados Live.

## 4. Testes de integração (Selenium WebDriver)

```bash
bun run test:integration
```

Specs em `selenium/`. Usa Chrome headless. Mesmas variáveis de ambiente do Playwright.

## CI no GitHub

`.github/workflows/ci.yml` roda em:
- Pull Requests para `main` e `dev`
- Push direto em `main`

Jobs: `lint`, `unit`, `build`, `e2e` (depende de `build`), `selenium` (depende de `build`).

### Secrets necessárias no repositório

Em **Settings → Secrets and variables → Actions**, adicione:

| Nome | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do backend (Test) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública anon |
| `VITE_SUPABASE_PROJECT_ID` | Project ref |
| `E2E_BASE_URL` | URL pública para testar (preview ou staging) |
| `E2E_USER_EMAIL` | Email do usuário de teste |
| `E2E_USER_PASSWORD` | Senha do usuário de teste |

### Branch protection (recomendado)

Em **Settings → Branches → Branch protection rules** para `main`:
- Require pull request before merging
- Require status checks: `Lint`, `Unit tests (Vitest)`, `Build`, `E2E tests (Playwright)`, `Integration tests (Selenium)`
