# Credits and billing

Credits in Creator are **strictly individual**. They live on `public.profiles`, never on `public.teams`. Team membership does not pool credits.

## Profile fields

| Field | Meaning |
|---|---|
| `profiles.credits` | Current balance. Decreases on consumption, increases on top-up, coupon or refund. |
| `profiles.max_credits` | Last top-up size. Drives whether a top-up is mandatory in `DashboardCreditsCard`. |
| `profiles.credits_expire_at` | Expiration timestamp for the current balance window. |
| `profiles.plan_id` | Active plan (`'free'` by default). |
| `profiles.subscription_status` | Stripe-mirrored status. |
| `profiles.subscription_period_end` | Current billing period end. |

The frontend reads these through `AuthContext.user.{credits, maxCredits, creditsExpireAt, planId, subscriptionStatus, subscriptionPeriodEnd}` and refreshes them via `refreshUserCredits()` after any credit-consuming action.

## Consumption RPC

All consumption flows through:

```sql
public.consume_workspace_credits(
  p_user_id     uuid,
  p_amount      integer,
  p_action_type text,
  p_metadata    jsonb default '{}'::jsonb
)
```

Rules:

* Edge functions must call this RPC **after** AI success and **before** persisting the action row.
* `p_action_type` is a stable snake_case string ("generate_image", "generate_carousel_slide", "quick_content", "template_import", "template_image", "animate_image", "generate_video", "plan_content", etc.). It powers `credit_history` reporting.
* `p_metadata` carries the action context (brand_id, persona_id, template_id, slide_index, etc.) for traceability.

## Credit costs

The canonical source is `src/lib/creditCosts.ts` for the frontend pre-check and `supabase/functions/_shared/creditCosts.ts` for the server. The two files **must stay in sync**. When changing a cost, update both in the same change.

Existing cost keys include: `IMAGE`, `CAROUSEL_SLIDE`, `QUICK`, `VIDEO`, `ANIMATE`, `EDIT`, `CAPTION`, `PLAN`, `PERSONA_AVATAR`, `PERSONA_PURCHASE`, `TEMPLATE_IMPORT` (3), `TEMPLATE_IMAGE`.

## Pre-check before AI

Both the client (hook) and the server (edge function) should pre-check the user's balance:

* **Client** — to avoid expensive client-side work (e.g. PDF rasterization in `useImportTemplate`) when the user can't afford the operation.
* **Server** — to avoid Gemini calls when the balance is insufficient.

## Refunds

If an AI call fails after credits were already consumed, refund by inserting a compensating row in `credit_history` (or via the dedicated refund RPC if available) and surface `refunded: true` in the function response. Refresh `AuthContext` credits on the client.

## Pricing model

* Base unit: **R$ 2,90 per credit**.
* Top-up packages are configured in the Credits page (`/credits`).
* Credits expire — `credits_expire_at` carries the deadline. Expired credits are reset by a periodic job.
* Plan upgrades grant additional credits per billing period.

## Coupons

* Coupons **add** credits to the existing balance. They never replace it.
* Coupon redemption sets `credits_expire_at` to **30 days** from redemption.
* Redemption goes through `redeem-coupon`. The function validates the code, increments credits, updates expiration and inserts the audit row.
* **Pre-signup capture:** if a coupon code arrives on the landing page (e.g. via UTM/query string) before the user has signed up, store it in `localStorage` as `pending_coupon_code` and `pending_coupon_user_id`. After the first authenticated load, `AuthContext` automatically replays the redemption and removes the keys on success.

## Stripe integration

| Function | Role |
|---|---|
| `create-checkout` | Creates a Stripe checkout session for credit packages or plan upgrades. |
| `customer-portal` | Opens the Stripe customer portal so users can manage cards and subscriptions. |
| `setup-card` | Stripe setup intent for saving a card without immediate charge. |
| `verify-payment` | Confirms a checkout session and credits the user. Idempotent. |
| `stripe-webhook` | Receives `checkout.session.completed`, `invoice.*`, `customer.subscription.*` events. Updates `profiles.subscription_status`, `subscription_period_end` and credits. |
| `check-subscription` | On-demand status sync. |
| `daily-subscription-check` | Cron-triggered reconciliation. |

Webhook events must be idempotent — never double-credit on retry. Use the Stripe event ID as the idempotency key.

## UI surfaces

* `DashboardCreditsCard` — displays balance, expiration and a top-up CTA. When `credits === 0` and `max_credits > 0`, the top-up becomes mandatory.
* `Credits.tsx` — top-up flow.
* `CreditHistory.tsx` — ledger view, sourced from `useCreditHistory`.
* `RedeemCouponDialog.tsx` — coupon redemption inside the Team page.
* `CreditConfirmationDialog.tsx` — pre-action confirmation showing the credit cost.

## Forbidden

* Storing credits on `teams`.
* Letting coupons replace the existing balance.
* Charging credits before AI success.
* Skipping `consume_workspace_credits` and decrementing `profiles.credits` directly.
* Hardcoding cost values in components — always import from `creditCosts.ts`.
