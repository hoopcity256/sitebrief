-- =============================================================================
-- SiteBrief — Trial Redemptions (Duplicate-Trial Prevention)
-- File: supabase/migrations/20260926000000_trial_redemptions.sql
--
-- Purpose: Track payment-method fingerprints used to start trials.
-- Enforcement: Server-side in the stripe-webhook Edge Function.
-- Client-side checks are UX only and do not substitute for server enforcement.
--
-- Architecture:
--   1. Stripe Checkout completes → checkout.session.completed webhook fires.
--   2. Webhook retrieves the PaymentMethod fingerprint from the session's
--      payment_intent or setup_intent (available at checkout completion).
--   3. Before upserting subscriptions.status = 'trialing', check
--      trial_redemptions for an existing row with the same fingerprint.
--   4. If duplicate found AND the existing trial is still active (or was active):
--      - Set the new subscription status to 'incomplete_expired' (not trialing)
--      - Cancel the duplicate Stripe subscription
--   5. Otherwise insert a trial_redemptions row and proceed normally.
--
-- Grandfathering:
--   Existing subscriptions are NOT retroactively matched (fingerprint is NULL
--   for rows inserted before this migration). The duplicate check is
--   fingerprint IS NOT NULL + fingerprint = NEW fingerprint.
--
-- RLS: Users cannot read or write trial_redemptions directly.
--      Only the Edge Function (service role) reads/writes this table.
--
-- APPLY TO SANDBOX ONLY — do not apply to production without review.
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.trial_redemptions (
  id                   UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_id              UUID        NOT NULL,
  stripe_customer_id   TEXT        NOT NULL,
  -- Normalized lowercase email; stored for informational purposes only.
  -- Do NOT rely solely on email for duplicate detection (easily bypassed).
  normalized_email     TEXT,
  -- Stripe payment method fingerprint (e.g., card fingerprint from PM object).
  -- NULL if the fingerprint could not be retrieved (should not block trial).
  payment_fingerprint  TEXT,
  stripe_subscription_id TEXT      NOT NULL,
  trial_started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_end            TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT trial_redemptions_pkey          PRIMARY KEY (id),
  CONSTRAINT trial_redemptions_sub_id_key    UNIQUE (stripe_subscription_id),
  CONSTRAINT trial_redemptions_user_id_fkey  FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Index for fingerprint lookups (duplicate-trial check)
CREATE INDEX IF NOT EXISTS trial_redemptions_fingerprint_idx
  ON public.trial_redemptions (payment_fingerprint)
  WHERE payment_fingerprint IS NOT NULL;

-- Index for user lookups
CREATE INDEX IF NOT EXISTS trial_redemptions_user_id_idx
  ON public.trial_redemptions (user_id);

-- RLS: enabled but no policies — only service role (Edge Function) may access.
ALTER TABLE public.trial_redemptions ENABLE ROW LEVEL SECURITY;

-- Explicitly deny browser access; service role bypasses RLS.
-- (No SELECT/INSERT/UPDATE/DELETE policies = no browser access.)

COMMIT;
