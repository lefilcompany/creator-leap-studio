# Plan — Agent context & operational guides

Create a complete, English-language documentation set that an AI agent must read before touching this repository. Mirrors the Psique pattern: one **CONTEXT.md** (domain glossary & architecture overview), one **AGENTS.md** (operational rules), plus focused files under **docs/agents/** referenced from AGENTS.md.

All content is generated from the actual codebase (routes in `src/App.tsx`, edge functions in `supabase/functions/*`, hooks, contexts, types, ADRs in `docs/adr/`) and the project memory (credits model, templates, calendar flow, compliance, brand learning, etc.). No invented terms.

## Files to create

### 1. `CONTEXT.md` (root) — domain & architecture reference
Sections:
- **What Creator is** — AI-powered content marketing platform for brands (Lefil), generates social media content (images, carousels, videos, captions, calendars) from brand identity, personas and strategic themes.
- **Product goal** — let creators/agencies produce on-brand content fast, with credit-based usage, brand learning loop, compliance guardrails, optional team collaboration.
- **System roles** — Authenticated user (`profiles`), Team member, Team admin (`teams.admin_id`), System admin (`user_roles` with role `system`, only `admin@admin.com`). Team membership optional; fallback to `user_id`.
- **Domain vocabulary** (each: definition + canonical code term):
  - Brand (`brands`), Persona (`personas`), Strategic Theme (`strategic_themes`)
  - Brand Template (`brand_templates`) + zones, fonts, background — ADRs 0001/0002/0003
  - Action (`actions`, `ActionType`: CRIAR_CONTEUDO, CRIAR_CONTEUDO_RAPIDO, REVISAR_CONTEUDO, PLANEJAR_CONTEUDO, GERAR_VIDEO)
  - Content creation modes: Single image, Carousel, Quick content, From template, Animate, Video, Marketplace
  - Content Calendar (`content_calendars`, `calendar_items`, 4 stages: calendar→briefing→design→review→done — internal code `PLANEJAR_CONTEUDO`, UI label "Calendário de Conteúdo")
  - Caption standard (title, body, CTA, 5 hashtags)
  - Categories (Dono/Editor/Leitor; Leitor hidden in UI)
  - Favorites (scopes: "Para mim", "Para a equipe")
  - Trash (soft delete via `deleted_at`, 30-day retention)
  - Credits (individual, `profiles.credits`, `max_credits`, `credits_expire_at`)
  - Plan (`plans`), Subscription (Stripe), Coupon (adds credits, never replaces, 30-day expiry)
  - Compliance check (Brazilian law guardrails, image-to-image auto-correction)
  - Brand learning / Brand Style Feedback (top 3 approved recipes reinjected)
  - Chatbot (Gemini-powered, Sparkles theme)
- **Preferred terms** — "ajustar" not "revisar"; no "(opcional)" labels; "Calendário de Conteúdo"; never political content; @lefil.com.br = Internal users.
- **Technical terms preserved in code** — `ActionType`, `profiles`, `teams`, `brands`, `personas`, `strategic_themes`, `brand_templates`, `actions`, `content_calendars`, `calendar_items`, `categories`, `user_roles`, `teammate_profiles` (view), etc.
- **High-level architecture** — React 18 + Vite + TypeScript + Tailwind + shadcn on the frontend; Supabase (Postgres + Auth + Storage + Edge Functions Deno) as backend; Google Gemini for AI; Stripe for payments; RD Station + GA4/GTM/Meta Pixel for analytics.
- **Module map** — by feature folder (`src/pages/*`, `src/components/{marcas,personas,temas,categorias,create-content,quick-content,historico,team,system,...}`, `src/hooks/*`, `src/contexts/{AuthContext,BackgroundTaskContext,LanguageContext}`, `supabase/functions/*`).
- **Database** — Supabase as source of truth; types auto-generated to `src/integrations/supabase/types.ts` (never edit); environment isolation (AI/Edge Functions restricted to Test DB; no programmatic Live DB writes).

### 2. `AGENTS.md` (root) — operational rules for the agent
Sections (Psique-style):
1. Project purpose
2. Required reading before any implementation (CONTEXT.md, this file, docs/agents/*, relevant ADRs in `docs/adr/`, files in the affected module, tests)
3. Stack & scripts (`npm run dev`, `test`, `test:e2e`, `lint`, edge function workflow)
4. High-level architecture (link to CONTEXT.md)
5. Mandatory domain vocabulary (link to CONTEXT.md)
6. System roles
7. General agent rules — before/during/after coding; **stop-rule** for inconsistency, conflict, ambiguity (same five-point format as Psique)
8. React/TypeScript style — components, hooks, contexts, shadcn, raw `bg-card rounded-2xl` divs over Card; no hardcoded colors; semantic tokens via `index.css`
9. Supabase rules — RLS + GRANT on every public table; never edit auto-generated files (`src/integrations/supabase/client.ts`, `types.ts`, `.env`); migration workflow; `has_role` security-definer; `teammate_profiles` view for team data
10. Edge Functions — Deno runtime, shared utilities in `_shared/`, credit charging via `consume_workspace_credits` RPC after AI success, logging policy, compliance pipeline
11. Tests — Vitest unit, Playwright e2e, Selenium integration, Mocha for shared scripts; TDD flow; what to run when
12. Privacy & security — sensitive data list (email, phone, payment, brand assets, prompts), do-not-log rules, no enumeration, teammate privacy via view
13. Per-bounded-context guidelines: Auth & profiles · Brands · Personas · Themes · Categories · Content creation (image/carousel/quick/template/video/animate) · Calendar · History/Favorites/Trash · Team · Credits/Billing/Coupons · System admin · AI pipeline & compliance · Brand learning
14. Forbidden actions — political content; modifying Live DB programmatically; hardcoding colors; storing roles on profiles; bypassing RLS; using "revisar" instead of "ajustar"; adding "(opcional)" labels; re-adding Google OAuth on registration; etc.
15. Done-criteria checklist for every change

### 3. `docs/agents/domain.md`
Single-context layout note (one CONTEXT.md at the root). Consumer rules for keeping the glossary current; what changes require updating CONTEXT.md vs. an ADR.

### 4. `docs/agents/edge-functions.md`
Catalog of every function in `supabase/functions/` (40+ functions) with one-line purpose, auth requirement, credit cost (when applicable), inputs/outputs, environment vars. Conventions for new functions (auth helper, credit pre-check, AI call, post-process, credit deduction, error envelope).

### 5. `docs/agents/credits-and-billing.md`
Individual credit model v2 details: `profiles.credits`/`max_credits`/`credits_expire_at`, `consume_workspace_credits` RPC, credit costs table (image, carousel/slide, quick, video, template import, animate, plan, etc.), pricing model (R$ 2,90/credit base, packages, expiration), coupon redemption rules, Stripe checkout & webhook flow, refunds.

### 6. `docs/agents/ai-pipeline.md`
AI Context Philosophy (Master Prompt for intent + Art Director enrichment), image generation pipeline v5 (image first, then Vision for caption), fidelity guardrail (reference preservation, marketplace mode, professional ad hierarchy), text-on-image specs, brand-style feedback loop (top 3 approved recipes), compliance moderation (Brazilian laws, image-to-image correction), Gemini models in use, prompt-building modules (`_shared/imagePromptBuilder.ts`, `expandBriefing.ts`, `complianceCheck.ts`).

### 7. `docs/agents/security-and-privacy.md`
RLS + GRANT pattern; `user_roles` + `has_role`; teammate privacy via `teammate_profiles` view; environment DB isolation; sensitive-field list; logging rules; auth domain canonicalization (`pla.creator.lefil.com.br`); @lefil.com.br = Internal classification; admin@admin.com is the only system admin.

### 8. `docs/agents/ui-conventions.md`
Floating board layout (`bg-card rounded-2xl shadow-xl`, raw divs over Card); creation layout standards (max-w-7xl, fluid sidebars); breadcrumb standards (replace back buttons, hidden on mobile); content-result glassmorphism; recent activity carousel (Embla, 6 items, dragFree); creation-page input parity (CreateImage/CreateFromTemplate); terminology rules ("ajustar", no "(opcional)").

### 9. `docs/agents/testing.md`
What to run when (unit/e2e/integration), TDD loop, where tests live, fixtures, Playwright workspace (`playwright-fixture.ts`), Selenium config, do-not-modify rules.

### 10. `docs/agents/triage-and-issues.md`
Lightweight: GitHub-style issue conventions, ADR location (`docs/adr/NNNN-title.md`), when to write an ADR (hard-to-reverse + surprising + real trade-off), template references.

## Technical notes
- All content in **English** as requested.
- Source of truth: codebase (`src/App.tsx` routes, `supabase/functions/*`, `src/types/*`, `src/contexts/AuthContext.tsx`, ADRs `0001-0003`) plus project memory.
- No emojis. Tables/ASCII diagrams where helpful.
- AGENTS.md cross-links every `docs/agents/*` file in the relevant section.
- CONTEXT.md stays pure glossary + architecture overview (no implementation details, no scratch notes), per the Psique convention.
- I will not modify code, only create these 10 markdown files.

## Out of scope
- Editing existing code, migrations, edge functions.
- Creating new ADRs (existing 0001/0002/0003 will be referenced, not rewritten).
- Setting up GitHub Actions for issue triage labels (can be a follow-up).
