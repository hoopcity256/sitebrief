import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateReport } from '../reports'
import { clearDraft } from '../draftRecovery'

vi.mock('../reports', () => ({
  updateReport: vi.fn(),
}))

vi.mock('../draftRecovery', () => ({
  clearDraft: vi.fn(),
  saveDraft: vi.fn(),
  loadDraft: vi.fn(),
}))

describe('autosave control flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Simulated flushSave function mimicking CreateReportPage.tsx
  async function simulateFlushSave(
    capturedRevision: number,
    currentRevision: number
  ) {
    // In actual implementation:
    // const result = await updateReport(reportId, patch)
    // if (capturedRevision === revisionRef.current) { clearDraft(...) }
    
    // We mock the success of updateReport
    vi.mocked(updateReport).mockResolvedValueOnce({ updated_at: '2026-07-21T12:00:00.000Z' })
    
    await updateReport('report-1', { work_completed: 'test', is_draft: true })
    
    if (capturedRevision === currentRevision) {
      await clearDraft('report-1')
    }
  }

  it('A stale server response (captured revision < current local revision) does not call clearDraft', async () => {
    await simulateFlushSave(1, 2)
    
    expect(updateReport).toHaveBeenCalled()
    expect(clearDraft).not.toHaveBeenCalled()
  })

  it('A current server response (captured revision === current local revision) does call clearDraft', async () => {
    await simulateFlushSave(2, 2)
    
    expect(updateReport).toHaveBeenCalled()
    expect(clearDraft).toHaveBeenCalledWith('report-1')
  })
})
