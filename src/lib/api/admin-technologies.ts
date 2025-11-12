import { AdminTechnology, PaginationParams, PaginatedResponse, TechReviewStatus } from '@/lib/types/admin'

// 获取技术列表
export async function getTechnologiesApi(params?: Partial<PaginationParams & {
  userId?: string,
  reviewStatus?: TechReviewStatus,
  categoryId?: string,
  subcategoryId?: string,
  tertiaryCategoryId?: string,
  quaternaryCategoryId?: string,
  countryId?: string,
  provinceId?: string,
  developmentZoneId?: string,
}>): Promise<PaginatedResponse<AdminTechnology>> {
  const searchParams = new URLSearchParams()
  
  if (params?.page) searchParams.append('page', String(params.page))
  if (params?.pageSize) searchParams.append('pageSize', String(params.pageSize))
  if (params?.search) searchParams.append('search', params.search)
  if (params?.sortBy) searchParams.append('sortBy', params.sortBy)
  if (params?.sortOrder) searchParams.append('sortOrder', params.sortOrder)
  if (params?.userId) searchParams.append('userId', params.userId)
  if (params?.reviewStatus) searchParams.append('reviewStatus', params.reviewStatus)
  if (params?.categoryId) searchParams.append('categoryId', params.categoryId)
  if (params?.subcategoryId) searchParams.append('subcategoryId', params.subcategoryId)
  if (params?.tertiaryCategoryId) searchParams.append('tertiaryCategoryId', params.tertiaryCategoryId)
  if (params?.quaternaryCategoryId) searchParams.append('quaternaryCategoryId', params.quaternaryCategoryId)
  if (params?.countryId) searchParams.append('countryId', params.countryId)
  if (params?.provinceId) searchParams.append('provinceId', params.provinceId)
  if (params?.developmentZoneId) searchParams.append('developmentZoneId', params.developmentZoneId)

  const response = await fetch(`/api/admin/technologies?${searchParams}`)
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || '获取技术列表失败')
  }

  const result = await response.json()
  return {
    data: result.data || [],
    pagination: result.pagination || {
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0
    }
  }
}

// 创建技术
export async function createTechnologyApi(technologyData: Partial<AdminTechnology>): Promise<AdminTechnology> {
  const response = await fetch('/api/admin/technologies', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(technologyData),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || '创建技术失败')
  }

  return await response.json()
}

// 更新技术
export async function updateTechnologyApi(id: string, technologyData: Partial<AdminTechnology>): Promise<AdminTechnology> {
  const response = await fetch(`/api/admin/technologies/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(technologyData),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || '更新技术失败')
  }

  return await response.json()
}

// 删除技术
export async function deleteTechnologyApi(id: string): Promise<void> {
  const response = await fetch(`/api/admin/technologies/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || '删除技术失败')
  }
}

// 审核技术（通过或退回）
export async function reviewTechnologyApi(id: string, action: 'approve' | 'reject', reason?: string): Promise<AdminTechnology> {
  const response = await fetch(`/api/admin/technologies/${id}/review`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action,
      reason
    }),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || '审核技术失败')
  }

  return await response.json()
}
