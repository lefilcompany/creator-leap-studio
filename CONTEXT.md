# Context

## What Creator is

Creator (product brand: **Lefil Creator**, canonical domain `https://pla.creator.lefil.com.br`) is an AI-powered content marketing platform for brands, agencies and solo creators in Brazil.

The system turns a brand's identity (visual, voice, personas, strategic themes) into ready-to-publish social media content: single images, carousels, short videos, animated images, captions, content calendars and template-based variations.

This repository is a single-page React application (Vite + TypeScript + Tailwind + shadcn) backed by Supabase (Postgres + Auth + Storage + Edge Functions on Deno). All generative AI runs through Google Gemini. Billing is handled by Stripe. Marketing analytics flow to RD Station, GA4, GTM and Meta Pixel.

## Product goal

The platform must let a user:

* Register a brand and enrich it with personas, strategic themes and reusable visual templates.
* Generate on-brand content quickly through several creation modes (quick content, single image, carousel, from template, video, animate image, marketplace).
* Plan content ahead via a content calendar that drives sequential generation.
* Keep history, favorite results, send unwanted ones to trash and recover them within 30 days.
* Collaborate optionally with a team, with category-scoped access.
* Pay-as-you-go through an individual credit balance that can be topped up or extended with coupons.
* Trust that all AI output respects Brazilian legal guardrails and stays apolitical.

## System roles

### User

Anyone authenticatable in the system. Stored in `auth.users` (Supabase Auth) with a 1:1 row in `public.profiles`.

A profile owns:

* Personal data (name, email, avatar, phone, state, city).
* Individual credit balance (`credits`, `max_credits`, `credits_expire_at`).
* Plan and subscription state (`plan_id`, `subscription_status`, `subscription_period_end`).
* Optional `team_id` (team membership is **not** mandatory).

Use the word "user" for the base authenticatable entity.

### Team member

A user whose `profiles.team_id` points to a row in `public.teams`. Team membership unlocks shared categories and the team favorites library, but **never** shares credits — credits are strictly individual.

When querying teammate data, **always** use the `teammate_profiles` view, never `profiles` directly, to enforce privacy of sensitive fields.

### Team admin

The user referenced by `teams.admin_id`. Can transfer ownership and manage team members. Team admin is **not** a system-wide role.

### System admin

A user with a row in `public.user_roles` with `role = 'system'`. Currently the only system admin is `admin@admin.com`. System admin access is gated by the `has_role(uuid, app_role)` security-definer function. Roles **must never** be stored on `profiles` — only in `user_roles`.

## Domain vocabulary

### Brand

A client brand the user creates content for. Stored in `public.brands`.

Owns identity attributes (segment, values, keywords, goals, references, restrictions, special dates, promise), visual assets (logo, moodboard, reference image, color palette, brand color) and learning metadata (top approved recipes for the brand-style feedback loop).

Code term: `Brand` (`src/types/brand.ts`).

### Persona

An audience archetype attached to a brand. Stored in `public.personas`. Has its own marketplace where users can browse community personas (`PersonasMarketplace`).

Code term: `Persona`.

### Strategic theme

A recurring content pillar attached to a brand. Stored in `public.strategic_themes`. Used to seed briefings during content creation.

Code term: `Theme` (`src/types/theme.ts`).

### Brand template

A user-uploaded design (PDF or image) that is decomposed by AI into editable zones (text zones, image zones, background, fonts). Used by the *Create from template* flow to produce on-brand variations. See ADRs `0001-templates-backend.md`, `0002-templates-frontend.md`, `0003-templates-ai-agent.md`.

Stored in `public.brand_templates`. Imported via the `import-brand-template` edge function (costs **3 credits**), committed via `commit-brand-template`, deleted via `delete-brand-template`, rendered via `generate-from-template`.

Code term: `BrandTemplate` (`src/types/template.ts`).

### Action

