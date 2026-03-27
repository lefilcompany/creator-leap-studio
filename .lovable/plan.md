

## Problem Analysis

The user created a coupon (VENCEDOR-RSUUPZUW, 300 credits) via the admin panel and tried to use it right after registration, but the credits were not applied. The coupon shows `uses_count: 0`, meaning redemption never completed.

**Root causes identified:**
1. There is **no coupon input field** on the Register page — coupons can only be redeemed post-login via the Header dialog
2. After registration, the user gets redirected to Stripe card setup, potentially losing the flow
3. If the user tries to redeem immediately after registering, there could be a timing issue where the profile isn't ready yet

## Plan

### 1. Add coupon field to the Registration form
- Add an optional "Código do cupom" input field at the bottom of the registration form (before the privacy checkbox)
- Store the coupon code in `formData` state
- Visual: small input with a Gift icon, marked as optional

### 2. Process coupon after successful registration
- After `supabase.auth.signUp` succeeds and the user is authenticated, call `supabase.functions.invoke('redeem-coupon')` with the coupon code
- Add a small delay (~2 seconds) to ensure the `handle_new_user` trigger has created the profile
- If redemption fails, show a toast warning but don't block the registration flow — the user can redeem later
- If successful, show a success toast with the credits received

### 3. Fix edge function timing resilience
- In `supabase/functions/redeem-coupon/index.ts`, add a retry mechanism when fetching the profile: if profile is not found, wait 1-2 seconds and retry once (handles race condition with `handle_new_user` trigger)

### 4. Fix coupon code case mismatch in `coupons_used` duplicate check
- The duplicate check uses `lowerCode` but the insert stores `dbCoupon.code` (uppercase). Normalize both to use the same case (uppercase from DB) to prevent bypass of duplicate detection.

### Files to modify
- `src/pages/Register.tsx` — add optional coupon field + post-signup redemption call
- `supabase/functions/redeem-coupon/index.ts` — add profile fetch retry + fix case mismatch in `coupons_used`

