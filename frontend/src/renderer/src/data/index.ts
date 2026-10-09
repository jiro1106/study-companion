import { createApi, mockModeFrom } from './api'
import { sampleSeed } from './sample'

export const mockMode = mockModeFrom(import.meta.env.MODE)

/** The only data entry point for screens. Swap this for the real backend client later. */
export const api = createApi({ mode: mockMode, seed: sampleSeed })

export { ApiError, toApiError } from './api'
export type * from './types'
