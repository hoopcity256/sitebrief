# SiteBrief — Cloudflare Pages deployment configuration
# Sandbox project: sitebrief-sandbox
# Production project (DO NOT USE for sandbox): sitebrief (connected to sitebrief.scope-guard.com)
#
# To deploy to the sandbox:
#
#   CLOUDFLARE_API_TOKEN=<token> CLOUDFLARE_ACCOUNT_ID=<account_id> npx wrangler pages deploy dist --project-name=sitebrief-sandbox
#
# Environment variables (set in Cloudflare Pages dashboard or via wrangler secret):
#   VITE_SUPABASE_URL                — https://toitahshmkxazxqqopzg.supabase.co
#   VITE_SUPABASE_PUBLISHABLE_KEY    — sb_publishable_v4EVb... (sandbox anon/publishable key)
#   VITE_STRIPE_MONTHLY_PRICE_ID     — price_1UJHdtFLkoapZ9R3q6vFqBl4 (sandbox)
#   VITE_STRIPE_ANNUAL_PRICE_ID      — price_1UJHdtFLkoapZ9R3bkL4HcR5 (sandbox)
#
# Note: VITE_ env vars are baked into the client bundle at build time.
# For Cloudflare Pages CI builds, these must be set as Build Variables in the
# Pages project settings (NOT as Worker secrets, which are server-side).
#
# For local manual deploys (owner runs build then wrangler deploy):
# 1. Ensure .env.local has the sandbox values (already correct)
# 2. Run: npm run build
# 3. Run: CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... npx wrangler pages deploy dist --project-name=sitebrief-sandbox
#
# SPA routing: handled by public/_redirects (/* /index.html 200)
# Security headers: handled by public/_headers
# No wrangler.toml is needed for a simple static Pages project.
