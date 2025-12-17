'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Award, Plus, Pencil, Trash2, Trophy } from 'lucide-react'
import { DataTable, type Column } from '@/components/admin/data-table/data-table'
import type { AdminParkBrandList, AdminParkRankingList, ParkBrandHonorType, ParkRankingParkLevel } from '@/lib/types/admin'
import { PARK_BRAND_HONOR_TYPE_OPTIONS } from '@/lib/types/admin'
import {
  createParkRankingListAdminApi,
  deleteParkRankingListAdminApi,
  getParkRankingListsAdminApi,
  updateParkRankingListAdminApi,
} from '@/lib/api/admin-park-rankings'
import {
  createParkBrandListAdminApi,
  deleteParkBrandListAdminApi,
  getParkBrandListsAdminApi,
  updateParkBrandListAdminApi,
} from '@/lib/api/admin-park-brand-lists'

const LEVEL_OPTIONS: { value: ParkRankingParkLevel | ''; label: string }[] = [
  { value: '', label: '全部级别' },
  { value: '国家级经济技术开发区', label: '国家级经开区' },
  { value: '国家级高新技术产业开发区', label: '国家级高新区' },
]

function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex px-2 py-1 text-xs rounded-full bg-green-50 text-green-700 border border-green-100">
      启用
    </span>
  ) : (
    <span className="inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 border border-gray-200">
      停用
    </span>
  )
}

