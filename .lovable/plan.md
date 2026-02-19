

## Fix: Google OAuth "redirect_uri_mismatch" Error on Custom Domain

### The Problem

When you click "Login with Google" on your custom domain `pla.creator.lefil.com.br`, Google rejects the request with a **400 error** because the redirect URI (`https://pla.creator.lefil.com.br`) is not registered as an authorized URI in the OAuth configuration.

### Root Cause

This is NOT a code bug. The code already correctly uses `window.location.origin` as the redirect URI. The issue is that the **Lovable Cloud authentication settings** need to include your custom domain as an allowed redirect URL.

### Solution

You need to add your custom domain to the **Redirect URLs** in the authentication settings:

1. Open your **Lovable Cloud backend** (use the button below)
2. Navigate to **Users** then **Authentication Settings**
3. Find the **Redirect URLs** (or Site URL / Allowed Redirect URLs) section
4. Add the following URLs:
   - `https://pla.creator.lefil.com.br`
   - `https://pla.creator.lefil.com.br/**` (wildcard for all subpaths)
5. Save the changes

Once these URLs are authorized, Google OAuth will work correctly on your custom domain.

### No Code Changes Needed

The current code in `Auth.tsx` is already correct:
```typescript
redirect_uri: window.location.origin
// This resolves to https://pla.creator.lefil.com.br when accessed from that domain
```

### Technical Details

The Lovable Cloud managed OAuth solution handles the Google OAuth client configuration. When a custom domain is used, the redirect URI changes from the default `*.lovable.app` domain to the custom domain, which must be explicitly whitelisted in the authentication redirect URL configuration.

