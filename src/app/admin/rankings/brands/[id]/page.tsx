'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Pencil, Plus, RefreshCcw, Trash2 } from 'lucide-react'
import { DataTable, type Column } from '@/components/admin/data-table/data-table'
import type { AdminPark, AdminParkBrandHonor, AdminParkBrandList } from '@/lib/types/admin'
import { getParksAdminApi } from '@/lib/api/admin-parks'
import {
  createParkBrandHonorApi,
  deleteParkBrandHonorApi,
  getParkBrandHonorsAdminList,
  updateParkBrandHonorApi,
} from '@/lib/api/admin-park-brand-honors'
import { getParkBrandListAdminApi } from '@/lib/api/admin-park-brand-lists'

function pickApprovedYear(value: { approved_at?: string | null; year?: number | null }) {
  if (value.approved_at) {
    const y = Number(value.approved_at.slice(0, 4))
    if (!Number.isNaN(y)) return String(y)
  }
  if (typeof value.year === 'number' && !Number.isNaN(value.year)) return String(value.year)
  return '-'
}

function BrandListItemFormModal(props: {
  open: boolean
  list: AdminParkBrandList
  initial?: AdminParkBrandHonor | null
  onClose: () => void
  onSubmit: (values: {
    park_id: string
    approved_at?: string | null
    year?: number | null
    sort_order?: number | null
    is_active: boolean
  }) => Promise<void>
}) {
  const { open, list, initial, onClose, onSubmit } = props
  const [submitting, setSubmitting] = useState(false)
  const [parkSearch, setParkSearch] = useState('')
  const [parks, setParks] = useState<AdminPark[]>([])
  const [loadingParks, setLoadingParks] = useState(false)

  const [values, setValues] = useState({
    park_id: '',
    approved_at: '',
    year: '',
    sort_order: '',
    is_active: true,
  })

  const loadParks = useCallback(async (q: string) => {
    setLoadingParks(true)
    try {
      const res = await getParksAdminApi({
        page: 1,
        pageSize: 20,
        search: q.trim() || undefined,
      })
      setParks(res.data || [])
    } catch (e) {
      console.warn('加载园区候选失败:', e)
      setParks([])
    } finally {
      setLoadingParks(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setValues({
      park_id: initial?.park_id || '',
      approved_at: initial?.approved_at || '',
      year: typeof initial?.year === 'number' ? String(initial.year) : '',
      sort_order: typeof initial?.sort_order === 'number' ? String(initial.sort_order) : '',
      is_active: initial?.is_active ?? true,
    })
    setParkSearch('')
    loadParks('')
  }, [open, initial, loadParks])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => loadParks(parkSearch), 350)
    return () => clearTimeout(t)
  }, [open, parkSearch, loadParks])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {initial?.id ? '编辑园区条目' : '新增园区条目'}
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
            if (!values.park_id) return
            setSubmitting(true)
            try {
              const approvedAt = values.approved_at.trim() || null
              let parsedYear: number | null = values.year.trim() ? Number(values.year.trim()) : null
              if ((parsedYear === null || Number.isNaN(parsedYear)) && approvedAt) {
                const y = Number(approvedAt.slice(0, 4))
                parsedYear = Number.isNaN(y) ? null : y
              }
              const parsedOrder = values.sort_order.trim() ? Number(values.sort_order.trim()) : null
              const sortOrder = parsedOrder === null || Number.isNaN(parsedOrder) ? null : parsedOrder

              await onSubmit({
                park_id: values.park_id,
                approved_at: approvedAt,
                year: parsedYear,
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
          <div className="text-sm text-gray-700">
            当前品牌名录：<span className="font-medium text-gray-900">{list.title}</span>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">搜索园区</label>
            <input
              value={parkSearch}
              onChange={(e) => setParkSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="输入园区名称关键字"
            />
            <select
              value={values.park_id}
              onChange={(e) => setValues((p) => ({ ...p, park_id: e.target.value }))}
              className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="">{loadingParks ? '加载中...' : '请选择园区'}</option>
              {parks.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name_zh}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">获批时间</label>
              <input
                type="date"
                value={values.approved_at}
                onChange={(e) => setValues((p) => ({ ...p, approved_at: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <div className="text-xs text-gray-400 mt-1">前台仅展示年份，可填写日期或仅填写年份</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">获批年份（可选）</label>
              <input
                value={values.year}
                onChange={(e) => setValues((p) => ({ ...p, year: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="例如：2008"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">优先级（可选）</label>
              <input
                value={values.sort_order}
                onChange={(e) => setValues((p) => ({ ...p, sort_order: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="数值越小越靠前"
              />
            </div>
            <div className="flex items-end">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 select-none">
                <input
                  type="checkbox"
                  checked={values.is_active}
                  onChange={(e) => setValues((p) => ({ ...p, is_active: e.target.checked }))}
                />
                启用
              </label>
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
              disabled={submitting || !values.park_id}
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

export default function AdminBrandListDetailPage() {
  const params = useParams<{ id: string }>()
  const listId = params?.id

  const [list, setList] = useState<AdminParkBrandList | null>(null)
  const [loadingList, setLoadingList] = useState(true)

  const [items, setItems] = useState<AdminParkBrandHonor[]>([])
  const [itemsLoading, setItemsLoading] = useState(false)
  const [searchPark, setSearchPark] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)

  const [showItemForm, setShowItemForm] = useState(false)
  const [editingItem, setEditingItem] = useState<AdminParkBrandHonor | null>(null)

  const loadList = useCallback(async () => {
    if (!listId) return
    setLoadingList(true)
    try {
      const res = await getParkBrandListAdminApi(listId)
      setList(res)
    } finally {
      setLoadingList(false)
    }
  }, [listId])

  const loadItems = useCallback(
    async (params?: { page?: number; pageSize?: number }) => {
      if (!list?.title) return
      setItemsLoading(true)
      try {
        const p = params?.page ?? page
        const ps = params?.pageSize ?? pageSize
        const res = await getParkBrandHonorsAdminList({
          page: p,
          pageSize: ps,
          title: list.title,
          searchPark: searchPark || undefined,
        })
        setItems(res.data)
        setPage(res.pagination.page)
        setPageSize(res.pagination.pageSize)
        setTotal(res.pagination.total)
      } finally {
        setItemsLoading(false)
      }
    },
    [list?.title, page, pageSize, searchPark],
  )

  useEffect(() => {
    loadList().catch((e) => {
      console.error('加载品牌名录类别失败:', e)
      alert('加载品牌名录类别失败，请稍后重试')
    })
  }, [loadList])

  useEffect(() => {
    if (!list?.title) return
    loadItems({ page, pageSize }).catch((e) => {
      console.error('加载园区名单失败:', e)
      alert('加载园区名单失败，请稍后重试')
    })
  }, [list?.title, loadItems, page, pageSize])

  const columns = useMemo<Column<AdminParkBrandHonor>[]>(
    () => [
      {
        key: 'park',
        title: '园区',
        render: (_: unknown, record: AdminParkBrandHonor) => (
          <div className="flex items-center gap-3">
            {record.park?.logo_url ? (
              <Image
                src={record.park.logo_url}
                alt={record.park.name_zh}
                width={40}
                height={40}
                className="w-10 h-10 rounded-lg object-cover bg-gray-100"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gray-100" />
            )}
            <div>
              <div className="font-medium text-gray-900">{record.park?.name_zh || '-'}</div>
              <div className="text-xs text-gray-500">
                {record.park?.level || '-'} · {record.park?.province?.name_zh || '-'}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'approved_at',
        title: '获批年份',
        width: '140px',
        render: (_: unknown, record: AdminParkBrandHonor) => (
          <span className="text-sm text-gray-700">{pickApprovedYear(record)}</span>
        ),
      },
      {
        key: 'sort_order',
        title: '优先级',
        width: '100px',
        render: (value: string | number | boolean | AdminPark | null | undefined) => (
          <span className="text-sm text-gray-700">{(value as number | null) ?? '-'}</span>
        ),
      },
      {
        key: 'is_active',
        title: '状态',
        width: '100px',
        render: (value: string | number | boolean | AdminPark | null | undefined) => (
          <span
            className={
              !!value
                ? 'inline-flex px-2 py-1 text-xs rounded-full bg-green-50 text-green-700 border border-green-100'
                : 'inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 border border-gray-200'
            }
          >
            {value ? '启用' : '停用'}
          </span>
        ),
      },
      {
        key: 'actions',
        title: '操作',
        width: '220px',
        render: (_: unknown, record: AdminParkBrandHonor) => (
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50"
              onClick={() => {
                setEditingItem(record)
                setShowItemForm(true)
              }}
            >
              <Pencil className="w-4 h-4" />
              编辑
            </button>
            <button
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
              onClick={async () => {
                if (!confirm('确定要删除该园区条目吗？')) return
                try {
                  await deleteParkBrandHonorApi(record.id)
                  await loadItems({ page, pageSize })
                } catch (e) {
                  console.error('删除失败:', e)
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
    [loadItems, page, pageSize],
  )

  if (loadingList) {
    return <div className="p-6 text-gray-600">加载中...</div>
  }

  if (!list) {
    return (
      <div className="p-6 space-y-4">
        <Link href="/admin/rankings" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" />
          返回
        </Link>
        <div className="text-gray-900 font-medium">未找到该品牌名录类别</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Link href="/admin/rankings" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            返回品牌名录
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{list.title}</h1>
          {list.type ? <div className="text-sm text-gray-600">类型：{list.type}</div> : null}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={itemsLoading}
        onSearch={(v) => {
          setSearchPark(v.trim())
          setPage(1)
          loadItems({ page: 1, pageSize }).catch(() => {})
        }}
        searchPlaceholder="搜索园区..."
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: (p, ps) => {
            setPage(p)
            setPageSize(ps)
            loadItems({ page: p, pageSize: ps }).catch(() => {})
          },
        }}
        actions={
          <>
            <button
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              onClick={() => {
                setEditingItem(null)
                setShowItemForm(true)
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              新增园区
            </button>
            <button
              className="inline-flex items-center px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm"
              onClick={() => loadItems({ page, pageSize }).catch(() => {})}
            >
              <RefreshCcw className="w-4 h-4 mr-2" />
              刷新
            </button>
          </>
        }
      />

      <BrandListItemFormModal
        open={showItemForm}
        list={list}
        initial={editingItem}
        onClose={() => {
          setShowItemForm(false)
          setEditingItem(null)
        }}
        onSubmit={async (values) => {
          try {
            if (editingItem?.id) {
              await updateParkBrandHonorApi(editingItem.id, {
                park_id: values.park_id,
                approved_at: values.approved_at,
                year: values.year,
                sort_order: values.sort_order,
                is_active: values.is_active,
              })
            } else {
              await createParkBrandHonorApi({
                park_id: values.park_id,
                title: list.title,
                type: list.type,
                approved_at: values.approved_at,
                year: values.year,
                sort_order: values.sort_order,
                is_active: values.is_active,
              })
            }
            await loadItems({ page, pageSize })
          } catch (e) {
            console.error('保存失败:', e)
            alert((e as Error)?.message || '保存失败')
          }
        }}
      />
    </div>
  )
}
