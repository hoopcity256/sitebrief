/**
 * create-checkout-session
 *
 * Creates a Stripe Checkout Session for a new or upgrading subscriber and
 * returns the session URL for the client to redirect to.
 *
 * Security:
 *   - Called only by authenticated users (JWT verified via Supabase).
 *   - price IDs are validated against the server-side environment variables —
 *     the client cannot choose an arbitrary price.
 *   - STRIPE_SECRET_KEY lives only in Edge Function secrets, never in the client.
 *
 * Request body: { priceId: string }
 * Response:     { url: string }
 */

import Stripe from 'npm:stripe@17'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-06-30.basil',
})

const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const APP_URL           = Deno.env.get('APP_URL') ?? 'https://sitebrief.scope-guard.com'

// Server-side allowlist — client cannot specify an arbitrary price.
const ALLOWED_PRICES = new Set([
  Deno.env.get('STRIPE_MONTHLY_PRICE_ID'),
  Deno.env.get('STRIPE_ANNUAL_PRICE_ID'),
])

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  // Allow configured APP_URL or local development origins
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
    // ── 1. Verify the Supabase JWT ─────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Unauthorized' }, 401, corsHeaders)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return json({ error: 'Unauthorized' }, 401, corsHeaders)
    }

    // ── 2. Parse and validate the request body ─────────────────────────────
    const body = await req.json().catch(() => ({})) as { priceId?: unknown }
    const priceId = body.priceId

    if (typeof priceId !== 'string' || !ALLOWED_PRICES.has(priceId)) {
      return json({ error: 'Invalid price ID' }, 400, corsHeaders)
    }

    // ── 3. Look up or create a Stripe Customer ────────────────────────────
    //    Use the service-role client to read the subscriptions table.
    const adminSupabase = createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: sub } = await adminSupabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle()

    let customerId: string

    if (sub?.stripe_customer_id) {
      customerId = sub.stripe_customer_id
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
    }

    // ── 4. Create the Checkout Session ────────────────────────────────────
    const baseUrl = getBaseUrl(req)
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_collection: 'always',
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { supabase_user_id: user.id },
      },
      success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${baseUrl}/billing/cancel`,
    })

    return json({ url: session.url }, 200, corsHeaders)
  } catch (err: unknown) {
    console.error('create-checkout-session error:', err)
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
