import { describe, it, expect, beforeEach } from 'vitest'
import { saveDraft, loadDraft, clearDraft, DraftPayload } from '../draftRecovery'

describe('draftRecovery', () => {
  beforeEach(async () => {
    // We can clear IndexedDB by deleting the database or clearing the store.
    // For simplicity, we just rely on unique report IDs or clearDraft in tests,
    // but here we can just clear a specific ID.
    await clearDraft('report-1')
    await clearDraft('report-2')
  })

  it('saveDraft then loadDraft returns the same payload with matching revision', async () => {
    const payload: DraftPayload = {
      work_completed: 'Done work',
      problems: 'No problems',
      next_steps: 'Sleep',
      revision: 1,
      savedAt: 123456789,
    }
    await saveDraft('report-1', payload)
    const loaded = await loadDraft('report-1')
    expect(loaded).toEqual(payload)
  })

  it('clearDraft makes loadDraft return undefined', async () => {
    const payload: DraftPayload = {
      work_completed: 'Done work',
      problems: 'No problems',
      next_steps: 'Sleep',
      revision: 1,
      savedAt: 123456789,
    }
    await saveDraft('report-1', payload)
    await clearDraft('report-1')
    const loaded = await loadDraft('report-1')
    expect(loaded).toBeUndefined()
  })

  it('loadDraft for an unknown key returns undefined', async () => {
    const loaded = await loadDraft('unknown-report')
    expect(loaded).toBeUndefined()
  })

  it('Saving a higher-revision draft overwrites a lower-revision draft', async () => {
    const payload1: DraftPayload = {
      work_completed: 'Done work',
      problems: 'No problems',
      next_steps: 'Sleep',
      revision: 1,
      savedAt: 123456789,
    }
    await saveDraft('report-2', payload1)

    const payload2: DraftPayload = {
      work_completed: 'More work',
      problems: 'More problems',
      next_steps: 'More sleep',
      revision: 2,
      savedAt: 123456799,
    }
    await saveDraft('report-2', payload2)

    const loaded = await loadDraft('report-2')
    expect(loaded).toEqual(payload2)
  })
})
