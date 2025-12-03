import { apiClient, type ApiResponse } from './index'
import { safeGet, safePost, safeDelete, handleApiResponse } from '@/lib/safe-fetch'

export type PolicyLevel = 'national' | 'ministry' | 'local' | 'park'

export interface PolicyTag {
  id: string
  code?: string | null
  name: string
}

export interface PolicyListItem {
  id: string
  name: string
  level: PolicyLevel
  ministryUnit?: string | null
  issuer?: string | null
  docNumber?: string | null
  publishDate?: string | null
  effectiveDate?: string | null
  summary?: string | null
  sourceUrl?: string | null
  tags: PolicyTag[]
  province: {
    id: string
    name: string
    nameEn?: string
    code: string
  } | null
  developmentZone: {
    id: string
    name: string
    nameEn?: string
    code: string
  } | null
}

export interface PolicyListParams {
  keyword?: string
  level?: PolicyLevel
  tags?: string[] // tag ids
  ministryUnit?: string
  province?: string
  developmentZone?: string
  publishDateFrom?: string
  publishDateTo?: string
  page?: number
  pageSize?: number
  sortBy?: 'publishDateAsc' | 'publishDateDesc'
}

export interface PolicyListResult {
  items: PolicyListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface PolicyDetail extends PolicyListItem {
  status: string
  dataSource?: string | null
  uploadedAt?: string | null
  modifiedAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface PolicyFavoriteItem {
  favoriteId: string
  userId: string
  policyId: string
  favoritedAt: string
  policy: {
    id: string
    level: PolicyLevel
    name: string
    summary?: string | null
    status: string
    issuer?: string | null
    docNumber?: string | null
    publishDate?: string | null
    effectiveDate?: string | null
    sourceUrl?: string | null
  } | null
}

export interface PolicyFavoriteStatusResponse {
  isFavorited: boolean
  favoriteId: string | null
  favoritedAt?: string
  policyId?: string
}

const buildQuery = (params: Record<string, string | undefined>) => {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) qs.append(key, value)
  })
  const query = qs.toString()
  return query ? `?${query}` : ''
}

export async function getPolicyTags(): Promise<ApiResponse<PolicyTag[]>> {
  try {
    const resp = await safeGet('/api/policy/tags')
    const result = await handleApiResponse(resp)
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch policy tags')
    }
    return { success: true, data: result.data as PolicyTag[], error: undefined }
  } catch (error) {
    console.error('Error fetching policy tags:', error)
    return {
      success: false,
      data: undefined,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function getPolicyList(
  params: PolicyListParams,
): Promise<ApiResponse<PolicyListResult>> {
  try {
    const query = new URLSearchParams()
    if (params.keyword) query.append('keyword', params.keyword)
    if (params.level) query.append('level', params.level)
    if (params.tags && params.tags.length) {
      query.append('tags', params.tags.join(','))
    }
    if (params.ministryUnit) {
      query.append('ministryUnit', params.ministryUnit)
    }
    if (params.province) query.append('province', params.province)
    if (params.developmentZone) {
      query.append('developmentZone', params.developmentZone)
    }
    if (params.publishDateFrom) {
      query.append('publishDateFrom', params.publishDateFrom)
    }
    if (params.publishDateTo) {
      query.append('publishDateTo', params.publishDateTo)
    }
    if (params.page != null) query.append('page', String(params.page))
    if (params.pageSize != null) {
      query.append('pageSize', String(params.pageSize))
    }
    if (params.sortBy) query.append('sortBy', params.sortBy)

    const resp = await safeGet(`/api/policy/list?${query.toString()}`)
    const result = await handleApiResponse(resp)
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch policies')
    }
    return {
      success: true,
      data: result.data as PolicyListResult,
      error: undefined,
    }
  } catch (error) {
    console.error('Error fetching policy list:', error)
    return {
      success: false,
      data: undefined,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function getPolicyDetail(
  id: string,
): Promise<ApiResponse<PolicyDetail>> {
  try {
    const resp = await safeGet(`/api/policy/${encodeURIComponent(id)}`)
    const result = await handleApiResponse(resp)
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch policy detail')
    }
    return {
      success: true,
      data: result.data as PolicyDetail,
      error: undefined,
    }
  } catch (error) {
    console.error('Error fetching policy detail:', error)
    return {
      success: false,
      data: undefined,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export async function getPolicyFavorites(
  userId?: string,
): Promise<PolicyFavoriteItem[]> {
  const resp = await safeGet(
    `/api/user/policy-favorites${buildQuery({ userId })}`,
    true,
  )
  const data = await handleApiResponse(resp)
  return (data?.favorites ?? []) as PolicyFavoriteItem[]
}

export async function addPolicyFavorite(
  policyId: string,
): Promise<PolicyFavoriteItem | null> {
  const resp = await safePost(
    '/api/user/policy-favorites',
    { policyId },
    true,
  )
  const data = await handleApiResponse(resp)
  return (data?.favorite ?? null) as PolicyFavoriteItem | null
}

export async function removePolicyFavorite(policyId: string): Promise<boolean> {
  const resp = await safeDelete(
    `/api/user/policy-favorites${buildQuery({ policyId })}`,
    true,
  )
  const data = await handleApiResponse(resp)
  return !!data?.success
}

export async function getPolicyFavoriteStatus(
  policyId: string,
): Promise<PolicyFavoriteStatusResponse> {
  try {
    const resp = await safeGet(
      `/api/user/policy-favorites${buildQuery({ policyId })}`,
      true,
    )
    const data = await handleApiResponse(resp)
    return data as PolicyFavoriteStatusResponse
  } catch (error) {
    // 未登录或其他错误时，返回未收藏状态，避免阻断详情页
    return { isFavorited: false, favoriteId: null }
  }
}