Every content-producing operation creates a row in `public.actions`. The table is the single source of truth for history, favorites, trash and the action view.

Action types (`ActionType` enum in `src/types/action.ts`):

* `CRIAR_CONTEUDO` — display name "Criar conteúdo" (single image or carousel).
* `CRIAR_CONTEUDO_RAPIDO` — display name "Criar conteúdo rápido".
* `REVISAR_CONTEUDO` — display name "Revisar conteúdo" (internal code only; UI label uses **"Ajustar"**).
* `PLANEJAR_CONTEUDO` — display name "Calendário de Conteúdo".
* `GERAR_VIDEO` — display name "Gerar vídeo".

An action carries `status` ("Em revisão", "Aprovado", "Rejeitado"), `approved` boolean, `revisions` counter, a `details` JSON (prompt, platform, objective, etc.) and a `result` JSON (image URL, caption, hashtags, slides, etc.).

### Content creation modes

All reachable from `/create` (`ContentCreationSelector`):

* `/create/quick` — Quick content (`QuickContent`).
* `/create/image` — Single image / carousel (`CreateImage`).
* `/create/template` — From brand template (`CreateFromTemplate`).
* `/create/video` — Short video (`CreateVideo`).
* `/create/animate` — Animate a static image (`AnimateImage`).
* `/create/marketplace` — Marketplace content (`MarketplaceContent`).

### Content calendar

A multi-step planning flow that produces several calendar items in a row. Stored in `public.content_calendars` (parent) and `public.calendar_items` (children).

Four mandatory stages per item: `calendar → briefing → design → review → done`.

Internal action code: `PLANEJAR_CONTEUDO`. UI label: **"Calendário de Conteúdo"** (never "Planejar conteúdo").

### Suggested caption (Legenda sugerida v2)

Every generated image/carousel comes with a caption that follows a strict shape: **Title**, **Body**, **CTA**, **5 hashtags**.

### Category

A user-defined folder for organizing actions, brands or personas. Stored in `public.categories` with members in `public.category_members`.

Roles inside a category:

* `Dono` (owner).
* `Editor`.
* `Leitor` (read-only). **Leitor is hidden in the UI** — the role exists but is not offered as a choice.

### Favorite

A user-marked action. Two scopes: **"Para mim"** (personal) and **"Para a equipe"** (shared with team). Surfaced in `TeamFavoritesLibrary` and the history filter sidebar.

### Trash

Soft-deletion via a `deleted_at` timestamp. Items are retained for **30 days** and then hard-deleted by the `cleanup-trash` edge function (cron). Recovery flows live in `Trash` page and `useTrash` hook.

### Credit

Pay-as-you-go unit, **strictly individual**. Lives on `profiles.credits` (current balance), `profiles.max_credits` (last top-up size, used to know if a top-up is mandatory) and `profiles.credits_expire_at` (expiration date).

Credits are consumed server-side through the `consume_workspace_credits` RPC, always with a `p_action_type` string for traceability in `credit_history`.

Code references: `src/lib/creditCosts.ts`, `supabase/functions/_shared/creditCosts.ts`, `useCreditsAction`, `refreshUserCredits` in `AuthContext`.

### Plan

A commercial product the user subscribes to. Stored in `public.plans`. The default new account uses `plan_id = 'free'` with a trial window.

### Subscription

Stripe-backed recurring billing for plans. Managed by `create-checkout`, `customer-portal`, `setup-card`, `verify-payment`, `stripe-webhook`, `daily-subscription-check`, `check-subscription`. Status mirrored on `profiles.subscription_status` and `profiles.subscription_period_end`.

### Coupon

A code that **adds** credits to the user's balance and sets a 30-day expiration window. Coupons **never replace** existing credits and are individual. Redeemed via the `redeem-coupon` edge function. If a coupon code is captured before sign-up, it is stored in `localStorage` (`pending_coupon_code`) and replayed by `AuthContext` after the first authenticated load.

### Compliance check

