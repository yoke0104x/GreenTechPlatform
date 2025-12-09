import { safeGet, safePost, safeDelete, handleApiResponse } from '@/lib/safe-fetch'

export interface ParkTag {
  id: string
  code?: string | null
  name: string
}

export interface ParkLocation {
  id: string
  name: string
  nameEn?: string | null
  code?: string | null
}

export interface ParkListItem {
  id: string
  name: string
  nameEn?: string | null
  level?: string | null
  levelCode?: string | null
  logoUrl?: string | null
  brief?: string | null
  updatedAt?: string | null
  province: ParkLocation | null
  developmentZone: ParkLocation | null
  tags: ParkTag[]
}

export interface ParkListResponse {
  items: ParkListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ParkEconomicStat {
  year: number
  gdpBillion?: number | null
  taxRevenueBillion?: number | null
  industrialOutputBillion?: number | null
  fixedAssetInvestmentBillion?: number | null
  utilizedForeignCapitalBillionUsd?: number | null
  totalImportExportBillionUsd?: number | null
  totalImportBillionUsd?: number | null
  totalExportBillionUsd?: number | null
  worldTop500Count?: number | null
}

export interface ParkGreenStat {
  year: number
  metrics: Record<string, number | string | null>
}

export interface ParkDetail {
  id: string
  name: string
  nameEn?: string | null
  level?: string | null
  levelCode?: string | null
  logoUrl?: string | null
  province: ParkLocation | null
  developmentZone: ParkLocation | null
  city?: string | null
  address?: string | null
  areaKm2?: number | null
  population?: number | null
  establishedDate?: string | null
  websiteUrl?: string | null
  wechatOfficialAccount?: string | null
  leadingIndustries?: string | null
  leadingCompanies?: string | null
  alias?: string | null
  dialect?: string | null
  climate?: string | null
  regionDesc?: string | null
  nearbyAirports?: string | null
  nearbyRailwayStations?: string | null
  famousScenicSpots?: string | null
  licensePlateCode?: string | null
  phoneAreaCode?: string | null
  postalCode?: string | null
  briefZh?: string | null
  briefEn?: string | null
  brandHonors: string[]
  tags: ParkTag[]
  economicStats: ParkEconomicStat[]
  greenStats: ParkGreenStat[]
  updatedAt?: string | null
  createdAt?: string | null
}

export interface ParkPolicyItem {
  id: string
  name: string
  level: string
  issuer?: string | null
  docNumber?: string | null
  publishDate?: string | null
  summary?: string | null
}

export interface ParkPoliciesResponse {
  items: ParkPolicyItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface ParkFavoriteItem {
  favoriteId: string
  userId: string
  parkId: string
  favoritedAt: string
  park: {
    id: string
    name_zh: string
    name_en?: string | null
    level?: string | null
    level_code?: string | null
    logo_url?: string | null
    brief_zh?: string | null
    brief_en?: string | null
  } | null
}

export async function getParks(params: {
  keyword?: string
  level?: string
  province?: string
  developmentZone?: string
  tags?: string[]
  sortBy?: 'updatedAtDesc' | 'updatedAtAsc' | 'nameAsc' | 'nameDesc'
  page?: number
  pageSize?: number
}): Promise<ParkListResponse> {
  const searchParams = new URLSearchParams()

  if (params.keyword) searchParams.set('keyword', params.keyword)
  if (params.level) searchParams.set('level', params.level)
  if (params.province) searchParams.set('province', params.province)
  if (params.developmentZone) searchParams.set('developmentZone', params.developmentZone)
  if (params.tags && params.tags.length) searchParams.set('tags', params.tags.join(','))
  if (params.sortBy) searchParams.set('sortBy', params.sortBy)
  if (params.page) searchParams.set('page', String(params.page))
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))

  const resp = await safeGet(`/api/parks/list?${searchParams.toString()}`)
  const result = await handleApiResponse(resp)
  if (!result?.success) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: params.pageSize || 10,
      totalPages: 0,
    }
  }
  return result.data as ParkListResponse
}

export async function getParkDetail(id: string): Promise<ParkDetail | null> {
  const resp = await safeGet(`/api/parks/${id}`)
  const result = await handleApiResponse(resp)
  if (!result?.success || !result.data) return null
  return result.data as ParkDetail
}

export async function getParkTags(): Promise<ParkTag[]> {
  const resp = await safeGet('/api/parks/tags')
  const result = await handleApiResponse(resp)
  if (!result?.success || !Array.isArray(result.data)) return []
  return result.data as ParkTag[]
}

export async function getParkPolicies(params: {
  parkId: string
  keyword?: string
  sortBy?: 'publishDateDesc' | 'publishDateAsc'
  page?: number
  pageSize?: number
}): Promise<ParkPoliciesResponse> {
  const searchParams = new URLSearchParams()
  if (params.keyword) searchParams.set('keyword', params.keyword)
  if (params.sortBy) searchParams.set('sortBy', params.sortBy)
  if (params.page) searchParams.set('page', String(params.page))
  if (params.pageSize) searchParams.set('pageSize', String(params.pageSize))

  const resp = await safeGet(
    `/api/parks/${params.parkId}/policies?${searchParams.toString()}`,
  )
  const result = await handleApiResponse(resp)
  if (!result?.success || !result.data) {
    return {
      items: [],
      total: 0,
      page: 1,
      pageSize: params.pageSize || 10,
      totalPages: 0,
    }
  }
  return result.data as ParkPoliciesResponse
}

export async function getParkFavoriteStatus(parkId: string): Promise<{
  isFavorited: boolean
  favoriteId: string | null
}> {
  try {
    const resp = await safeGet(
      `/api/user/park-favorites?parkId=${encodeURIComponent(parkId)}`,
      true,
    )
    const data = await handleApiResponse(resp)
    if (typeof data?.isFavorited === 'boolean') {
      return {
        isFavorited: data.isFavorited,
        favoriteId: (data as any).favoriteId ?? null,
      }
    }
    return { isFavorited: false, favoriteId: null }
  } catch {
    // 未登录或其他错误时，返回未收藏状态，避免阻断详情页
    return { isFavorited: false, favoriteId: null }
  }
}

export async function addParkFavorite(parkId: string): Promise<boolean> {
  const resp = await safePost(
    '/api/user/park-favorites',
    { parkId },
    true,
  )
  const data = await handleApiResponse(resp)
  return !!data?.favorite
}

export async function removeParkFavorite(parkId: string): Promise<boolean> {
  const resp = await safeDelete(
    `/api/user/park-favorites?parkId=${encodeURIComponent(parkId)}`,
    true,
  )
  const data = await handleApiResponse(resp)
  return !!data?.success
}

export async function getParkFavorites(userId?: string): Promise<ParkFavoriteItem[]> {
  const searchParams = new URLSearchParams()
  if (userId) searchParams.set('userId', userId)

  const resp = await safeGet(
    `/api/user/park-favorites${searchParams.toString() ? `?${searchParams.toString()}` : ''}`,
    true,
  )
  const data = await handleApiResponse(resp)
  if (!data || !Array.isArray(data.favorites)) return []
  return data.favorites as ParkFavoriteItem[]
}
