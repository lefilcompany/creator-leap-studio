# AGENTS.md

Operational guide for AI agents working on this repository.

This document defines how to understand, change, test and review the Creator (Lefil) codebase. Follow these instructions before altering any code, tests, schema, documentation or domain flow.

---

## 1. Project purpose

Creator is an AI-powered content marketing platform that turns a brand's identity into ready-to-publish content (images, carousels, videos, captions, calendars, template variations). The stack is React 18 + Vite + TypeScript + Tailwind + shadcn on the frontend and Supabase (Postgres + Auth + Storage + Edge Functions) on the backend, with Google Gemini for all generative AI and Stripe for billing.

The system handles sensitive personal data (email, phone, payment metadata), brand intellectual property and credit balances. Every change must preserve privacy, authorization, domain consistency and the apolitical, Brazilian-law-compliant posture of the product.

---

## 2. Required reading before any implementation

Before modifying files, read in this order:

1. `CONTEXT.md` — domain glossary and architecture overview.
2. This `AGENTS.md`.
3. The relevant files under `docs/agents/`:
   * `docs/agents/domain.md`
   * `docs/agents/edge-functions.md` — when the task touches `supabase/functions/*`.
   * `docs/agents/credits-and-billing.md` — when the task touches credits, coupons, Stripe.
   * `docs/agents/ai-pipeline.md` — when the task touches image/text generation, prompts, compliance, brand learning.
   * `docs/agents/security-and-privacy.md` — when the task touches auth, RLS, roles, teammate data, logging.
   * `docs/agents/ui-conventions.md` — when the task touches any visible UI.
   * `docs/agents/testing.md` — before declaring a change done.
   * `docs/agents/triage-and-issues.md` — when responding to issues or proposing ADRs.
4. The ADRs in `docs/adr/` that overlap with the task (currently `0001-templates-backend.md`, `0002-templates-frontend.md`, `0003-templates-ai-agent.md`).
5. The files in the affected feature folder under `src/pages/`, `src/components/`, `src/hooks/`, `src/contexts/` or `supabase/functions/`.
6. The existing tests in `src/**/*.test.ts`, `e2e/*.spec.ts`, `selenium/*.test.ts`.

Do not implement based on the issue title alone. First understand the domain and the affected module.

---

## 3. Stack and scripts

Frontend: React 18, Vite 5, TypeScript 5, Tailwind v3, shadcn/ui (Radix primitives), TanStack Query, React Router v6, React Hook Form + Zod, Sonner toasts, Framer Motion, Embla Carousel, Recharts, Lucide icons.

Backend: Supabase (Postgres, Auth, Storage, Realtime), Deno Edge Functions, Stripe SDK, Google Gemini.

Tests: Vitest (unit + coverage), Playwright (e2e), Selenium (cross-browser smoke), Mocha (shared script tests).

Scripts (see `package.json`):

```bash
npm install
npm run dev              # local Vite dev server
npm run build            # production build
npm run lint             # ESLint
npm run test             # vitest watch
npm run test:ci          # vitest run + coverage
npm run test:e2e         # Playwright
npm run test:e2e:ui      # Playwright UI mode
npm run test:integration # Mocha
```

Edge functions are deployed via the Supabase tooling exposed by the agent (`supabase--deploy_edge_functions`). Never run raw `supabase` CLI commands that touch the Live database.

---

## 4. High-level architecture

See `CONTEXT.md` — section *High-level architecture* and *Module map*. Do not duplicate that information here.

Key invariants:

* The Supabase Postgres schema is the source of truth for all entities. Generated types live in `src/integrations/supabase/types.ts` and are **read-only**.
* The Supabase client is auto-generated in `src/integrations/supabase/client.ts` and must never be edited.
* `.env` (and the `VITE_SUPABASE_*` keys inside it) is auto-generated and must never be edited.
* `supabase/config.toml` is auto-generated and must not be modified.

---

## 5. Mandatory domain vocabulary

Use the terms defined in `CONTEXT.md` — section *Domain vocabulary* and *Preferred terms*. Highlights:

* "Ajustar" / "Ajuste", never "Revisar" / "Revisão" in UI copy.
* "Calendário de Conteúdo", never "Planejar conteúdo" in UI copy. Internal code stays `PLANEJAR_CONTEUDO`.
* "Marca", "Persona", "Crédito", "Cupom".
* Never use "(opcional)" labels — convey optionality through absence of the required asterisk.
* The product is **apolitical**. Never generate, suggest or accept political marketing content.

