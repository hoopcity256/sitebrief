/**
 * Subscription service — browser side.
 *
 * Reads the `subscriptions` table (SELECT only, via RLS policy
 * "subscriptions_select_own").  All billing mutations go through
 * Supabase Edge Functions — never from the browser.
 *
 * Entitlement rules mirror the DB function has_active_access():
 *   'trialing'  + trial_end   IS NOT NULL + trial_end   > now()  → entitled
 *   'active'    + current_period_end IS NOT NULL
 *               + current_period_end > now()                      → entitled
 *   Everything else                                               → not entitled
 */

import { supabase } from './supabase'

// ── Types ─────────────────────────────────────────────────────────────────

export type SubscriptionStatus =
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'paused'

export interface SubscriptionRow {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: SubscriptionStatus
  trial_end: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

/**
 * Simplified view surfaced to UI components.
 */
export interface SubscriptionState {
  /** Raw row from Supabase, or null if no subscription row exists. */
  row: SubscriptionRow | null
  /** true when the user may create new reports and photos. */
  entitled: boolean
  /** true when on trial (subset of entitled). */
  isTrialing: boolean
  /** ISO string of trial end, or null. */
  trialEnd: string | null
  /** true when subscription will cancel at period end but is still active. */
  cancelAtPeriodEnd: boolean
}

// ── Entitlement logic ─────────────────────────────────────────────────────

/**
 * Pure function — mirrors has_active_access() in the DB.
 * Must stay in sync with the migration.
 */
export function computeEntitlement(row: SubscriptionRow | null): boolean {
  if (!row) return false
  const now = Date.now()

  if (row.status === 'trialing') {
    return row.trial_end !== null && new Date(row.trial_end).getTime() > now
  }
  if (row.status === 'active') {
    return (
      row.current_period_end !== null &&
      new Date(row.current_period_end).getTime() > now
    )
  }
  return false
}

export function buildSubscriptionState(row: SubscriptionRow | null): SubscriptionState {
  return {
    row,
    entitled: computeEntitlement(row),
    isTrialing: row?.status === 'trialing',
    trialEnd: row?.trial_end ?? null,
    cancelAtPeriodEnd: row?.cancel_at_period_end ?? false,
  }
}

// ── Data fetching ──────────────────────────────────────────────────────────

/**
 * Fetches the subscription row for the authenticated user.
 * Returns null if no row exists (user never started a trial).
 * Throws on network/auth errors.
 */
export async function fetchSubscription(): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .maybeSingle()

  if (error) throw error
  return data as SubscriptionRow | null
}

// ── Checkout & Portal ──────────────────────────────────────────────────────

/**
 * Redirects the user to Stripe Checkout.
 * Calls the `create-checkout-session` Edge Function.
 * `priceId` is one of VITE_STRIPE_MONTHLY_PRICE_ID or VITE_STRIPE_ANNUAL_PRICE_ID.
 * Those are public-safe IDs (not secrets).
 */
export async function redirectToCheckout(priceId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ url: string }>(
    'create-checkout-session',
    { body: { priceId } },
  )
  if (error) throw new Error(`Checkout error: ${error.message}`)
  if (!data?.url) throw new Error('No checkout URL returned')
  window.location.assign(data.url)
}

/**
 * Redirects the user to the Stripe Customer Portal.
 * Calls the `create-portal-session` Edge Function.
 */
export async function redirectToPortal(): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ url: string }>(
    'create-portal-session',
    { body: {} },
  )
  if (error) throw new Error(`Portal error: ${error.message}`)
  if (!data?.url) throw new Error('No portal URL returned')
  window.location.assign(data.url)
}
