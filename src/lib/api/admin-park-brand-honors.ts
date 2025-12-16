import { AdminParkBrandHonor, type PaginatedResponse } from '@/lib/types/admin'

export async function getParkBrandHonorsApi(
  parkId: string,
): Promise<AdminParkBrandHonor[]> {
  const response = await fetch(
    `/api/admin/park-brand-honors?parkId=${encodeURIComponent(parkId)}`,
  )
  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error || '获取园区品牌荣誉失败')
  }

  return (result.data || []) as AdminParkBrandHonor[]
}

export async function getParkBrandHonorsAdminList(params?: {
  page?: number
  pageSize?: number
  title?: string
  type?: string
  searchPark?: string
}): Promise<PaginatedResponse<AdminParkBrandHonor>> {
  const searchParams = new URLSearchParams()
  if (params?.page) searchParams.set('page', String(params.page))
  if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize))
  if (params?.title) searchParams.set('title', params.title)
  if (params?.type) searchParams.set('type', params.type)
  if (params?.searchPark) searchParams.set('searchPark', params.searchPark)

  const resp = await fetch(`/api/admin/park-brand-honors?${searchParams.toString()}`)
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok || json?.success === false) {
    throw new Error(json?.error || '获取品牌名录失败')
  }
  return {
    data: (json?.data || []) as AdminParkBrandHonor[],
    pagination: json?.pagination || { page: 1, pageSize: 10, total: 0, totalPages: 0 },
  }
}

export async function createParkBrandHonorApi(
  payload: Partial<AdminParkBrandHonor> & { park_id: string },
): Promise<AdminParkBrandHonor> {
  const response = await fetch('/api/admin/park-brand-honors', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const result = await response.json()
  if (!response.ok || !result.success) {
    throw new Error(result.error || '创建园区品牌荣誉失败')
  }

  return result.data as AdminParkBrandHonor
}

export async function updateParkBrandHonorApi(
  id: string,
  payload: Partial<AdminParkBrandHonor>,
): Promise<AdminParkBrandHonor> {
  const response = await fetch('/api/admin/park-brand-honors', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, ...payload }),
  })

  const result = await response.json()
  if (!response.ok || !result.success) {
    throw new Error(result.error || '更新园区品牌荣誉失败')
  }

  return result.data as AdminParkBrandHonor
}

export async function deleteParkBrandHonorApi(id: string): Promise<void> {
  const response = await fetch(
    `/api/admin/park-brand-honors?id=${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    },
  )

  const result = await response.json()
  if (!response.ok || !result.success) {
    throw new Error(result.error || '删除园区品牌荣誉失败')
  }
}
