// 四级分类 API 客户端

import { AdminQuaternaryCategory, NationalEconomyMapping } from '@/lib/types/admin'

const API_BASE_URL = '/api/admin/quaternary-categories'

export async function getQuaternaryCategoriesApi(tertiaryCategoryId: string): Promise<AdminQuaternaryCategory[]> {
  const res = await fetch(`${API_BASE_URL}?tertiary_category_id=${tertiaryCategoryId}`)
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error || 'Failed to fetch quaternary categories')
  }
  return Array.isArray(data) ? data : []
}

type QuaternaryPayload = {
  name_zh: string
  name_en: string
  slug: string
  sort_order?: number
  is_active?: boolean
  tertiary_category_id: string
  national_economy_mappings: NationalEconomyMapping[]
}

export async function createQuaternaryCategoryApi(payload: QuaternaryPayload): Promise<AdminQuaternaryCategory> {
  const res = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error || 'Failed to create quaternary category')
  }
  return data
}

export async function updateQuaternaryCategoryApi(
  id: string,
  payload: Partial<AdminQuaternaryCategory> & { slug?: string, tertiary_category_id?: string }
): Promise<AdminQuaternaryCategory> {
  const res = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error || 'Failed to update quaternary category')
  }
  return data
}

export async function deleteQuaternaryCategoryApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data?.error || 'Failed to delete quaternary category')
  }
}
