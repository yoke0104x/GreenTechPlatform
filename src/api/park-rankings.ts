import { safeGet, handleApiResponse } from '@/lib/safe-fetch'

export type ParkRankingKind = 'ranking' | 'brand'
export type ParkRankingParkLevel =
  | '国家级经济技术开发区'
  | '国家级高新技术产业开发区'

export interface ParkRankingYearOption {
  year: number
  isLatest: boolean
}

export interface ParkRankingParkLite {
  id: string
  nameZh: string
  nameEn?: string | null
  logoUrl?: string | null
  province: { id: string; nameZh: string; nameEn?: string | null; code?: string | null } | null
}

export interface ParkRankingEntry {
  rank: number
  previousRank?: number | null
  park: ParkRankingParkLite | null
}

export interface ParkRankingItem {
  id: string
  titleZh: string
  titleEn?: string | null
  parkLevel: string
  kind: ParkRankingKind
  year: number
  entries: ParkRankingEntry[]
}

export interface ParkRankingsResponse {
  kind: ParkRankingKind
  parkLevel: string | null
  selectedYear: number | null
  yearOptions: ParkRankingYearOption[]
  items: ParkRankingItem[]
}

export async function getParkRankings(params: {
  parkLevel?: ParkRankingParkLevel | ''
  kind?: ParkRankingKind
  year?: number | 'latest'
}): Promise<ParkRankingsResponse> {
  const sp = new URLSearchParams()
  if (params.parkLevel) sp.set('parkLevel', params.parkLevel)
  if (params.kind) sp.set('kind', params.kind)
  if (params.year) sp.set('year', String(params.year))

  const resp = await safeGet(`/api/parks/rankings?${sp.toString()}`)
  const result = await handleApiResponse(resp)
  if (!result?.success) {
    return {
      kind: params.kind || 'ranking',
      parkLevel: params.parkLevel || null,
      selectedYear: null,
      yearOptions: [],
      items: [],
    }
  }
  return result.data as ParkRankingsResponse
}
