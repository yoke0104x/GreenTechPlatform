import type { AdminParkBrandList } from '@/lib/types/admin'

export async function getParkBrandListsAdminApi(params?: {
  search?: string
}): Promise<AdminParkBrandList[]> {
  const searchParams = new URLSearchParams()
  if (params?.search) searchParams.set('search', params.search)

  const resp = await fetch(`/api/admin/park-brand-lists?${searchParams.toString()}`)
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok || json?.success === false) {
    throw new Error(json?.error || '获取品牌名录类别失败')
  }
  return (json?.data || []) as AdminParkBrandList[]
}

export async function getParkBrandListAdminApi(id: string): Promise<AdminParkBrandList | null> {
  const resp = await fetch(`/api/admin/park-brand-lists?id=${encodeURIComponent(id)}`)
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok || json?.success === false) {
    throw new Error(json?.error || '获取品牌名录类别失败')
  }
  return (json?.data || null) as AdminParkBrandList | null
}

export async function createParkBrandListAdminApi(payload: {
  title: string
  type: AdminParkBrandList['type']
  sort_order?: number
  is_active?: boolean
}): Promise<AdminParkBrandList> {
  const resp = await fetch('/api/admin/park-brand-lists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok || json?.success === false) {
    throw new Error(json?.error || '创建品牌名录类别失败')
  }
  return json.data as AdminParkBrandList
}

export async function updateParkBrandListAdminApi(payload: {
  id: string
  title?: string
  type?: AdminParkBrandList['type']
  sort_order?: number
  is_active?: boolean
}): Promise<AdminParkBrandList> {
  const resp = await fetch('/api/admin/park-brand-lists', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok || json?.success === false) {
    throw new Error(json?.error || '更新品牌名录类别失败')
  }
  return json.data as AdminParkBrandList
}

export async function deleteParkBrandListAdminApi(id: string): Promise<void> {
  const resp = await fetch(`/api/admin/park-brand-lists?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok || json?.success === false) {
    throw new Error(json?.error || '删除品牌名录类别失败')
  }
}
