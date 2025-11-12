// 三级分类 API 客户端

import { AdminTertiaryCategory } from '@/lib/types/admin'

const API_BASE_URL = '/api/admin/tertiary-categories'

export async function getTertiaryCategoriesApi(subcategoryId: string): Promise<AdminTertiaryCategory[]> {
  const res = await fetch(`${API_BASE_URL}?subcategory_id=${subcategoryId}`)
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error || 'Failed to fetch tertiary categories')
  }
  return Array.isArray(data) ? data : []
}

export async function createTertiaryCategoryApi(payload: {
  name_zh: string
  name_en: string
  slug: string
  sort_order?: number
  is_active?: boolean
  subcategory_id: string
}): Promise<AdminTertiaryCategory> {
  const res = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error || 'Failed to create tertiary category')
  }
  return data
}

export async function updateTertiaryCategoryApi(id: string, payload: Partial<AdminTertiaryCategory> & { slug?: string, subcategory_id?: string }): Promise<AdminTertiaryCategory> {
  const res = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error || 'Failed to update tertiary category')
  }
  return data
}

export async function deleteTertiaryCategoryApi(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json()
    throw new Error(data?.error || 'Failed to delete tertiary category')
  }
}

