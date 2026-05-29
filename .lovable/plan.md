## Objetivo

Configurar CI no GitHub que rode em **Pull Requests** e em **push direto na `main`**, executando:

1. **Lint** (ESLint — já existe `npm run lint`)
2. **Build** (garante que o projeto compila)
3. **Testes unitários** (Vitest + Testing Library)
4. **Testes E2E** (Playwright — já está instalado)
5. **Testes de integração** (Selenium WebDriver)

---

## 1. Setup de testes unitários (Vitest)

Adicionar infraestrutura que ainda não existe no projeto:

- Dev deps: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `@vitest/coverage-v8`
- `vitest.config.ts` na raiz (ambiente jsdom, alias `@`, setup file)
- `src/test/setup.ts` com `@testing-library/jest-dom` e mock de `matchMedia`
- Scripts no `package.json`: `test`, `test:watch`, `test:coverage`
- Testes iniciais cobrindo módulos críticos:
  - `src/lib/utils.test.ts`
  - `src/components/create-content/carousel/types.test.ts` (validação de tipos/helpers)
  - `src/hooks/useCarouselSlides.test.ts` (com mock do supabase client)
  - 2–3 smoke tests de componentes UI puros

Cobertura inicial alvo: módulos `lib/`, `hooks/`, e helpers. **Não** vamos perseguir cobertura de toda a UI nesta fase — apenas garantir o pipeline verde com uma base sólida.

## 2. Setup de testes E2E (Playwright)

`@playwright/test` e `playwright.config.ts` já existem. Falta:

- Criar pasta `e2e/` com specs cobrindo as principais funcionalidades:
  - `auth.spec.ts` — login/cadastro (happy path)
  - `create-content.spec.ts` — fluxo de criação de imagem única
  - `carousel.spec.ts` — fluxo de criação de carrossel (seleção formato Carrossel 4:5, painel de slides, geração)
  - `dashboard.spec.ts` — carregamento do dashboard e Recent Activity
  - `trash.spec.ts` — soft delete e restauração
- Usuário de teste dedicado via secrets (`E2E_USER_EMAIL`, `E2E_USER_PASSWORD`) apontando para o ambiente **Test** (regra do projeto: Live DB não é tocado por automação).
- Scripts: `test:e2e`, `test:e2e:ui`.

## 3. Setup de testes de integração (Selenium)

Conforme solicitado, em paralelo ao Playwright:

- Dev deps: `selenium-webdriver`, `@types/selenium-webdriver`, `chromedriver`, `mocha`, `chai`, `ts-node`
- Pasta `selenium/` com:
  - `selenium/config.ts` — driver headless Chrome, baseURL configurável
  - `selenium/auth.test.ts` — login E2E real via WebDriver
  - `selenium/carousel-integration.test.ts` — abre criar conteúdo, escolhe Carrossel 4:5, valida que o `CarouselPanel` aparece com 4 slides default
  - `selenium/dashboard-integration.test.ts` — navega para dashboard logado e valida elementos chave
- Script: `test:integration` (mocha rodando os `*.test.ts` da pasta `selenium/`).

> Nota: Playwright já cobre E2E moderno; Selenium é mantido em paralelo apenas porque foi explicitamente pedido. Os dois rodam jobs separados no CI para não duplicar tempo de fila.

## 4. GitHub Actions

Criar `.github/workflows/ci.yml` com triggers:

```yaml
on:
  pull_request:
    branches: [main, dev]
  push:
    branches: [main]
```

Jobs (todos em `ubuntu-latest`, Node 20, cache de Bun/npm):

| Job | Comando | Depende de |
|---|---|---|
| `lint` | `npm run lint` | — |
| `build` | `npm run build` | — |
| `unit` | `npm run test -- --run --coverage` | — |
| `e2e` | `npx playwright install --with-deps && npm run test:e2e` | `build` |
| `selenium` | `npm run test:integration` (usa Chrome do runner) | `build` |

- Todos os jobs rodam em paralelo quando possível.
- Upload de artefatos: relatório de cobertura (unit) e `playwright-report/` (e2e).
- **Branch protection (instrução para o usuário)**: pedir que ative no GitHub a regra exigindo `lint`, `unit`, `build`, `e2e`, `selenium` como checks obrigatórios antes de merge na `main`.

### Secrets necessárias no repositório GitHub

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`
- `E2E_BASE_URL` (default: preview do Lovable)

O usuário precisará adicioná-las em **Settings → Secrets and variables → Actions** (não consigo fazer isso pelo Lovable).

## 5. Documentação

- `TESTING.md` na raiz com:
  - Como rodar cada tipo de teste localmente
  - Como escrever novos testes em cada framework
  - Como configurar as secrets no GitHub

---

## Arquivos a criar/editar

**Criar:**
- `.github/workflows/ci.yml`
- `vitest.config.ts`
- `src/test/setup.ts`
- `src/lib/utils.test.ts`, `src/hooks/useCarouselSlides.test.ts` (+ outros unit tests iniciais)
- `e2e/auth.spec.ts`, `e2e/create-content.spec.ts`, `e2e/carousel.spec.ts`, `e2e/dashboard.spec.ts`, `e2e/trash.spec.ts`
- `selenium/config.ts`, `selenium/auth.test.ts`, `selenium/carousel-integration.test.ts`, `selenium/dashboard-integration.test.ts`
- `TESTING.md`

**Editar:**
- `package.json` — novas devDeps e scripts (`test`, `test:watch`, `test:coverage`, `test:e2e`, `test:integration`)
- `tsconfig.app.json` — `"types": ["vitest/globals"]`

---

## Pontos a confirmar antes de implementar

1. **Cobertura inicial dos testes**: ok começar com base mínima (utils, hooks de carrossel, 1 smoke por fluxo principal no Playwright + Selenium) e expandir depois? Cobrir "todas as funcionalidades" de cara geraria dezenas de specs frágeis.
2. **Selenium em paralelo ao Playwright**: confirmas que queres manter os dois? Playwright já é mais moderno e cobre o mesmo escopo — Selenium tipicamente é só pedido por restrição corporativa.
3. **Branch para PRs**: rodar CI em PRs para `main` e `dev`, ou só `main`?