A guardrail layer (`_shared/complianceCheck.ts`) that screens AI output against Brazilian legal rules (CONAR, Lei da Propaganda, food, finance, medical, etc.). On detection, the pipeline can auto-correct via image-to-image regeneration.

### Brand learning / Brand-style feedback

A learning loop that records which generated results the user approved. The top 3 approved recipes per brand are reinjected as references in subsequent prompts to anchor visual consistency.

### Chatbot

A floating Gemini-powered assistant (`PlatformChatbot`) themed with the Sparkles icon. Full-screen on mobile. Backed by the `platform-chat` edge function.

## Preferred terms

Use these in UI copy, issues, PRDs and documentation:

* **"Ajustar" / "Ajuste"**, never "Revisar" / "Revisão", when talking about refining an existing result.
* **"Calendário de Conteúdo"**, never "Planejar conteúdo" or "Planejamento", in user-facing copy.
* **"Marca"**, not "cliente" or "empresa".
* **"Persona"**, not "público-alvo".
* **"Crédito"**, not "token", "saldo" alone or "moeda".
* **"Cupom"**, not "voucher" or "promo code".
* **Never** label a field with **"(opcional)"** — optional state is conveyed by the absence of a required asterisk.
* The platform is **apolitical**. Never produce, suggest or accept political marketing content.
* Email addresses ending in `@lefil.com.br` are classified as **Internal** for analytics segmentation.

## Technical terms preserved in code

Keep these exact names when referring to existing models, modules or fields:

* `profiles`, `teams`, `teammate_profiles` (view), `user_roles`
* `brands`, `personas`, `strategic_themes`, `brand_templates`
* `actions`, `content_calendars`, `calendar_items`
* `categories`, `category_members`
* `plans`, `subscriptions`, `coupons`, `credit_history`
* `ActionType`, `app_role`, `has_role`
* `consume_workspace_credits` (RPC)
* AI shared modules: `imagePromptBuilder`, `expandBriefing`, `complianceCheck`, `templateAi`, `templateVision`, `templateInpainting`, `templateBackground`, `templateCanvas`, `templateFontCache`, `imagePostProcess`, `geminiClient`, `userCredits`, `creditHistory`, `textOverlay`

## High-level architecture

```
┌──────────────────────────────────────────────────────────────┐
│ Frontend (React 18 + Vite + TypeScript + Tailwind + shadcn)  │
│  src/pages/*           — route components (React Router v6)  │
│  src/components/*      — feature components + shadcn/ui      │
│  src/contexts/*        — Auth, BackgroundTask, Language      │
│  src/hooks/*           — TanStack Query data hooks           │
│  src/integrations/     — auto-generated Supabase client      │
└───────────────┬──────────────────────────────────────────────┘
                │ supabase-js (REST + Realtime + Auth + Storage)
                │ + supabase.functions.invoke(...)
                ▼
┌──────────────────────────────────────────────────────────────┐
│ Supabase                                                     │
│  Postgres + RLS + GRANT  — single source of truth            │
│  Auth (email/password + Google OAuth on /login only)         │
│  Storage (brand assets, generated images, templates)         │
│  Edge Functions (Deno) under supabase/functions/*            │
│   ├─ _shared/  — auth, credits, AI, compliance, templates    │
│   └─ feature functions: generate-image, generate-carousel-   │
│      images, generate-quick-content, generate-video,         │
│      import-brand-template, generate-from-template, ...      │
└───────────────┬──────────────────────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────────────────────┐
│ External services                                            │
│  Google Gemini  — all generative AI (text, image, vision)    │
│  Stripe         — checkout, subscriptions, webhooks          │
│  RD Station     — CRM + marketing automation                 │
│  GA4 / GTM / Meta Pixel — web analytics                      │
└──────────────────────────────────────────────────────────────┘
```

## Module map

### Frontend feature folders

