'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Plus, RefreshCcw, Trash2 } from 'lucide-react'
import { DataTable, type Column } from '@/components/admin/data-table/data-table'
import type {
  AdminPark,
  AdminParkRankingEntry,
  AdminParkRankingList,
  AdminParkRankingYear,
} from '@/lib/types/admin'
import { getParksAdminApi } from '@/lib/api/admin-parks'
import {
  createParkRankingEntryAdminApi,
  createParkRankingYearAdminApi,
  deleteParkRankingEntryAdminApi,
  deleteParkRankingYearAdminApi,
  getParkRankingEntriesAdminApi,
  getParkRankingListAdminApi,
  getParkRankingYearsAdminApi,
  updateParkRankingEntryAdminApi,
  updateParkRankingYearAdminApi,
} from '@/lib/api/admin-park-rankings'

function YearFormModal(props: {
  open: boolean
  initial?: AdminParkRankingYear | null
  listId: string
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { open, initial, listId, onClose, onSaved } = props
  const [values, setValues] = useState({
    year: '',
    is_latest: false,
    is_published: true,
    is_active: true,
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setValues({
      year: initial?.year ? String(initial.year) : '',
      is_latest: initial?.is_latest ?? false,
      is_published: initial?.is_published ?? true,
      is_active: initial?.is_active ?? true,
    })
  }, [open, initial])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {initial?.id ? '编辑年度' : '新增年度'}
          </h2>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (submitting) return
            const parsedYear = Number(values.year.trim())
            if (Number.isNaN(parsedYear)) return
            setSubmitting(true)
            try {
              if (initial?.id) {
                await updateParkRankingYearAdminApi({
                  id: initial.id,
                  list_id: listId,
                  year: parsedYear,
                  is_latest: values.is_latest,
                  is_published: values.is_published,
                  is_active: values.is_active,
                })
              } else {
                await createParkRankingYearAdminApi({
                  list_id: listId,
                  year: parsedYear,
                  is_latest: values.is_latest,
                  is_published: values.is_published,
                  is_active: values.is_active,
                })
              }
              await onSaved()
              onClose()
            } finally {
              setSubmitting(false)
            }
          }}
          className="px-4 py-4 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">年度</label>
            <input
              value={values.year}
              onChange={(e) => setValues((p) => ({ ...p, year: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="例如：2023"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 select-none">
              <input
                type="checkbox"
                checked={values.is_latest}
                onChange={(e) => setValues((p) => ({ ...p, is_latest: e.target.checked }))}
              />
              标记为最新
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 select-none">
              <input
                type="checkbox"
                checked={values.is_published}
                onChange={(e) => setValues((p) => ({ ...p, is_published: e.target.checked }))}
              />
              发布到前台
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 select-none">
              <input
                type="checkbox"
                checked={values.is_active}
                onChange={(e) => setValues((p) => ({ ...p, is_active: e.target.checked }))}
              />
              启用
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => !submitting && onClose()}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting || !values.year.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EntryFormModal(props: {
  open: boolean
  initial?: AdminParkRankingEntry | null
  list?: AdminParkRankingList | null
  year?: AdminParkRankingYear | null
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const { open, initial, list, year, onClose, onSaved } = props
  const [rank, setRank] = useState('')
  const [parkId, setParkId] = useState('')
  const [parkSearch, setParkSearch] = useState('')
  const [parks, setParks] = useState<AdminPark[]>([])
  const [loadingParks, setLoadingParks] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const loadParks = useCallback(
    async (q: string) => {
      if (!list?.park_level) return
      setLoadingParks(true)
      try {
        const res = await getParksAdminApi({
          page: 1,
          pageSize: 20,
          search: q.trim() || undefined,
          level: list.park_level,
        })
        setParks(res.data || [])
      } catch (e) {
        console.warn('加载园区候选失败:', e)
        setParks([])
      } finally {
        setLoadingParks(false)
      }
    },
    [list?.park_level],
  )

  useEffect(() => {
    if (!open) return
    setRank(initial?.rank ? String(initial.rank) : '')
    setParkId(initial?.park_id || '')
    setParkSearch('')
    setParks([])
    if (!initial?.id) {
      loadParks('')
    }
  }, [open, initial?.id, initial?.park_id, initial?.rank, loadParks])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => {
      loadParks(parkSearch)
    }, 350)
    return () => clearTimeout(t)
  }, [open, parkSearch, loadParks])

  if (!open) return null

  const selectedPark = parks.find((p) => p.id === parkId)
  const previewName = selectedPark?.name_zh || initial?.park?.name_zh || ''

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {initial?.id ? '编辑条目' : '新增条目'}
          </h2>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (submitting) return
            if (!year?.id) return
            const parsedRank = Number(rank.trim())
            if (Number.isNaN(parsedRank) || parsedRank < 1) return
            if (!parkId) return
            setSubmitting(true)
            try {
              if (initial?.id) {
                await updateParkRankingEntryAdminApi({ id: initial.id, rank: parsedRank, park_id: parkId })
              } else {
                await createParkRankingEntryAdminApi({
                  year_id: year.id,
                  park_id: parkId,
                  rank: parsedRank,
                })
              }
              await onSaved()
              onClose()
            } finally {
              setSubmitting(false)
            }
          }}
          className="px-4 py-4 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">名次</label>
              <input
                value={rank}
                onChange={(e) => setRank(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="例如：1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">当前选择</label>
              <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-gray-50">
                {previewName || '未选择'}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">搜索园区（限定：{list?.park_level || '-' }）</label>
            <input
              value={parkSearch}
              onChange={(e) => setParkSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="输入园区名称关键字"
            />
            <div className="mt-2">
              <select
                value={parkId}
                onChange={(e) => setParkId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">{loadingParks ? '加载中...' : '请选择园区'}</option>
                {parks.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name_zh}
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-1">
                {loadingParks ? '正在加载候选园区…' : '最多显示 20 条匹配结果'}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => !submitting && onClose()}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={submitting || !rank.trim() || !parkId}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AdminRankingDetailPage() {
  const params = useParams<{ id: string }>()
  const listId = params?.id

  const [list, setList] = useState<AdminParkRankingList | null>(null)
  const [years, setYears] = useState<AdminParkRankingYear[]>([])
  const [entries, setEntries] = useState<AdminParkRankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYearId, setSelectedYearId] = useState<string>('')

  const [yearFormOpen, setYearFormOpen] = useState(false)
  const [editingYear, setEditingYear] = useState<AdminParkRankingYear | null>(null)

  const [entryFormOpen, setEntryFormOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<AdminParkRankingEntry | null>(null)

  const selectedYear = useMemo(
    () => years.find((y) => y.id === selectedYearId) || null,
    [years, selectedYearId],
  )

  const loadYears = useCallback(async () => {
    if (!listId) return
    const data = await getParkRankingYearsAdminApi(listId)
    setYears(data)
    return data
  }, [listId])

  const loadEntries = useCallback(async (yearId: string) => {
    if (!yearId) {
      setEntries([])
      return
    }
    const data = await getParkRankingEntriesAdminApi(yearId)
    setEntries(data)
  }, [])

  const loadAll = useCallback(async () => {
    if (!listId) return
    setLoading(true)
    try {
      const [l, y] = await Promise.all([getParkRankingListAdminApi(listId), loadYears()])
      setList(l)
      const yearRows = y || []
      const preferred = yearRows.find((r) => r.is_latest)?.id || yearRows[0]?.id || ''
      setSelectedYearId((prev) => prev || preferred)
      const yearToLoad = selectedYearId || preferred
      if (yearToLoad) {
        await loadEntries(yearToLoad)
      } else {
        setEntries([])
      }
    } finally {
      setLoading(false)
    }
  }, [listId, loadEntries, loadYears, selectedYearId])

  useEffect(() => {
    loadAll().catch((e) => {
      console.error('加载榜单详情失败:', e)
      alert('加载榜单详情失败，请稍后重试')
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listId])

  useEffect(() => {
    if (!selectedYearId) return
    loadEntries(selectedYearId).catch((e) => {
      console.error('加载条目失败:', e)
      alert('加载条目失败，请稍后重试')
    })
  }, [selectedYearId, loadEntries])

  const yearColumns = useMemo<Column<AdminParkRankingYear>[]>(
    () => [
      {
        key: 'year',
        title: '年度',
        width: '120px',
        render: (value: string | number | boolean, record: AdminParkRankingYear) => (
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{value as number}</span>
            {record.is_latest ? (
              <span className="inline-flex px-2 py-0.5 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                最新
              </span>
            ) : null}
          </div>
        ),
      },
      {
        key: 'is_published',
        title: '发布',
        width: '120px',
        render: (value: string | number | boolean, record: AdminParkRankingYear) => (
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 select-none">
            <input
              type="checkbox"
              checked={!!value}
              onChange={async (e) => {
                try {
                  await updateParkRankingYearAdminApi({ id: record.id, is_published: e.target.checked })
                  await loadYears()
                } catch (err) {
                  console.error(err)
                  alert((err as Error)?.message || '更新失败')
                }
              }}
            />
            {value ? '已发布' : '未发布'}
          </label>
        ),
      },
      {
        key: 'is_latest',
        title: '设为最新',
        width: '140px',
        render: (_: string | number | boolean, record: AdminParkRankingYear) => (
          <button
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            disabled={record.is_latest}
            onClick={async () => {
              try {
                await updateParkRankingYearAdminApi({ id: record.id, list_id: listId, is_latest: true })
                const y = await loadYears()
                const latest = y?.find((r) => r.is_latest)?.id
                if (latest) setSelectedYearId(latest)
              } catch (err) {
                console.error(err)
                alert((err as Error)?.message || '更新失败')
              }
            }}
          >
            设为最新
          </button>
        ),
      },
      {
        key: 'actions',
        title: '操作',
        width: '220px',
        render: (_: unknown, record: AdminParkRankingYear) => (
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
              onClick={() => {
                setEditingYear(record)
                setYearFormOpen(true)
              }}
            >
              编辑
            </button>
            <button
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
              onClick={async () => {
                if (!confirm(`确定要删除 ${record.year} 年的数据吗？该年度下的排行条目会被删除。`)) return
                try {
                  await deleteParkRankingYearAdminApi(record.id)
                  const y = await loadYears()
                  const fallback = y?.find((r) => r.is_latest)?.id || y?.[0]?.id || ''
                  setSelectedYearId(fallback)
                } catch (err) {
                  console.error(err)
                  alert((err as Error)?.message || '删除失败')
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
              删除
            </button>
          </div>
        ),
      },
    ],
    [listId, loadYears],
  )

  const entryColumns = useMemo<Column<AdminParkRankingEntry>[]>(
    () => [
      {
        key: 'rank',
        title: '名次',
        width: '80px',
        render: (value: string | number | boolean | AdminPark | null | undefined) => (
          <span className="font-medium text-gray-900">{value as number}</span>
        ),
      },
      {
        key: 'park',
        title: '园区',
        render: (_: unknown, record: AdminParkRankingEntry) => (
          <div className="flex items-center gap-3">
            {record.park?.logo_url ? (
              <Image
                src={record.park.logo_url}
                alt={record.park.name_zh}
                width={36}
                height={36}
                className="w-9 h-9 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200" />
            )}
            <div>
              <div className="font-medium text-gray-900">{record.park?.name_zh || '-'}</div>
              <div className="text-sm text-gray-500">
                {record.park?.province?.name_zh || '-'}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'actions',
        title: '操作',
        width: '220px',
        render: (_: unknown, record: AdminParkRankingEntry) => (
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
              onClick={() => {
                setEditingEntry(record)
                setEntryFormOpen(true)
              }}
            >
              编辑
            </button>
            <button
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
              onClick={async () => {
                if (!confirm(`确定要删除名次 ${record.rank} 的条目吗？`)) return
                try {
                  await deleteParkRankingEntryAdminApi(record.id)
                  await loadEntries(selectedYearId)
                } catch (err) {
                  console.error(err)
                  alert((err as Error)?.message || '删除失败')
                }
              }}
            >
              <Trash2 className="w-4 h-4" />
              删除
            </button>
          </div>
        ),
      },
    ],
    [loadEntries, selectedYearId],
  )

  if (loading) {
    return <div className="text-gray-600">加载中...</div>
  }

  if (!list) {
    return (
      <div className="space-y-4">
        <Link href="/admin/rankings" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
          返回
        </Link>
        <div className="text-gray-700">榜单不存在或已删除</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link href="/admin/rankings" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            返回榜单列表
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{list.title_zh}</h1>
          <div className="text-sm text-gray-600">
            {list.park_level} · {list.kind === 'brand' ? '品牌名单' : '排名榜单'}
          </div>
        </div>
        <button
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50"
          onClick={() => loadAll()}
        >
          <RefreshCcw className="w-4 h-4" />
          刷新
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div>
          <DataTable
            columns={yearColumns}
            data={years}
            loading={false}
            hideSearch
            actions={
              <button
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                onClick={() => {
                  setEditingYear(null)
                  setYearFormOpen(true)
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                新增年度
              </button>
            }
          />
        </div>

        <div>
          <DataTable
            columns={entryColumns}
            data={entries}
            loading={false}
            hideSearch
            actions={
              <div className="flex items-center gap-2">
                <select
                  value={selectedYearId}
                  onChange={(e) => setSelectedYearId(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">请选择年度</option>
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.year}
                      {y.is_latest ? '（最新）' : ''}
                    </option>
                  ))}
                </select>
                <button
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  disabled={!selectedYearId}
                  onClick={() => {
                    setEditingEntry(null)
                    setEntryFormOpen(true)
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  新增条目
                </button>
              </div>
            }
          />
        </div>
      </div>

      <YearFormModal
        open={yearFormOpen}
        initial={editingYear}
        listId={listId}
        onClose={() => {
          setYearFormOpen(false)
          setEditingYear(null)
        }}
        onSaved={async () => {
          const y = await loadYears()
          if (!selectedYearId) {
            const preferred = y?.find((r) => r.is_latest)?.id || y?.[0]?.id || ''
            setSelectedYearId(preferred)
          }
        }}
      />

      <EntryFormModal
        open={entryFormOpen}
        initial={editingEntry}
        list={list}
        year={selectedYear}
        onClose={() => {
          setEntryFormOpen(false)
          setEditingEntry(null)
        }}
        onSaved={async () => {
          if (!selectedYearId) return
          await loadEntries(selectedYearId)
        }}
      />
    </div>
  )
}
