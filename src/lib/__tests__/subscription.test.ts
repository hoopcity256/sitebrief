import { describe, it, expect } from 'vitest'
import { computeEntitlement, buildSubscriptionState, type SubscriptionRow } from '../subscription'

describe('subscription entitlement & state builder', () => {
  it('correctly assesses active trial entitlement', () => {
    const futureDate = new Date(Date.now() + 86400000 * 10).toISOString()
    const row: SubscriptionRow = {
      id: 'sub-1',
      user_id: 'usr-1',
      stripe_customer_id: 'cus-1',
      stripe_subscription_id: 'sub-1',
      status: 'trialing',
      trial_end: futureDate,
      current_period_end: null,
      cancel_at_period_end: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    expect(computeEntitlement(row)).toBe(true)
    const state = buildSubscriptionState(row)
    expect(state.entitled).toBe(true)
    expect(state.isTrialing).toBe(true)
    expect(state.cancelAtPeriodEnd).toBe(false)
  })

  it('retains entitlement when trial is scheduled to cancel at period end', () => {
    const futureDate = new Date(Date.now() + 86400000 * 10).toISOString()
    const row: SubscriptionRow = {
      id: 'sub-1',
      user_id: 'usr-1',
      stripe_customer_id: 'cus-1',
      stripe_subscription_id: 'sub-1',
      status: 'trialing',
      trial_end: futureDate,
      current_period_end: null,
      cancel_at_period_end: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    expect(computeEntitlement(row)).toBe(true)
    const state = buildSubscriptionState(row)
    expect(state.entitled).toBe(true)
    expect(state.isTrialing).toBe(true)
    expect(state.cancelAtPeriodEnd).toBe(true)
  })

  it('correctly assesses active paid subscription scheduled for cancellation', () => {
    const futureDate = new Date(Date.now() + 86400000 * 30).toISOString()
    const row: SubscriptionRow = {
      id: 'sub-2',
      user_id: 'usr-1',
      stripe_customer_id: 'cus-1',
      stripe_subscription_id: 'sub-2',
      status: 'active',
      trial_end: null,
      current_period_end: futureDate,
      cancel_at_period_end: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    expect(computeEntitlement(row)).toBe(true)
    const state = buildSubscriptionState(row)
    expect(state.entitled).toBe(true)
    expect(state.isTrialing).toBe(false)
    expect(state.cancelAtPeriodEnd).toBe(true)
  })

  it('denies entitlement for expired trial or past end date', () => {
    const pastDate = new Date(Date.now() - 3600000).toISOString()
    const row: SubscriptionRow = {
      id: 'sub-3',
      user_id: 'usr-1',
      stripe_customer_id: 'cus-1',
      stripe_subscription_id: 'sub-3',
      status: 'trialing',
      trial_end: pastDate,
      current_period_end: null,
      cancel_at_period_end: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    expect(computeEntitlement(row)).toBe(false)
    const state = buildSubscriptionState(row)
    expect(state.entitled).toBe(false)
  })
})
