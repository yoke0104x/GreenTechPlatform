import { safeGet, handleApiResponse } from '@/lib/safe-fetch'

export interface BrandDirectoryTagResponse {
  tags: string[]
  items: BrandDirectoryItem[]
}

export interface BrandDirectoryParkLite {
  id: string
  nameZh: string
  nameEn?: string | null
  level?: string | null
  logoUrl?: string | null
  province: { id: string; nameZh: string; nameEn?: string | null; code?: string | null } | null
}

export interface BrandDirectoryEntry {
  id: string
  approvedAt?: string | null
  year?: number | null
  type?: string | null
  park: BrandDirectoryParkLite | null
}

export interface BrandDirectoryItem {
  title: string
  entries: BrandDirectoryEntry[]
}

export async function getParkBrandDirectory(params?: { title?: string }): Promise<BrandDirectoryTagResponse> {
  const sp = new URLSearchParams()
  if (params?.title) sp.set('title', params.title)

  const resp = await safeGet(`/api/parks/brand-directory?${sp.toString()}`)
  const result = await handleApiResponse(resp)
  if (!result?.success) {
    return { tags: [], items: [] }
  }
  return result.data as BrandDirectoryTagResponse
}

