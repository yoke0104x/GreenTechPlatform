import { AdminPolicy, AdminPolicyTag, PaginationParams, PaginatedResponse } from '@/lib/types/admin'

export interface AdminPolicyQueryParams extends Partial<PaginationParams> {
  level?: string
  status?: string
}

export async function getPoliciesApi(
  params?: AdminPolicyQueryParams,
): Promise<PaginatedResponse<AdminPolicy>> {
  const searchParams = new URLSearchParams()

  if (params?.page) searchParams.append('page', String(params.page))
  if (params?.pageSize) searchParams.append('pageSize', String(params.pageSize))
  if (params?.search) searchParams.append('search', params.search)
  if (params?.sortBy) searchParams.append('sortBy', params.sortBy)
  if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder)
  if (params?.level) searchParams.append('level', params.level)
  if (params?.status) searchParams.append('status', params.status)

  const response = await fetch(`/api/admin/policy?${searchParams.toString()}`)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || '获取政策列表失败')
  }

  const result = await response.json()
  return {
    data: (result.data || []) as AdminPolicy[],
    pagination: result.pagination || {
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    },
  }
}

export async function createPolicyApi(
  payload: Partial<AdminPolicy> & { tags?: string[] },
): Promise<AdminPolicy> {
  const body = {
    name: payload.name,
    level: payload.level,
    status: payload.status,
    summary: payload.summary,
    issuer: payload.issuer,
    docNumber: (payload as any).docNumber ?? (payload as any).doc_number,
    publishDate: (payload as any).publishDate ?? (payload as any).publish_date,
    effectiveDate: (payload as any).effectiveDate ?? (payload as any).effective_date,
    sourceUrl: (payload as any).sourceUrl ?? (payload as any).source_url,
    regionId: (() => {
      const v = (payload as any).regionId ?? (payload as any).region_id
      return v === '' ? null : v
    })(),
    parkId: (() => {
      const v = (payload as any).parkId ?? (payload as any).park_id
      return v === '' ? null : v
    })(),
    dataSource: (payload as any).dataSource ?? (payload as any).data_source,
    tags: payload.tags,
  }

  const response = await fetch('/api/admin/policy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.error || '创建政策失败')
  }
  return result as AdminPolicy
}

export async function updatePolicyApi(
  id: string,
  payload: Partial<AdminPolicy> & { tags?: string[] },
): Promise<AdminPolicy> {
  const body = {
    name: payload.name,
    level: payload.level,
    status: payload.status,
    summary: payload.summary,
    issuer: payload.issuer,
    docNumber: (payload as any).docNumber ?? (payload as any).doc_number,
    publishDate: (payload as any).publishDate ?? (payload as any).publish_date,
    effectiveDate: (payload as any).effectiveDate ?? (payload as any).effective_date,
    sourceUrl: (payload as any).sourceUrl ?? (payload as any).source_url,
    regionId: (() => {
      const v = (payload as any).regionId ?? (payload as any).region_id
      return v === '' ? null : v
    })(),
    parkId: (() => {
      const v = (payload as any).parkId ?? (payload as any).park_id
      return v === '' ? null : v
    })(),
    dataSource: (payload as any).dataSource ?? (payload as any).data_source,
    tags: payload.tags,
  }

  const response = await fetch(`/api/admin/policy/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.error || '更新政策失败')
  }
  return result as AdminPolicy
}

export async function deletePolicyApi(id: string): Promise<void> {
  const response = await fetch(`/api/admin/policy/${id}`, {
    method: 'DELETE',
  })
  const result = await response.json()
  if (!response.ok || !result.success) {
    throw new Error(result.error || '删除政策失败')
  }
}

export async function getPolicyDetailApi(
  id: string,
): Promise<AdminPolicy & { tagIds?: string[] }> {
  const response = await fetch(`/api/admin/policy/${id}`)
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.error || '获取政策详情失败')
  }
  return result as AdminPolicy & { tagIds?: string[] }
}

// 标签管理
export async function getPolicyTagsAdminApi(params?: {
  search?: string
  status?: string
}): Promise<AdminPolicyTag[]> {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.append('search', params.search)
  if (params?.status) searchParams.append('status', params.status)

  const response = await fetch(`/api/admin/policy-tags?${searchParams.toString()}`)
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.error || '获取政策标签失败')
  }
  return (result.data || []) as AdminPolicyTag[]
}

export async function createPolicyTagAdminApi(
  payload: Partial<AdminPolicyTag>,
): Promise<AdminPolicyTag> {
  const response = await fetch('/api/admin/policy-tags', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.error || '创建政策标签失败')
  }
  return result as AdminPolicyTag
}

export async function updatePolicyTagAdminApi(
  id: string,
  payload: Partial<AdminPolicyTag>,
): Promise<AdminPolicyTag> {
  const response = await fetch(`/api/admin/policy-tags/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.error || '更新政策标签失败')
  }
  return result as AdminPolicyTag
}

export async function deletePolicyTagAdminApi(id: string): Promise<void> {
  const response = await fetch(`/api/admin/policy-tags/${id}`, {
    method: 'DELETE',
  })
  const result = await response.json()
  if (!response.ok || !result.success) {
    throw new Error(result.error || '删除政策标签失败')
  }
}
