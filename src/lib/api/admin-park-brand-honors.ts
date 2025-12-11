import { AdminParkBrandHonor } from '@/lib/types/admin'

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

