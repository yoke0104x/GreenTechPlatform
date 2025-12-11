import { AdminPark, PaginationParams, PaginatedResponse } from '@/lib/types/admin'

export interface AdminParkQueryParams extends Partial<PaginationParams> {
  level?: string
  provinceId?: string
  developmentZoneId?: string
}

export async function getParksAdminApi(
  params?: AdminParkQueryParams,
): Promise<PaginatedResponse<AdminPark>> {
  const searchParams = new URLSearchParams()

  if (params?.page) searchParams.append('page', String(params.page))
  if (params?.pageSize) searchParams.append('pageSize', String(params.pageSize))
  if (params?.search) searchParams.append('search', params.search)
  if (params?.sortBy) searchParams.append('sortBy', params.sortBy)
  if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder)
  if (params?.level) searchParams.append('level', params.level)
  if (params?.provinceId) searchParams.append('provinceId', params.provinceId)
  if (params?.developmentZoneId) {
    searchParams.append('developmentZoneId', params.developmentZoneId)
  }

  const response = await fetch(`/api/admin/parks?${searchParams.toString()}`)
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || '获取园区列表失败')
  }

  const result = await response.json()
  return {
    data: (result.data || []) as AdminPark[],
    pagination: result.pagination || {
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    },
  }
}

export async function createParkAdminApi(
  payload: Partial<AdminPark>,
): Promise<AdminPark> {
  const response = await fetch('/api/admin/parks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.error || '创建园区失败')
  }
  return result as AdminPark
}

export async function updateParkAdminApi(
  id: string,
  payload: Partial<AdminPark>,
): Promise<AdminPark> {
  const response = await fetch(`/api/admin/parks/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const result = await response.json()
  if (!response.ok) {
    throw new Error(result.error || '更新园区失败')
  }
  return result as AdminPark
}

export async function deleteParkAdminApi(id: string): Promise<void> {
  const response = await fetch(`/api/admin/parks/${id}`, {
    method: 'DELETE',
  })
  const result = await response.json()
  if (!response.ok || result.success === false) {
    throw new Error(result.error || result.message || '删除园区失败')
  }
}

