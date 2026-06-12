# Security and privacy

## Threat surface

Creator handles personal data, brand intellectual property and financial state:

* Personal: name, email, phone, city, state, avatar URL.
* Auth: passwords are hashed by Supabase Auth; tokens are short-lived JWTs.
* Billing: Stripe customer ID, payment-method metadata, subscription status.
* Brand assets: logos, moodboards, color palettes, reference images, full prompts and briefings.
* Credit ledger: balance, transactions, coupon usage.
* AI output: generated images, captions, plans, video clips.

## RLS and GRANTs

Every `public` table follows the same pattern:

```sql
CREATE TABLE public.<table> ( ... );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.<table> TO authenticated;
GRANT ALL ON public.<table> TO service_role;
-- GRANT SELECT ON public.<table> TO anon;  -- only if a policy explicitly allows anonymous reads

ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "..." ON public.<table>
  FOR <SELECT|INSERT|UPDATE|DELETE>
  TO authenticated
  USING ( <ownership or relationship check> )
  WITH CHECK ( <ownership or relationship check> );
```

A migration without GRANTs is broken, even with RLS enabled — Supabase's Data API will return a permission error.

## Roles

The only place roles live is `public.user_roles` with the enum `app_role`. Roles are checked exclusively through the security-definer function:

```sql
public.has_role(_user_id uuid, _role app_role) RETURNS boolean
```

* Never store roles on `profiles`.
* Never reference `user_roles` directly from an RLS policy (causes recursion).
* Never check admin status client-side via `localStorage`, `sessionStorage` or hardcoded credentials.

System admin is gated by `has_role(auth.uid(), 'system')`. The only system admin is `admin@admin.com`.

## Teammate privacy

Teammates should not see each other's sensitive fields (email, phone, billing, internal IDs). All teammate-facing queries must go through the `teammate_profiles` view, which exposes only the safe subset:

* Always read teammate data from `teammate_profiles`, never from `profiles`.
* `PublicProfile` page (`/profile/:userId`) reads from `teammate_profiles`.
* New teammate-facing UI must follow the same rule.

## Environment isolation

* The agent and AI edge functions are **restricted to the Test database**.
* The Live database is not modified programmatically. Production changes go through reviewed migrations only.
* The `auth`, `storage`, `realtime`, `supabase_functions` and `vault` schemas are off-limits (no triggers, no direct writes).

## Sensitive field handling

Do not:

* Log sensitive fields, prompts, generated text, base64 images, tokens, emails, payment data.
* Return sensitive fields in public endpoints or to anonymous users.
* Reveal whether an email exists during authentication errors (no user enumeration).
* Echo or return `SUPABASE_SERVICE_ROLE_KEY` or the database password (not accessible on Lovable Cloud anyway).
* Include service role keys, project URLs or Supabase dashboard links in user-facing copy.

Prefer IDs and generic messages in logs. When you must log a payload, redact known sensitive keys first.

## Authentication

* Email + password and Google OAuth via Supabase Auth.
* Google OAuth is enabled **only on `/login`**, never on `/register` / `/cadastro` (per the onboarding simplification memory).
* The canonical domain is `https://pla.creator.lefil.com.br`. `creator-v4.lovable.app` and other aliases must redirect to the canonical domain.
* UTM parameters captured on landing are propagated to Supabase `user_metadata` and forwarded to RD Station via `rd-station-integration`.
* `@lefil.com.br` emails are classified as **Internal** for analytics segmentation.

## CSP and tracking pixels

`<noscript>` tracking pixel fallbacks must live in `<body>`, never in `<head>`. The HTML5 spec only allows metadata tags inside `<noscript>` in `<head>`.

## Stripe

* Webhook events must be idempotent (use the Stripe event ID as the idempotency key).
* Never log full Stripe payloads — store the event ID and the subset needed for reconciliation.

## Forbidden

* Storing roles on `profiles`.
* Client-side admin checks.
* Querying `profiles` for teammate data instead of `teammate_profiles`.
* Logging sensitive fields, prompts or generated content.
* Touching `auth`, `storage`, `realtime`, `supabase_functions`, `vault` schemas.
* Modifying the Live database programmatically.
* Enabling Google OAuth on registration screens.
* Exposing Supabase dashboard links or service role keys in the UI.
