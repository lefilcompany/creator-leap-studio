

## Problem

The edge function `redeem-coupon` fails to boot due to a **duplicate variable declaration**: `upperCode` is declared on line 222 and again on line 485 within the same function scope. This causes a `SyntaxError` that prevents the function from running at all.

## Fix

Rename the second `upperCode` declaration (line 485) to reuse the existing variable instead of re-declaring it. Since `upperCode` is already defined on line 222 as `normalizedCode.toUpperCase()`, line 485 is redundant — just remove it and use the existing `upperCode`.

### File: `supabase/functions/redeem-coupon/index.ts`
- **Line 485**: Remove `const upperCode = normalizedCode.toUpperCase();` — the variable already exists from line 222 with the same value.

This single-line fix resolves the boot error and allows coupon redemption to work in both the modal and registration flows.

