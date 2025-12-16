import type {
  AdminParkRankingEntry,
  AdminParkRankingList,
  AdminParkRankingYear,
  ParkRankingKind,
  ParkRankingParkLevel,
} from '@/lib/types/admin'

export async function getParkRankingListsAdminApi(params?: {
  kind?: ParkRankingKind
  parkLevel?: ParkRankingParkLevel
  search?: string
}): Promise<AdminParkRankingList[]> {
  const searchParams = new URLSearchParams()
  if (params?.kind) searchParams.set('kind', params.kind)
  if (params?.parkLevel) searchParams.set('parkLevel', params.parkLevel)
  if (params?.search) searchParams.set('search', params.search)

  const resp = await fetch(`/api/admin/park-rankings/lists?${searchParams.toString()}`)
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok || json?.success === false) {
    throw new Error(json?.error || '获取榜单列表失败')
  }
  return (json?.data || []) as AdminParkRankingList[]
}

export async function getParkRankingListAdminApi(id: string): Promise<AdminParkRankingList | null> {
  const resp = await fetch(`/api/admin/park-rankings/lists?id=${encodeURIComponent(id)}`)
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok || json?.success === false) {
    throw new Error(json?.error || '获取榜单失败')
  }
  return (json?.data || null) as AdminParkRankingList | null
}

export async function createParkRankingListAdminApi(payload: {
  title_zh: string
  title_en?: string | null
  park_level: ParkRankingParkLevel
  kind: ParkRankingKind
  is_active?: boolean
}): Promise<AdminParkRankingList> {
  const resp = await fetch('/api/admin/park-rankings/lists', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok || json?.success === false) {
    throw new Error(json?.error || '创建榜单失败')
  }
  return json.data as AdminParkRankingList
}

export async function updateParkRankingListAdminApi(payload: {
  id: string
  title_zh?: string
  title_en?: string | null
  park_level?: ParkRankingParkLevel
  kind?: ParkRankingKind
  is_active?: boolean
}): Promise<AdminParkRankingList> {
  const resp = await fetch('/api/admin/park-rankings/lists', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok || json?.success === false) {
    throw new Error(json?.error || '更新榜单失败')
  }
  return json.data as AdminParkRankingList
}

export async function deleteParkRankingListAdminApi(id: string): Promise<void> {
  const resp = await fetch(`/api/admin/park-rankings/lists?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok || json?.success === false) {
    throw new Error(json?.error || '删除榜单失败')
  }
}

export async function getParkRankingYearsAdminApi(listId: string): Promise<AdminParkRankingYear[]> {
  const resp = await fetch(
    `/api/admin/park-rankings/years?listId=${encodeURIComponent(listId)}`,
  )
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok || json?.success === false) {
    throw new Error(json?.error || '获取榜单年度失败')
  }
  return (json?.data || []) as AdminParkRankingYear[]
}

export async function createParkRankingYearAdminApi(payload: {
  list_id: string
  year: number
  is_latest?: boolean
  is_published?: boolean
  is_active?: boolean
}): Promise<AdminParkRankingYear> {
  const resp = await fetch('/api/admin/park-rankings/years', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok || json?.success === false) {
    throw new Error(json?.error || '创建榜单年度失败')
  }
  return json.data as AdminParkRankingYear
}

export async function updateParkRankingYearAdminApi(payload: {
  id: string
  list_id?: string
  year?: number
  is_latest?: boolean
  is_published?: boolean
  is_active?: boolean
}): Promise<AdminParkRankingYear> {
  const resp = await fetch('/api/admin/park-rankings/years', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok || json?.success === false) {
    throw new Error(json?.error || '更新榜单年度失败')
  }
  return json.data as AdminParkRankingYear
}

export async function deleteParkRankingYearAdminApi(id: string): Promise<void> {
  const resp = await fetch(`/api/admin/park-rankings/years?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok || json?.success === false) {
    throw new Error(json?.error || '删除榜单年度失败')
  }
}

export async function getParkRankingEntriesAdminApi(yearId: string): Promise<AdminParkRankingEntry[]> {
  const resp = await fetch(
    `/api/admin/park-rankings/entries?yearId=${encodeURIComponent(yearId)}`,
  )
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok || json?.success === false) {
    throw new Error(json?.error || '获取榜单条目失败')
  }
  return (json?.data || []) as AdminParkRankingEntry[]
}

export async function createParkRankingEntryAdminApi(payload: {
  year_id: string
  park_id: string
  rank: number
  is_active?: boolean
}): Promise<AdminParkRankingEntry> {
  const resp = await fetch('/api/admin/park-rankings/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok || json?.success === false) {
    throw new Error(json?.error || '创建榜单条目失败')
  }
  return json.data as AdminParkRankingEntry
}

export async function updateParkRankingEntryAdminApi(payload: {
  id: string
  park_id?: string
  rank?: number
  is_active?: boolean
}): Promise<AdminParkRankingEntry> {
  const resp = await fetch('/api/admin/park-rankings/entries', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok || json?.success === false) {
    throw new Error(json?.error || '更新榜单条目失败')
  }
  return json.data as AdminParkRankingEntry
}

export async function deleteParkRankingEntryAdminApi(id: string): Promise<void> {
  const resp = await fetch(`/api/admin/park-rankings/entries?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  const json = await resp.json().catch(() => ({}))
  if (!resp.ok || json?.success === false) {
    throw new Error(json?.error || '删除榜单条目失败')
  }
}