Do not invent new domain terms for existing concepts. If a genuinely new term is needed, update `CONTEXT.md` and link the change in the PR description.

---

## 6. System roles

Defined in `CONTEXT.md`. Summary:

* **User** — base authenticated entity (`auth.users` + `public.profiles`).
* **Team member** — `profiles.team_id` set; team membership is optional.
* **Team admin** — `teams.admin_id`; can transfer ownership.
* **System admin** — row in `public.user_roles` with `role = 'system'`. Only `admin@admin.com` qualifies. Checked exclusively through the `has_role` security-definer function.

Roles must **never** be stored on `profiles`. Never check admin status client-side via `localStorage`, `sessionStorage` or hardcoded credentials.

---

## 7. General agent rules

### Before coding

1. Read the required files in section 2.
2. Identify affected modules, edge functions, tables and RLS policies.
3. Identify guards, roles and credit charges involved.
4. Identify existing tests that may break.
5. Write a short plan that names files and decisions.
6. Surface risks around domain, privacy, billing or migration.

### During implementation

1. Prefer TDD when there is a clear business rule.
2. Make one vertical change at a time. Never mix a large feature with a large refactor.
3. Never change behavior outside the requested scope. UI requests stay in UI; do not touch business logic unless asked.
4. Do not introduce abstractions without real need.
5. Do not duplicate domain rules across edge functions and frontend.
6. Do not ignore lint, type or test errors.
7. Do not remove existing tests without justification.
8. Do not alter the database schema without evaluating migrations, RLS, GRANTs, seeds and e2e impact.
9. Batch independent file operations into parallel tool calls.

### When finished

Report:

* Summary of the change.
* Files touched.
* Domain rules preserved.
* Tests executed and their result.
* Tests not executed and why.
* Remaining risks, if any.

### 7.1 Stop rule for inconsistency, conflict or uncertainty

If, at any point, you find an inconsistency, conflict, ambiguity or material uncertainty, **stop** before making an autonomous decision. This includes:

* Conflict between `CONTEXT.md`, `AGENTS.md`, ADRs, issue, PRD or existing code.
* Incomplete or contradictory domain rule.
* Doubt about authorization, privacy or exposure of sensitive data.
* Doubt about credit charging, refunds, coupon application or Stripe state transitions.
* Doubt about compliance moderation, political content boundaries or brand fidelity rules.
* A change that may break an API contract or RLS policy.
* Need for a destructive migration or structural change to the database.
* Existing behavior without test coverage that you are about to change.
* Existing test contradicting the requested rule.
* Dependency on an external service, secret or integration that is not documented.
* Scope larger than what the issue or user request described.

In that case, surface:

1. The inconsistency, conflict or uncertainty you found.
2. The files, rules or behaviors involved.
3. The plausible options, without picking one silently.
4. The risks and impact of each option.
5. The human decision needed to proceed.

Do not:

* Silently pick an interpretation.
* Change sensitive domain rules on your own.
* Run destructive migrations without approval.
* Remove or adapt a contradicting test without approval.
* Change an API contract without approval.
* Bypass authorization, RLS, GRANTs or validation to finish the task.
* Expand the scope to resolve ambiguities.

---

## 8. Frontend style (React + TypeScript + Tailwind + shadcn)

### Components and pages

* Route components live in `src/pages/` and are lazy-loaded in `src/App.tsx`.
* Feature components live in `src/components/<feature>/`. shadcn primitives stay in `src/components/ui/`.
* Prefer **raw `div` with utility classes** over `Card` components when building floating layout surfaces.
* The canonical floating-board look is `bg-card rounded-2xl shadow-xl` with internal padding.
* Use `max-w-7xl` and fluid sidebars on creation/result pages (see `CreateImage`, `CreateFromTemplate`).
* Replace back buttons with breadcrumbs (`PageBreadcrumb`). Breadcrumbs hide on mobile.
* Result pages use glassmorphism (`backdrop-blur-2xl`, semi-transparent backgrounds).
* The Recent Activity carousel uses Embla with `dragFree: true` and exactly 6 items.