* `src/pages/Dashboard.tsx` and `src/components/dashboard/*` — dashboard greeting, credit card, recent activity (Embla carousel, 6 items, `dragFree: true`), stats, banners.
* `src/pages/Brands.tsx`, `BrandView.tsx`, `src/components/marcas/*` — brand CRUD, brand color palette, moodboard, brand templates tab.
* `src/pages/Personas.tsx`, `PersonasMarketplace.tsx`, `PersonaView.tsx`, `src/components/personas/*` — personas + marketplace.
* `src/pages/Themes.tsx`, `ThemeView.tsx`, `src/components/temas/*` — strategic themes.
* `src/pages/Categories.tsx`, `CategoryView.tsx`, `src/components/categorias/*` — categories with role-based access.
* `src/pages/ContentCreationSelector.tsx` — entry point at `/create`.
* `src/components/create-content/carousel/*`, `regenerate/*` — carousel composition and per-slide regeneration.
* `src/components/quick-content/*` — quick content composer.
* `src/pages/CreateFromTemplate.tsx` and `src/components/marcas/templates/*` — template-based generation flow.
* `src/pages/History.tsx`, `src/components/historico/*` — history list, action card menu, action details, bulk selection, favorites, history filter sidebar.
* `src/pages/Team.tsx`, `TeamDashboard.tsx`, `src/components/team/*` — team management, ownership transfer, coupon redemption, team favorites library.
* `src/pages/Profile.tsx`, `PublicProfile.tsx`, `src/components/perfil/*` — profile + teammate-visible public profile (`/profile/:userId`).
* `src/pages/Credits.tsx`, `CreditHistory.tsx` — credit purchase and ledger.
* `src/pages/System.tsx` and `src/pages/system/*`, `src/components/system/*` — system admin console (users, teams, plans, coupons, logs, reports, settings). Gated by `SystemRoute`.

### Edge functions

See `docs/agents/edge-functions.md` for the full catalog. Conventionally grouped:

* **AI generation:** `generate-image`, `generate-carousel-images`, `generate-quick-content`, `generate-video`, `generate-from-template`, `generate-caption`, `generate-plan`, `generate-persona-avatar`, `animate-image`, `edit-image`.
* **Templates:** `import-brand-template`, `commit-brand-template`, `delete-brand-template`.
* **AI review:** `review-caption`, `review-image`, `review-text-for-image`, `revise-caption-openai`.
* **Credits & billing:** `create-checkout`, `customer-portal`, `setup-card`, `verify-payment`, `stripe-webhook`, `check-subscription`, `daily-subscription-check`, `redeem-coupon`, `purchase-personas`, `get-stripe-revenue`.
* **Account:** `deactivate-account`, `delete-account`, `reset-user-password`, `send-reset-password-email`.
* **System:** `cleanup-trash`, `check-gemini-quota`, `platform-chat`, `send-report-email`, `rd-station-integration`.
* **Migrations (one-shot):** `migrate-users`, `migrate-brands`, `migrate-personas`, `migrate-strategic-themes`, `migrate-action-images`.

## Database

Supabase Postgres is the source of truth. Schema types are auto-generated to `src/integrations/supabase/types.ts` — **never edit by hand**.

Every public-schema table MUST have:

1. `CREATE TABLE public.<name>(...)`
2. `GRANT` statements scoped to the policies that follow (typically `authenticated` and `service_role`; `anon` only when explicitly public).
3. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
4. `CREATE POLICY ...` per access pattern.

Roles must never be on `profiles` — only on `user_roles`, checked via the `has_role(_user_id, _role)` security-definer function.

### Environment isolation

* AI Edge Functions and the agent itself are **restricted to the Test environment database**.
* The Live (production) database **must not be modified programmatically** — production changes go through reviewed migrations, never ad-hoc SQL from edge functions or the agent.

See `docs/agents/security-and-privacy.md` for the full security model and `docs/agents/domain.md` for rules on keeping this glossary current.
