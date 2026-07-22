import 'fake-indexeddb/auto'
import { vi } from 'vitest'

// Mock createImageBitmap and canvas for unit tests
// Real compression is validated by manual mobile acceptance tests
global.createImageBitmap = vi.fn() as any
