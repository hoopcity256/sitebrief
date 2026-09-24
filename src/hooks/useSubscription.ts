/**
 * useSubscription — React hook
 *
 * Fetches the current user's subscription on mount and re-fetches
 * whenever the component requests a refresh (e.g., after returning from
 * Stripe Checkout via /billing/success).
 *
 * Components import this hook to read entitlement state.
 * They never read the raw subscriptions table directly.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  fetchSubscription,
  buildSubscriptionState,
  type SubscriptionState,
} from '../lib/subscription'

interface UseSubscriptionResult {
  subscription: SubscriptionState
  loading: boolean
  error: string | null
  /** Call this to force a fresh fetch (e.g., after returning from checkout). */
  refetch: () => void
}

const LOADING_STATE: SubscriptionState = {
  row: null,
  entitled: false,
  isTrialing: false,
  trialEnd: null,
  cancelAtPeriodEnd: false,
}

export function useSubscription(): UseSubscriptionResult {
  const [subscription, setSubscription] = useState<SubscriptionState>(LOADING_STATE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  const refetch = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetchSubscription()
      .then((row) => {
        if (!cancelled) {
          setSubscription(buildSubscriptionState(row))
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Could not load subscription status.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [tick])

  return { subscription, loading, error, refetch }
}
