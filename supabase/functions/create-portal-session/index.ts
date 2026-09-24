/**
 * create-portal-session
 *
 * Creates a Stripe Customer Portal session so authenticated users can
 * manage their subscription (upgrade, downgrade, cancel, update payment).
 *
 * Security:
 *   - JWT verified before any Stripe call.
 *   - Stripe secret key lives only in Edge Function secrets.
 *   - If the user has no stripe_customer_id yet, returns 400 (they cannot
 *     manage a subscription that doesn't exist).
 *
 * Request body: {} (empty — user identity comes from the JWT)
 * Response:     { url: string }
 */

import Stripe from 'npm:stripe@17'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-06-30.basil',
})

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL           = Deno.env.get('APP_URL') ?? 'https://sitebrief.scope-guard.com'

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  const isAllowed = origin === APP_URL || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : APP_URL,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

function getBaseUrl(req: Request): string {
  const origin = req.headers.get('Origin') ?? ''
  const isAllowed = origin === APP_URL || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')
  return isAllowed ? origin : APP_URL
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── 1. Verify JWT ─────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401, corsHeaders)

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401, corsHeaders)

    // ── 2. Look up stripe_customer_id ─────────────────────────────────────
    const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: sub } = await adminSupabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const customerId = sub?.stripe_customer_id
    if (!customerId) {
      return json({ error: 'No billing account found. Please subscribe first.' }, 400, corsHeaders)
    }

    // ── 3. Create portal session ──────────────────────────────────────────
    const baseUrl = getBaseUrl(req)
    const session = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: `${baseUrl}/more`,
    })

    return json({ url: session.url }, 200, corsHeaders)
  } catch (err: unknown) {
    console.error('create-portal-session error:', err)
    return json({ error: 'Internal server error' }, 500, corsHeaders)
  }
})

// ── Helpers ───────────────────────────────────────────────────────────────

function json(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  })
}