Full UI rules: `docs/agents/ui-conventions.md`.

### Colors and theming

* Color, gradient and shadow values are **semantic design tokens** in `src/index.css` and themed through shadcn variants.
* Never hardcode color utilities like `text-white`, `bg-black`, `bg-[#abcdef]`, `text-red-500` in components — they bypass theming and break dark mode.
* Use the project's HSL tokens: `bg-background`, `text-foreground`, `bg-card`, `bg-primary`, `bg-secondary`, `bg-accent`, `bg-muted`, `bg-destructive`, etc.

### Hooks and data fetching

* All Supabase queries go through TanStack Query hooks in `src/hooks/`.
* Default `QueryClient` (in `src/App.tsx`): `staleTime` 5 min, `gcTime` 30 min, `refetchOnWindowFocus: false`.
* Mutations should invalidate the smallest possible query keys and refresh credits via `refreshUserCredits()` after any AI/credit-consuming call.

### Forms

* React Hook Form + Zod resolver (`@hookform/resolvers/zod`).
* Persist drafts via `useDraftForm` / `useFormPersistence` where the user benefits from recovering input.

### Imports

* Always import the Supabase client from `@/integrations/supabase/client`.
* Use the `@/` alias for everything under `src/`.

---

## 9. Supabase and database rules

### RLS and GRANTs

Every `CREATE TABLE public.<name>(...)` migration MUST include, in the same migration, in this order:

1. `CREATE TABLE`.
2. `GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO authenticated;` (plus `GRANT ALL ... TO service_role;`, and `GRANT SELECT ... TO anon` only when a policy explicitly allows anonymous reads).
3. `ALTER TABLE public.<name> ENABLE ROW LEVEL SECURITY;`.
4. `CREATE POLICY ...` per access pattern.

A migration without GRANTs is broken and will fail at runtime, even with RLS enabled.

### Roles

Roles live in `public.user_roles` (enum `app_role`). The only check is the security-definer function `public.has_role(_user_id uuid, _role app_role) RETURNS boolean`. Use that function inside RLS policies — never reference `user_roles` directly from policies (recursion risk).

### Teammate data

Always query teammate data through the `teammate_profiles` view, never `profiles` directly. The view hides fields that teammates should not see (email, phone, billing).

### Auto-generated artifacts (never edit)

* `src/integrations/supabase/client.ts`
* `src/integrations/supabase/types.ts`
* `.env` and the `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` / `VITE_SUPABASE_PROJECT_ID` keys
* `supabase/config.toml`

### Environment isolation

* AI edge functions and the agent only write to the **Test** database.
* The Live database is not modified programmatically. Production changes go through reviewed migrations.

Schemas `auth`, `storage`, `realtime`, `supabase_functions`, `vault` must not be touched (no triggers either).

Full security model: `docs/agents/security-and-privacy.md`.

---

## 10. Edge Functions (Deno)

Conventions for any function under `supabase/functions/`:

1. Auth via `_shared/auth.ts` (`getAuthenticatedUser`).
2. For credit-charging operations: pre-check balance against `_shared/creditCosts.ts` **before** invoking AI to avoid wasted spend.
3. AI call through `_shared/geminiClient.ts`. Never embed prompt-engineering rules inline — use `_shared/imagePromptBuilder.ts`, `expandBriefing.ts`, etc.
4. Compliance through `_shared/complianceCheck.ts` for any user-facing creative.
5. Post-process via `_shared/imagePostProcess.ts` when applicable.
6. **Charge credits via `consume_workspace_credits` RPC only after AI success**, with a meaningful `p_action_type` string and a `p_metadata` object that records the action context.
7. Always return JSON with `{ error: string }` on failure; never leak provider error bodies.

`generate-carousel-images` is a pure orchestrator — it calls `generate-image` internally per slide and must remain that way to keep visual consistency between single-image and per-slide generation.

Full catalog and conventions: `docs/agents/edge-functions.md`.

---

## 11. Tests

Run the smallest relevant test set before declaring a change done. See `docs/agents/testing.md`.

Quick reference:

| Change touches… | Run at minimum |
|---|---|
| Pure helper, hook, util | `npm run test:ci` (vitest) |
| UI component | vitest + manual preview check |
| Edge function | vitest for shared modules + targeted invoke through Supabase tools |
| Auth, RLS, credits, billing | vitest + Playwright e2e (`npm run test:e2e`) |
| Carousel, full generation flow | Playwright `carousel-*.spec.ts` |
| Smoke across browsers | Selenium (`selenium/*.test.ts`) |

