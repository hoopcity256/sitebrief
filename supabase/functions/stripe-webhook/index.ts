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
 * Duplicate-trial prevention:
 *   On checkout.session.completed, the PaymentMethod fingerprint is retrieved
 *   and checked against `trial_redemptions`. If a prior trial was started with
 *   the same fingerprint by a DIFFERENT user, the new subscription is
 *   immediately cancelled and the subscription status is set to
 *   'incomplete_expired'. If same user, it is always allowed (re-subscribe).
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
        // here we ensure the customer → user mapping exists and handle
        // duplicate-trial enforcement.
        if (session.subscription && session.customer) {
          await handleCheckoutCompleted(session)
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
 * Handles checkout.session.completed.
 * - Resolves the user_id + subscription.
 * - Retrieves the PaymentMethod fingerprint for duplicate-trial detection.
 * - If a different user already used the same fingerprint for a trial,
 *   cancels the new subscription immediately and marks it incomplete_expired.
 * - Otherwise, records a trial_redemptions row and lets upsertSubscription proceed.
 *
 * NOTE: The fingerprint check only blocks NEW trialing subscriptions.
 * It never affects existing subscriptions (grandfathering).
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const subscriptionId = session.subscription as string
  const customerId = session.customer as string

  // Retrieve full subscription object
  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  const userId = await resolveUserId(sub, customerId)
  if (!userId) {
    throw new Error(`Cannot resolve user_id for customer ${customerId} / subscription ${subscriptionId}`)
  }

  // Only apply duplicate-trial enforcement for trialing subscriptions
  if (sub.status === 'trialing') {
    const fingerprint = await getPaymentFingerprint(session, sub)

    if (fingerprint) {
      // Check for an existing trial redemption with this fingerprint by a DIFFERENT user
      const { data: priorRedemption } = await adminSupabase
        .from('trial_redemptions')
        .select('user_id, stripe_subscription_id')
        .eq('payment_fingerprint', fingerprint)
        .neq('user_id', userId)
        .maybeSingle()

      if (priorRedemption) {
        // Duplicate trial detected from a different account.
        // Cancel the Stripe subscription immediately.
        console.warn(
          `Duplicate trial blocked: fingerprint ${fingerprint} already used by user ${priorRedemption.user_id}. ` +
          `Cancelling subscription ${subscriptionId} for user ${userId}.`
        )
        try {
          await stripe.subscriptions.cancel(subscriptionId)
        } catch (cancelErr) {
          console.error('Failed to cancel duplicate subscription:', cancelErr)
        }
        // Record as incomplete_expired in subscriptions table
        const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null
        const periodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null
        await adminSupabase.from('subscriptions').upsert({
          user_id:                 userId,
          stripe_customer_id:      customerId,
          stripe_subscription_id:  subscriptionId,
          status:                  'incomplete_expired',
          trial_end:               trialEnd,
          current_period_end:      periodEnd,
          cancel_at_period_end:    true,
          updated_at:              new Date().toISOString(),
        }, { onConflict: 'user_id' })
        return
      }
    }

    // Record this trial redemption
    try {
      const normalizedEmail = session.customer_details?.email?.toLowerCase().trim() ?? null
      const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null
      await adminSupabase.from('trial_redemptions').upsert({
        user_id:               userId,
        stripe_customer_id:    customerId,
        normalized_email:      normalizedEmail,
        payment_fingerprint:   fingerprint ?? null,
        stripe_subscription_id: subscriptionId,
        trial_started_at:      new Date().toISOString(),
        trial_end:             trialEnd,
      }, { onConflict: 'stripe_subscription_id' })
    } catch (recordErr) {
      // Non-fatal: log but don't block the checkout completion
      console.error('Failed to record trial_redemption:', recordErr)
    }
  }

  // Proceed with normal subscription upsert
  await upsertSubscription(sub, customerId)
}

/**
 * Retrieves the Stripe PaymentMethod fingerprint from the checkout session.
 * The fingerprint is available on the card payment method object after checkout.
 * Returns null if unavailable (should not block the trial).
 */
async function getPaymentFingerprint(
  session: Stripe.Checkout.Session,
  sub: Stripe.Subscription
): Promise<string | null> {
  try {
    // Prefer payment_intent's payment_method (most reliable for checkout)
    if (session.payment_intent) {
      const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string, {
        expand: ['payment_method'],
      })
      const pm = pi.payment_method as Stripe.PaymentMethod | null
      if (pm?.card?.fingerprint) return pm.card.fingerprint
    }

    // Fallback: default payment method on the subscription
    if (sub.default_payment_method) {
      const pm = await stripe.paymentMethods.retrieve(sub.default_payment_method as string)
      if (pm?.card?.fingerprint) return pm.card.fingerprint
    }

    // Fallback: customer's default payment method
    const customer = await stripe.customers.retrieve(sub.customer as string, {
      expand: ['default_source', 'invoice_settings.default_payment_method'],
    })
    if (!customer.deleted) {
      const defaultPm = customer.invoice_settings?.default_payment_method
      if (typeof defaultPm === 'object' && defaultPm !== null && defaultPm.card?.fingerprint) {
        return defaultPm.card.fingerprint
      }
    }
  } catch (err) {
    console.warn('Could not retrieve payment fingerprint:', err)
  }
  return null
}

/**
 * Resolves the Supabase user_id from a Stripe subscription.
 */
async function resolveUserId(sub: Stripe.Subscription, customerId: string): Promise<string | null> {
  // Try metadata on the subscription first.
  if (sub.metadata?.supabase_user_id) {
    return sub.metadata.supabase_user_id
  }

  // Fall back to the customer object.
  const customer = await stripe.customers.retrieve(customerId)
  if (!customer.deleted && customer.metadata?.supabase_user_id) {
    return customer.metadata.supabase_user_id
  }

  // Last resort: look up by existing stripe_customer_id.
  const { data: existing } = await adminSupabase
    .from('subscriptions')
    .select('user_id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  return existing?.user_id ?? null
}

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

  const userId = await resolveUserId(sub, customerId)
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
