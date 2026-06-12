# Edge Functions

All edge functions live under `supabase/functions/`. They run on Deno. Shared utilities live in `supabase/functions/_shared/`.

## Conventions for any new or modified function

1. **Authentication** — use `_shared/auth.ts`. Reject unauthenticated calls with a 401 JSON response. Never trust IDs sent by the client without re-checking ownership.
2. **Credit pre-check** — for any AI-consuming function, read `_shared/creditCosts.ts` and verify the user has enough credits **before** invoking Gemini, to avoid wasted spend.
3. **AI call** — go through `_shared/geminiClient.ts`. Do not embed model names or API keys inline; use the centralized client.
4. **Prompt construction** — use `_shared/imagePromptBuilder.ts`, `expandBriefing.ts`, `templateAi.ts` as appropriate. Never inline long prompt strings inside the function handler.
5. **Compliance check** — for any user-facing creative output, run `_shared/complianceCheck.ts`. On violation, attempt image-to-image auto-correction before failing.
6. **Post-processing** — use `_shared/imagePostProcess.ts` for resizing, watermarking or format conversion.
7. **Credit consumption** — after AI success and before persisting the action, call:

   ```ts
   await adminClient.rpc("consume_workspace_credits", {
     p_user_id: user.id,
     p_amount: CREDIT_COSTS.<ACTION>,
     p_action_type: "<snake_case_action>",
     p_metadata: { /* relevant context for credit_history */ }
   });
   ```

8. **Error envelope** — return `{ error: string }` with a 4xx/5xx status. Never leak provider error bodies, stack traces, tokens or service keys.
9. **Logging** — log with IDs and short messages. Never log prompts, generated text, base64 images, tokens, emails or any sensitive field.
10. **Action persistence** — for content-producing operations, insert a row in `public.actions` with the right `ActionType`, `details` and `result` JSONs.

## Function catalog

### AI generation

| Function | Purpose | Auth | Credits |
|---|---|---|---|
| `generate-image` | Single image (also used as the engine for carousel slides). Image-first pipeline, then Vision for caption. | Required | per `CREDIT_COSTS.IMAGE` |
| `generate-carousel-images` | Pure orchestrator: calls `generate-image` once per slide; the only direct Gemini call is `generateCarouselCaption`. | Required | per slide |
| `generate-quick-content` | Quick content composer (lower-fidelity, faster). | Required | per `CREDIT_COSTS.QUICK` |
| `generate-video` | Short video generation. | Required | per `CREDIT_COSTS.VIDEO` |
| `generate-from-template` | Renders a variation from a committed `brand_template`. | Required | per `CREDIT_COSTS.TEMPLATE_IMAGE` |
| `generate-caption` | Caption-only generation (Title, Body, CTA, 5 hashtags). | Required | per `CREDIT_COSTS.CAPTION` |
| `generate-plan` | Content calendar plan generation. | Required | per `CREDIT_COSTS.PLAN` |
| `generate-persona-avatar` | Persona avatar synthesis. | Required | per `CREDIT_COSTS.PERSONA_AVATAR` |
| `animate-image` | Animates a static image into a short clip. | Required | per `CREDIT_COSTS.ANIMATE` |
| `edit-image` | Image-to-image edit. | Required | per `CREDIT_COSTS.EDIT` |

### Brand templates

| Function | Purpose | Credits |
|---|---|---|
| `import-brand-template` | Vision analysis + zone extraction + background/inpainting prep. Pre-checks balance, charges only after AI success. | 3 |
| `commit-brand-template` | Persists the user-adjusted template after preview. | 0 |
| `delete-brand-template` | Removes a template and its assets. | 0 |

### AI review

| Function | Purpose |
|---|---|
| `review-caption` | Reviews / refines an existing caption. |
| `review-image` | Reviews an existing image. |
| `review-text-for-image` | Reviews on-image text overlays. |
| `revise-caption-openai` | Legacy caption refinement (slated for consolidation). |

### Credits and billing

| Function | Purpose |
|---|---|
| `create-checkout` | Creates a Stripe checkout session for credit purchases or plan upgrades. |
| `customer-portal` | Opens the Stripe customer portal. |
| `setup-card` | Stripe setup-intent for saving a card. |
| `verify-payment` | Verifies a Stripe payment session and credits the user. |
| `stripe-webhook` | Stripe webhook receiver. Updates subscriptions and credits. |
| `check-subscription` | On-demand subscription status check. |
| `daily-subscription-check` | Cron job for daily subscription reconciliation. |
| `redeem-coupon` | Redeems a coupon code, adds credits and sets a 30-day expiration. |
| `purchase-personas` | Buys a marketplace persona, deducting credits. |
| `get-stripe-revenue` | System-admin only revenue snapshot. |

### Account

| Function | Purpose |
|---|---|
| `deactivate-account` | Soft-deactivation. |
| `delete-account` | Hard-deletion. |
| `reset-user-password` | Admin-triggered password reset. |
| `send-reset-password-email` | User-triggered password reset email. |

### System

| Function | Purpose |
|---|---|
| `cleanup-trash` | Cron: hard-deletes items in trash older than 30 days. |
| `check-gemini-quota` | Quota check against Gemini before heavy operations. |
| `platform-chat` | Backend for the in-app Gemini chatbot. |
| `send-report-email` | Sends a user-submitted problem report. |
| `rd-station-integration` | Pushes user/lead events to RD Station with UTM context. |

### Migrations (one-shot, do not run on Live)

`migrate-users`, `migrate-brands`, `migrate-personas`, `migrate-strategic-themes`, `migrate-action-images`.

## Orchestration rules

* `generate-carousel-images` must remain a pure orchestrator. It calls `generate-image` per slide (with `parentActionId` linking slides to the carousel parent) so single-image and carousel-slide outputs stay visually consistent. Do not move generation logic back into the orchestrator.
* When a function fails after credits were consumed, surface a `refunded: true` flag in the response and call the refund path (or compensating insert in `credit_history`) so the user is not double-charged.
* Functions that touch `actions` must set `parentActionId` correctly for child actions (slides, regenerations, refinements) to keep history traversable.

## Environment isolation

All edge functions are restricted to the **Test** Supabase project. The Live database is read-only from the agent's perspective and is only modified through reviewed migrations.
