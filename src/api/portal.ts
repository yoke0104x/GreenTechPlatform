import { safeGet, handleApiResponse } from '@/lib/safe-fetch'

export interface PortalStats {
  techCount: number
  parkCount: number
  policyCount: number
  generatedAt: string
  source?: 'cache' | 'db'
}

export async function getPortalStats(): Promise<
  | { success: true; data: PortalStats }
  | { success: false; error: string }
> {
  try {
    const resp = await safeGet('/api/portal/stats')
    const result = await handleApiResponse(resp)
    if (!result?.success || !result.data) {
      return { success: false, error: result?.error || 'Failed to load portal stats' }
    }
    return { success: true, data: result.data as PortalStats }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