TDD loop:

1. Write or adjust a failing test.
2. Confirm it fails.
3. Implement the minimum to pass.
4. Re-run the test.
5. Run related tests.
6. Refactor without changing behavior.
7. Run lint and the final test set.

Do not modify snapshots, fixtures or seeds just to hide a bug.

---

## 12. Privacy and security

The system holds sensitive personal data and brand intellectual property. Treat as sensitive:

* Personal data: name, email, phone, city, state, avatar URL.
* Auth artifacts: tokens, hashes, refresh tokens, session IDs.
* Billing: Stripe customer ID, payment-method metadata, subscription state.
* Brand assets: logos, moodboards, color palettes, reference images, full prompts and briefings.
* Credit ledger: balance, transactions, coupons applied.
* Teammate data: anything not exposed by the `teammate_profiles` view.

Mandatory rules:

* Never log sensitive data. Use IDs and generic messages.
* Never expose sensitive fields in public endpoints or to anonymous users.
* Never enumerate users (e.g. authentication errors must not reveal whether an email exists).
* Never let one user read or mutate another user's data unless the relationship is explicitly authorized (teammate via view, system admin via `has_role`).
* Never bypass RLS, GRANTs or validation in tests without a documented reason.
* Never echo, return or log `SUPABASE_SERVICE_ROLE_KEY` or the database password — they are not accessible on Lovable Cloud anyway.

Full security model: `docs/agents/security-and-privacy.md`.

---

## 13. Per-bounded-context guidelines

### 13.1 Auth and profiles

* Preserve password hashing and JWT validation (handled by Supabase Auth).
* Sign-up screens are email + password only — **never** add Google OAuth on `/register` or `/cadastro`. Google OAuth stays on `/login` only.
* Optional fields on registration (city, state, coupon) must not be marked "(opcional)" in the label.
* The canonical domain is `https://pla.creator.lefil.com.br`. Redirect from `lovable.app` and other aliases.
* UTM parameters captured on landing must be propagated to Supabase `user_metadata` and to RD Station via `rd-station-integration`.

### 13.2 Brands, personas, themes

* CRUD goes through dedicated hooks (`useBrands`, `usePersonas`, `useThemes`). Never query the tables directly from components.
* When updating brand visuals, keep the brand-learning loop intact (top 3 approved recipes are reinjected into prompts).
* Persona marketplace purchases use `purchase-personas` and must charge credits before assignment.

### 13.3 Categories

* Roles: `Dono`, `Editor`, `Leitor`. Leitor exists but **must not** appear in role pickers in the UI.
* Use `useCategories` and the membership panels under `src/components/categorias/`.

### 13.4 Content creation

