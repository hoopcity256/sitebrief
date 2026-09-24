/**
 * stripe-webhook
 *
 * Receives Stripe webhook events and updates the `subscriptions` table.
 *
 * Idempotency:
 *   Every event is recorded in `stripe_webhook_events` before processing.
 *   If a row with `processed_at IS NOT NULL` already exists for this
 *   stripe_event_id, the event is silently skipped.
 *
 * Supported events:
 *   - checkout.session.completed
 *   - customer.subscription.created
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *
 * Security:
 *   - Signature verified with STRIPE_WEBHOOK_SECRET before any processing.
 *   - Uses service_role key — bypasses RLS intentionally.
 *   - No JWT check — Stripe calls this endpoint directly.
 */

import Stripe from 'npm:stripe@17'
import { createClient } from 'npm:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2025-06-30.basil',
})

const WEBHOOK_SECRET      = Deno.env.get('STRIPE_WEBHOOK_SECRET')!
const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const adminSupabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // ── 1. Verify Stripe signature ────────────────────────────────────────────
  const sig = req.headers.get('stripe-signature')
  if (!sig) return new Response('Missing signature', { status: 400 })

  let event: Stripe.Event
  try {
    const rawBody = await req.text()
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, WEBHOOK_SECRET)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', msg)
    return new Response(`Webhook Error: ${msg}`, { status: 400 })
  }

  // ── 2. Idempotency check ──────────────────────────────────────────────────
  const eventCreatedAt = new Date(event.created * 1000).toISOString()

  // Upsert the event log row; if already processed, skip.
  const { data: existing } = await adminSupabase
    .from('stripe_webhook_events')
    .select('processed_at')
    .eq('stripe_event_id', event.id)
    .maybeSingle()

  if (existing?.processed_at) {
    console.log(`Skipping already-processed event ${event.id}`)
    return new Response(JSON.stringify({ received: true, skipped: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Mark the event as started.
  await adminSupabase.from('stripe_webhook_events').upsert({
    stripe_event_id:       event.id,
    event_type:            event.type,
    stripe_created_at:     eventCreatedAt,
    processing_started_at: new Date().toISOString(),
    attempt_count:         (existing ? 0 : 0) + 1,
  }, { onConflict: 'stripe_event_id' })

  let processingError: string | null = null

  try {
    // ── 3. Route by event type ───────────────────────────────────────────────
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        // Subscription is provisioned by customer.subscription.created;
        // here we just ensure the customer → user mapping exists.
        if (session.subscription && session.customer) {
          await upsertSubscriptionById(
            session.subscription as string,
            session.customer as string,
          )
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await upsertSubscription(sub)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await upsertSubscription(sub)
        break
      }

      default:
        // Unhandled events — acknowledged but not processed.
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (err: unknown) {
    processingError = err instanceof Error ? err.message : 'Unknown processing error'
    console.error(`Error processing event ${event.id}:`, processingError)

    // Record the error; do NOT mark as processed so it can be retried.
    await adminSupabase.from('stripe_webhook_events')
      .update({ processing_error: processingError })
      .eq('stripe_event_id', event.id)

    // Return 500 so Stripe will retry.
    return new Response(
      JSON.stringify({ received: true, error: 'Processing failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // ── 4. Mark as successfully processed ────────────────────────────────────
  await adminSupabase.from('stripe_webhook_events')
    .update({ processed_at: new Date().toISOString() })
    .eq('stripe_event_id', event.id)

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Resolves a subscription by ID from Stripe and upserts into `subscriptions`.
 * Used when we have a session but not the full subscription object.
 */
async function upsertSubscriptionById(
  subscriptionId: string,
  customerId: string,
): Promise<void> {
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  await upsertSubscription(sub, customerId)
}

/**
 * Upserts a Stripe subscription object into the `subscriptions` table.
 * Resolves the Supabase user_id from stripe_customer_id metadata or existing row.
 */
async function upsertSubscription(
  sub: Stripe.Subscription,
  overrideCustomerId?: string,
): Promise<void> {
  const customerId = overrideCustomerId ?? (sub.customer as string)

  // Resolve user_id from customer metadata or existing subscription row.
  let userId: string | null = null

  // Try metadata on the subscription first.
  if (sub.metadata?.supabase_user_id) {
    userId = sub.metadata.supabase_user_id
  }

  // Fall back to the customer object.
  if (!userId) {
    const customer = await stripe.customers.retrieve(customerId)
    if (!customer.deleted && customer.metadata?.supabase_user_id) {
      userId = customer.metadata.supabase_user_id
    }
  }

  // Last resort: look up by existing stripe_customer_id.
  if (!userId) {
    const { data: existing } = await adminSupabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customerId)
      .maybeSingle()
    userId = existing?.user_id ?? null
  }

  if (!userId) {
    throw new Error(
      `Cannot resolve user_id for customer ${customerId} / subscription ${sub.id}`,
    )
  }

  const trialEnd        = sub.trial_end        ? new Date(sub.trial_end        * 1000).toISOString() : null
  const periodEnd       = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null
  const eventCreatedAt  = new Date(sub.created * 1000).toISOString()

  await adminSupabase.from('subscriptions').upsert({
    user_id:                 userId,
    stripe_customer_id:      customerId,
    stripe_subscription_id:  sub.id,
    status:                  sub.status,
    trial_end:               trialEnd,
    current_period_end:      periodEnd,
    cancel_at_period_end:    sub.cancel_at_period_end,
    stripe_event_created_at: eventCreatedAt,
    updated_at:              new Date().toISOString(),
  }, { onConflict: 'user_id' })
}