function RankingListFormModal(props: {
  open: boolean
  initial?: AdminParkRankingList | null
  onClose: () => void
  onSubmit: (values: {
    title_zh: string
    title_en?: string | null
    park_level: ParkRankingParkLevel
    is_active: boolean
  }) => Promise<void>
}) {
  const { open, initial, onClose, onSubmit } = props
  const [values, setValues] = useState({
    title_zh: '',
    title_en: '',
    park_level: '国家级经济技术开发区' as ParkRankingParkLevel,
    is_active: true,
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setValues({
      title_zh: initial?.title_zh || '',
      title_en: initial?.title_en || '',
      park_level: (initial?.park_level as ParkRankingParkLevel) || '国家级经济技术开发区',
      is_active: initial?.is_active ?? true,
    })
  }, [open, initial])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {initial?.id ? '编辑榜单/名单' : '新增榜单/名单'}
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
            if (!values.title_zh.trim()) return
            setSubmitting(true)
            try {
              await onSubmit({
                title_zh: values.title_zh.trim(),
                title_en: values.title_en.trim() || null,
                park_level: values.park_level,
                is_active: values.is_active,
              })
              onClose()
            } finally {
              setSubmitting(false)
            }
          }}
          className="px-4 py-4 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标题（中文）</label>
            <input
              value={values.title_zh}
              onChange={(e) => setValues((p) => ({ ...p, title_zh: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="例如：国家级经开区综合发展水平考核评价排名"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">标题（英文，可选）</label>
            <input
              value={values.title_en}
              onChange={(e) => setValues((p) => ({ ...p, title_en: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Optional"
            />
          </div>
          <div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">园区级别</label>
              <select
                value={values.park_level}
                onChange={(e) =>
                  setValues((p) => ({
                    ...p,
                    park_level: e.target.value as ParkRankingParkLevel,
                  }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {LEVEL_OPTIONS.filter((x) => x.value).map((o) => (
                  <option key={o.value} value={o.value as ParkRankingParkLevel}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 select-none">
            <input
              type="checkbox"
              checked={values.is_active}
              onChange={(e) => setValues((p) => ({ ...p, is_active: e.target.checked }))}
            />
            启用
          </label>

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
              disabled={submitting || !values.title_zh.trim()}
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

function BrandListFormModal(props: {
  open: boolean
  initial?: AdminParkBrandList | null
  onClose: () => void
  onSubmit: (values: {
    title: string
    type: ParkBrandHonorType
    sort_order?: number
    is_active: boolean
  }) => Promise<void>
}) {
  const { open, initial, onClose, onSubmit } = props
  const [submitting, setSubmitting] = useState(false)

  const [values, setValues] = useState({
    title: '',
    type: '综合类' as ParkBrandHonorType,
    sort_order: '0',
    is_active: true,
  })

  useEffect(() => {
    if (!open) return
    setValues({
      title: initial?.title || '',
      type: (initial?.type as ParkBrandHonorType) || '综合类',
      sort_order: typeof initial?.sort_order === 'number' ? String(initial.sort_order) : '0',
      is_active: initial?.is_active ?? true,
    })
  }, [open, initial])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {initial?.id ? '编辑品牌名录类别' : '新增品牌名录类别'}
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
            if (!values.title.trim()) return
            const parsedOrder = Number(values.sort_order.trim())
            const sortOrder = Number.isFinite(parsedOrder) ? parsedOrder : 0
            if (!values.type) return
            setSubmitting(true)
            try {
              await onSubmit({
                title: values.title.trim(),
                type: values.type,
                sort_order: sortOrder,
                is_active: values.is_active,
              })
              onClose()
            } finally {
              setSubmitting(false)
            }
          }}
          className="px-4 py-4 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">品牌名录名称</label>
            <input
              value={values.title}
              onChange={(e) => setValues((p) => ({ ...p, title: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="例如：国家生态工业示范园区"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
              <select
                value={values.type}
                onChange={(e) => setValues((p) => ({ ...p, type: e.target.value as ParkBrandHonorType }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {PARK_BRAND_HONOR_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">优先级（数值越小越靠前）</label>
              <input
                value={values.sort_order}
                onChange={(e) => setValues((p) => ({ ...p, sort_order: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="例如：0"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700 select-none">
            <input
              type="checkbox"
              checked={values.is_active}
              onChange={(e) => setValues((p) => ({ ...p, is_active: e.target.checked }))}
            />
            启用
          </label>

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
              disabled={submitting || !values.title.trim() || !values.type}
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

export default function AdminRankingsPage() {
  const [activeView, setActiveView] = useState<'ranking' | 'brand'>('ranking')

  // 排名榜单（park_rank_*）
  const [lists, setLists] = useState<AdminParkRankingList[]>([])
  const [loading, setLoading] = useState(true)
  const [levelFilter, setLevelFilter] = useState<ParkRankingParkLevel | ''>('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<AdminParkRankingList | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getParkRankingListsAdminApi({
        kind: 'ranking',
        parkLevel: levelFilter || undefined,
        search: search || undefined,
      })
      setLists(data)
    } finally {
      setLoading(false)
    }
  }, [levelFilter, search])

  useEffect(() => {
    if (activeView !== 'ranking') return
    load().catch((e) => {
      console.error('加载榜单列表失败:', e)
      alert('加载榜单列表失败，请稍后重试')
    })
  }, [activeView, load])

  const columns = useMemo<Column<AdminParkRankingList>[]>(
    () => [
      {
        key: 'title_zh',
        title: '标题',
        render: (_: string | boolean | null | undefined, record: AdminParkRankingList) => (
          <div>
            <div className="font-medium text-gray-900">{record.title_zh}</div>
            {record.title_en ? <div className="text-sm text-gray-500">{record.title_en}</div> : null}
          </div>
        ),
      },
      {
        key: 'park_level',
        title: '园区级别',
        width: '200px',
        render: (value: string | boolean | null | undefined) => (
          <span className="text-sm text-gray-700">{value as ParkRankingParkLevel}</span>
        ),
      },
      {
        key: 'is_active',
        title: '状态',
        width: '100px',
        render: (value: string | boolean | null | undefined) => <ActiveBadge active={!!value} />,
      },
      {
        key: 'actions',
        title: '操作',
        width: '260px',
        render: (_: unknown, record: AdminParkRankingList) => (
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/rankings/${record.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <Trophy className="w-4 h-4" />
              维护
            </Link>
            <button
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
              onClick={() => {
                setEditing(record)
                setShowForm(true)
              }}
            >
              <Pencil className="w-4 h-4" />
              编辑
            </button>
            <button
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
              onClick={async () => {
                if (!confirm(`确定要删除「${record.title_zh}」吗？该榜单下的年度与条目也会被删除。`)) return
                try {
                  await deleteParkRankingListAdminApi(record.id)
                  await load()
                } catch (e) {
                  console.error('删除榜单失败:', e)
                  alert((e as Error)?.message || '删除榜单失败')
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
    [load],
  )

  // 品牌名录：先维护类别（park_brand_lists），再在类别下维护园区名单（park_brand_honors，与园区管理同步）
  const [brandLists, setBrandLists] = useState<AdminParkBrandList[]>([])
  const [brandLoading, setBrandLoading] = useState(false)
  const [brandSearch, setBrandSearch] = useState('')
  const [showBrandForm, setShowBrandForm] = useState(false)
  const [editingBrand, setEditingBrand] = useState<AdminParkBrandList | null>(null)

  const loadBrandLists = useCallback(async () => {
    setBrandLoading(true)
    try {
      const data = await getParkBrandListsAdminApi({
        search: brandSearch || undefined,
      })
      setBrandLists(data)
    } finally {
      setBrandLoading(false)
    }
  }, [brandSearch])

  useEffect(() => {
    if (activeView !== 'brand') return
    loadBrandLists().catch((e) => {
      console.error('加载品牌名录类别失败:', e)
      alert('加载品牌名录类别失败，请稍后重试')
    })
  }, [activeView, loadBrandLists])

  const brandColumns = useMemo<Column<AdminParkBrandList>[]>(
    () => [
      { key: 'title', title: '品牌名录名称' },
      {
        key: 'type',
        title: '类型',
        width: '180px',
        render: (value: string | number | boolean | null | undefined) => (
          <span className="text-sm text-gray-700">{(value as string) || '-'}</span>
        ),
      },
      {
        key: 'sort_order',
        title: '优先级',
        width: '100px',
        render: (value: number | null) => <span className="text-sm text-gray-700">{value ?? 0}</span>,
      },
      {
        key: 'is_active',
        title: '状态',
        width: '100px',
        render: (value: boolean) => <ActiveBadge active={!!value} />,
      },
      {
        key: 'actions',
        title: '操作',
        width: '260px',
        render: (_: unknown, record: AdminParkBrandList) => (
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/rankings/brands/${record.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
            >
              <Award className="w-4 h-4" />
              维护
            </Link>
            <button
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
              onClick={() => {
                setEditingBrand(record)
                setShowBrandForm(true)
              }}
            >
              <Pencil className="w-4 h-4" />
              编辑
            </button>
            <button
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
              onClick={async () => {
                if (!confirm(`确定要删除「${record.title}」吗？该类别下的园区名单也会被删除。`)) return
                try {
                  await deleteParkBrandListAdminApi(record.id)
                  await loadBrandLists()
                } catch (e) {
                  console.error('删除品牌名录类别失败:', e)
                  alert((e as Error)?.message || '删除失败')
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
    [loadBrandLists],
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">榜单/品牌</h1>
          <p className="text-gray-600 mt-1">
            排名榜单维护 park_rank_*；品牌名录：先维护 park_brand_lists（类别），再在类别下维护 park_brand_honors（园区名单，和园区管理同步）
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${
            activeView === 'ranking'
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
          onClick={() => setActiveView('ranking')}
        >
          <Trophy className="w-4 h-4" />
          排名榜单
        </button>
        <button
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${
            activeView === 'brand'
              ? 'bg-green-600 text-white border-green-600'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
          onClick={() => setActiveView('brand')}
        >
          <Award className="w-4 h-4" />
          品牌名录
        </button>
      </div>

      {activeView === 'ranking' ? (
        <DataTable
          columns={columns}
          data={lists}
          loading={loading}
          onSearch={(v) => setSearch(v.trim())}
          searchPlaceholder="搜索榜单标题..."
          actions={
            <>
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value as ParkRankingParkLevel | '')}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {LEVEL_OPTIONS.map((o) => (
                  <option key={o.label} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                onClick={() => {
                  setEditing(null)
                  setShowForm(true)
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                新增榜单
              </button>
            </>
          }
        />
      ) : (
        <DataTable
          columns={brandColumns}
          data={brandLists}
          loading={brandLoading}
          onSearch={(v) => {
            setBrandSearch(v.trim())
            loadBrandLists().catch(() => {})
          }}
          searchPlaceholder="搜索品牌名录名称..."
          actions={
            <>
              <button
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                onClick={() => {
                  setEditingBrand(null)
                  setShowBrandForm(true)
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                新增类别
              </button>
              <button
                className="inline-flex items-center px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
                onClick={() => loadBrandLists().catch(() => {})}
              >
                刷新
              </button>
            </>
          }
        />
      )}

      <RankingListFormModal
        open={showForm}
        initial={editing}
        onClose={() => {
          setShowForm(false)
          setEditing(null)
        }}
        onSubmit={async (values) => {
          try {
            if (editing?.id) {
              await updateParkRankingListAdminApi({ id: editing.id, ...values, kind: 'ranking' })
            } else {
              await createParkRankingListAdminApi({ ...values, kind: 'ranking' })
            }
            await load()
          } catch (e) {
            console.error('保存榜单失败:', e)
            alert((e as Error)?.message || '保存失败')
          }
        }}
      />

      <BrandListFormModal
        open={showBrandForm}
        initial={editingBrand}
        onClose={() => {
          setShowBrandForm(false)
          setEditingBrand(null)
        }}
        onSubmit={async (values) => {
          try {
            if (editingBrand?.id) {
              await updateParkBrandListAdminApi({ id: editingBrand.id, ...values })
            } else {
              await createParkBrandListAdminApi(values)
            }
            await loadBrandLists()
          } catch (e) {
            console.error('保存品牌名录类别失败:', e)
            alert((e as Error)?.message || '保存失败')
          }
        }}
      />
    </div>
  )
}