* `/create` is the single entry point (`ContentCreationSelector`). New creation modes are added as cards in that grid (current grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-5`).
* Each mode displays its credit cost on the card.
* Inputs across creation modes should remain visually consistent with `CreateImage` (the canonical reference).
* Result captions follow the v2 standard: Title, Body, CTA, exactly 5 hashtags.
* Platform selection is optional when an aspect ratio is selected.
* Image generation pipeline is image-first then Vision-for-caption (see `docs/agents/ai-pipeline.md`).

### 13.5 Brand templates

See ADRs 0001, 0002, 0003. Three edge functions cover the lifecycle: `import-brand-template` (3 credits, AI analysis), `commit-brand-template` (save committed version), `generate-from-template` (render a variation). PDFs are rasterized client-side through `src/lib/rasterizePdf.ts`. Reject PDFs that contain `.git` metadata or extremely large pages without the user's confirmation.

### 13.6 Content calendar

* Internal action code: `PLANEJAR_CONTEUDO`. UI label: "Calendário de Conteúdo".
* Strict four-stage flow per item: `calendar → briefing → design → review → done`. Do not skip stages or allow regressions across them.
* Parent row in `content_calendars`, children in `calendar_items`.

### 13.7 History, favorites, trash

* History list is driven by `useHistoryActions`. Filters live in `HistoryFilterSidebar`.
* Favorites have two scopes: `"Para mim"` (personal) and `"Para a equipe"` (shared). Use `useFavorites`.
* Trash uses soft-deletion via `deleted_at` and 30-day retention. The `cleanup-trash` cron handles hard delete.

### 13.8 Team

* Membership is optional. Treat absent `team_id` as a valid state — fall back to `user_id` for scoping.
* Ownership transfer follows the rules in the Team Management memory (`mem://features/team/management-system`).
* Public profile at `/profile/:userId` is only viewable by teammates, sourced from `teammate_profiles`.

### 13.9 Credits, billing, coupons

Full details: `docs/agents/credits-and-billing.md`.

* Credits are individual (`profiles.credits`). Never store credits on `teams`.
* Coupons **add** credits and set a 30-day expiration. They never replace the existing balance.
* If a coupon is captured before sign-up, store it in `localStorage` (`pending_coupon_code`, `pending_coupon_user_id`) and let `AuthContext` redeem it on first authenticated load.
* `max_credits` drives whether a top-up is mandatory in `DashboardCreditsCard`.

### 13.10 System admin

* Console at `/system/*`, gated by `SystemRoute` which calls `has_role(uid, 'system')`.
* Only `admin@admin.com` is a system admin.
* System admin operations must still respect privacy rules — minimize the data displayed to the strict operational need.

### 13.11 AI pipeline and compliance

Full details: `docs/agents/ai-pipeline.md`.

* Master Prompt captures user intent; Art Director enriches it with photographic specs.
* Fidelity guardrail: reference subjects are immutable. Marketplace mode is 100% product fidelity. Professional ad mode allocates 30-40% to a Headline Hero zone.
* Text-on-image specs: font size 12-36 px, max 50 characters per text overlay.
* Compliance check screens output against Brazilian laws (CONAR, food, finance, medical). On violation, auto-correct via image-to-image regeneration.
* Brand-style feedback loop: the top 3 approved recipes per brand are injected as references.
* Political marketing is **forbidden**.

### 13.12 Chatbot

* `PlatformChatbot` is Gemini-powered, themed with the Sparkles icon, and renders full-screen on mobile.
* Backed by the `platform-chat` edge function.

---

## 14. Forbidden actions

* Producing, suggesting or accepting political marketing content.
* Editing the Live database programmatically (only the Test DB is allowed for AI/edge-function writes).
* Editing `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env`, `supabase/config.toml`.
* Storing roles on `profiles` (must live in `user_roles`).
* Checking admin status client-side via `localStorage`, `sessionStorage` or hardcoded credentials.
* Bypassing RLS, GRANTs or the `has_role` check.
* Hardcoding color utilities (`text-white`, `bg-black`, `bg-[#xxxxxx]`) instead of semantic tokens.
* Using `Card` components when the design calls for a floating board surface (`bg-card rounded-2xl shadow-xl` raw div).
* Using "Revisar" / "Revisão" in UI copy. Use "Ajustar" / "Ajuste".
* Adding "(opcional)" labels to form fields.
* Re-adding Google OAuth on registration screens.
* Re-adding political-context features that were intentionally removed.
* Exposing Supabase service role keys, project URLs, dashboard links or database passwords to the user.
* Querying `profiles` directly when teammate data is needed — use `teammate_profiles`.
* Charging credits before AI success, or skipping the post-success `consume_workspace_credits` RPC.
* Replacing Gemini with another provider without an explicit user request and ADR.

---

## 15. Done-criteria checklist

Before declaring a task complete, confirm:

* [ ] All required reading from section 2 was loaded for the touched modules.
* [ ] Vocabulary (section 5) is respected in code and UI copy.
* [ ] Roles, RLS and GRANTs are correct for any new or changed table.
* [ ] Credit charging happens only on AI success and uses `consume_workspace_credits` with a meaningful `p_action_type`.
* [ ] No sensitive data is logged, returned to anonymous users or exposed across teammates beyond the `teammate_profiles` view.
* [ ] No auto-generated files were edited.
* [ ] No hardcoded colors, no "(opcional)" labels, no "Revisar" wording in UI copy.
* [ ] The smallest relevant test set passed (`docs/agents/testing.md`).
* [ ] The stop rule (section 7.1) was applied for every encountered ambiguity.
* [ ] The closing report (section 7 — *When finished*) is included in the response.
