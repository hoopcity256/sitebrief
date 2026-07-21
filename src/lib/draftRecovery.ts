const DB_NAME = 'sitebrief-drafts'
const STORE   = 'report_drafts'
const VERSION = 1

export interface DraftPayload {
  work_completed: string
  problems: string
  next_steps: string
  /** Monotonically increasing revision counter — NOT a timestamp */
  revision: number
  savedAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function saveDraft(reportId: string, payload: DraftPayload): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(payload, reportId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadDraft(reportId: string): Promise<DraftPayload | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(reportId)
    req.onsuccess = () => resolve(req.result as DraftPayload | undefined)
    req.onerror = () => reject(req.error)
  })
}

export async function clearDraft(reportId: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(reportId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
