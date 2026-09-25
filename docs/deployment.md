# SiteBrief — Cloudflare Pages Deployment

## Sandbox Deployment — LIVE

| Field | Value |
|-------|-------|
| Provider | Cloudflare Pages |
| CF Account | Limboproxy@gmail.com's Account |
| Project name | `sitebrief-sandbox` |
| **Canonical sandbox URL** | **https://sitebrief-sandbox.pages.dev** |
| Latest deployment URL | https://23fdb73a.sitebrief-sandbox.pages.dev |
| Deployment date | 2026-09-24 |
| Git baseline | `1ef7f4c  chore(deploy): configure hosted sandbox environment` |
| Production URL (DO NOT USE) | `sitebrief.scope-guard.com` — reserved for production |
| Production Supabase (DO NOT TOUCH) | `qbycpzfyugrsbckrpyak` |

## Supabase Configuration

| Field | Value |
|-------|-------|
| Sandbox project | `sitebrief-test` |
| Sandbox ref | `toitahshmkxazxqqopzg` |
| Sandbox URL | `https://toitahshmkxazxqqopzg.supabase.co` |

## Auth Redirect URLs (applied to sandbox toitahshmkxazxqqopzg)

| URL | Status |
|-----|--------|
| `https://127.0.0.1:3000` | ✅ Pre-existing |
| `http://localhost:5173/update-password` | ✅ Applied (session prior) |
| `https://sitebrief-sandbox.pages.dev/update-password` | ✅ Applied 2026-09-24 |

## Edge Function Secrets (sandbox only)

| Secret | Status |
|--------|--------|
| `APP_URL` | ✅ Set to `https://sitebrief-sandbox.pages.dev` |
| `STRIPE_SECRET_KEY` | ✅ Sandbox key |
| `STRIPE_WEBHOOK_SECRET` | ✅ Set |
| `STRIPE_MONTHLY_PRICE_ID` | ✅ `price_1UJHdtFLkoapZ9R3q6vFqBl4` |
| `STRIPE_ANNUAL_PRICE_ID` | ✅ `price_1UJHdtFLkoapZ9R3bkL4HcR5` |
| `SUPABASE_URL` | ✅ Sandbox URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Sandbox service role |

## Billing Redirect Analysis

Both Edge Functions (`create-checkout-session`, `create-portal-session`) use `getBaseUrl(req)`:
- Derives redirect URLs from the request `Origin` header
- Allows `origin === APP_URL` OR `origin.startsWith('http://localhost:')`
- `APP_URL` is now set to `https://sitebrief-sandbox.pages.dev`

| Redirect | URL |
|----------|-----|
| Checkout success | `https://sitebrief-sandbox.pages.dev/billing/success?session_id=...` |
| Checkout cancel | `https://sitebrief-sandbox.pages.dev/billing/cancel` |
| Portal return | `https://sitebrief-sandbox.pages.dev/more` |

## Environment Variables (VITE_ — baked into client bundle at build time)

| Variable | Value (name only — no secrets) |
|----------|------|
| `VITE_SUPABASE_URL` | `https://toitahshmkxazxqqopzg.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | sb_publishable_*** (sandbox anon key — safe for browser) |
| `VITE_STRIPE_MONTHLY_PRICE_ID` | `price_1UJHdtFLkoapZ9R3q6vFqBl4` |
| `VITE_STRIPE_ANNUAL_PRICE_ID` | `price_1UJHdtFLkoapZ9R3bkL4HcR5` |

Note: VITE_ vars were provided by `.env.local` at build time (sandbox values). Cloudflare Pages Build Variables should be set for future CI builds.

## Build Configuration

| Setting | Value |
|---------|-------|
| Build command | `npm run build` |
| Output directory | `dist/` |
| SPA fallback | `public/_redirects` → `/* /index.html 200` ✅ |
| Security headers | `public/_headers` ✅ |
| PWA manifest | `dist/manifest.json` ✅ |

## HTTP Smoke Test Results (2026-09-24)

| Route | Status | Notes |
|-------|--------|-------|
| `/` | 200 ✅ | HTML served |
| `/login` | 200 ✅ | SPA fallback working |
| `/signup` | 200 ✅ | SPA fallback working |
| `/reset-password` | 200 ✅ | SPA fallback working |
| `/update-password` | 200 ✅ | SPA fallback working |
| `/manifest.json` | 200 ✅ | PWA manifest loaded |

## Future Deployments

To redeploy after code changes:

```
cmd /c "npm run build"
cmd /c "npx wrangler pages deploy dist --project-name=sitebrief-sandbox --branch=main"
```

Wrangler must be authenticated (OAuth stored in `~/.wrangler/config/default.toml`).

## Production Guardrails

- Production Supabase `qbycpzfyugrsbckrpyak` — NOT TOUCHED
- Production DNS `sitebrief.scope-guard.com` — NOT TOUCHED
- Stripe Live — NOT USED
- Production Edge Functions — NOT TOUCHED
