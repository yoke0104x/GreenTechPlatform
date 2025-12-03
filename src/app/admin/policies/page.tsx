'use client'

import { useEffect, useState } from 'react'
import { Plus, FileText } from 'lucide-react'
import { DataTable, type Column } from '@/components/admin/data-table/data-table'
import {
  AdminPolicy,
  POLICY_LEVEL_OPTIONS,
  AdminPolicyLevel,
} from '@/lib/types/admin'
import {
  getPoliciesApi,
  createPolicyApi,
  updatePolicyApi,
  deletePolicyApi,
  getPolicyDetailApi,
} from '@/lib/api/admin-policies'
import { PolicyForm, type PolicyFormValues } from './components/policy-form'

export default function AdminPoliciesPage() {
  const [items, setItems] = useState<AdminPolicy[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState<AdminPolicyLevel | ''>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [sortField, setSortField] = useState<string>('publish_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<(AdminPolicy & { tagIds?: string[] }) | null>(null)

  const loadPolicies = async () => {
    try {
      setLoading(true)
      const res = await getPoliciesApi({
        page: pagination.current,
        pageSize: pagination.pageSize,
        search,
        sortBy: sortField,
        sortOrder,
        level: levelFilter || undefined,
        status: statusFilter || undefined,
      })
      setItems(res.data)
      setPagination((prev) => ({
        ...prev,
        total: res.pagination.total,
      }))
    } catch (error) {
      console.error('加载政策列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPolicies()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.pageSize, search, levelFilter, statusFilter, sortField, sortOrder])

  const handleCreate = () => {
    setEditing(null)
    setShowForm(true)
  }

  const handleEdit = async (record: AdminPolicy) => {
    try {
      const detail = await getPolicyDetailApi(record.id)
      setEditing(detail)
      setShowForm(true)
    } catch (error) {
      console.error('加载政策详情失败:', error)
    }
  }

  const handleDelete = async (record: AdminPolicy) => {
    if (!window.confirm(`确定要删除政策「${record.name}」吗？`)) return
    try {
      await deletePolicyApi(record.id)
      await loadPolicies()
    } catch (error) {
      console.error('删除政策失败:', error)
      alert('删除政策失败，请稍后重试')
    }
  }

  const handleSubmit = async (values: PolicyFormValues) => {
    if (values.id) {
      await updatePolicyApi(values.id, {
        id: values.id,
        name: values.name,
        level: values.level,
        status: values.status,
        issuer: values.issuer,
        ministryUnit: values.ministryUnit,
        docNumber: values.docNumber,
        publishDate: values.publishDate,
        effectiveDate: values.effectiveDate,
        summary: values.summary,
        sourceUrl: values.sourceUrl,
        regionId: values.regionId,
        parkId: values.parkId,
        tags: values.tagIds,
      } as any)
    } else {
      await createPolicyApi({
        name: values.name,
        level: values.level,
        status: values.status,
        issuer: values.issuer,
        ministryUnit: values.ministryUnit,
        docNumber: values.docNumber,
        publishDate: values.publishDate,
        effectiveDate: values.effectiveDate,
        summary: values.summary,
        sourceUrl: values.sourceUrl,
        regionId: values.regionId,
        parkId: values.parkId,
        tags: values.tagIds,
      } as any)
    }
    await loadPolicies()
  }

  const columns: Column<AdminPolicy>[] = [
    {
      key: 'name',
      title: '政策名称',
      width: '27%',
      render: (value, record) => (
        <button
          type="button"
          onClick={() => handleEdit(record)}
          className="text-left text-sm font-medium text-gray-900 hover:text-green-600 max-w-[360px] truncate"
        >
          {value as string}
        </button>
      ),
    },
    {
      key: 'level',
      title: '级别',
      width: '10%',
      render: (value) => {
        const lv = value as AdminPolicyLevel
        const opt = POLICY_LEVEL_OPTIONS.find((o) => o.value === lv)
        const colorMap: Record<AdminPolicyLevel, { bg: string; text: string; border: string }> = {
          national: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
          ministry: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
          local: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
          park: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
        }
        const colors = colorMap[lv] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${colors.bg} ${colors.text} ${colors.border}`}>
            {opt?.label_zh || lv}
          </span>
        )
      },
    },
    {
      key: 'issuer',
      title: '发布机构',
      width: '12%',
      render: (value, record) => {
        const issuer = (value as string) || '-'
        const ministryUnit =
          record.level === 'ministry'
            ? ((record as any).ministry_unit as string | null)
            : null
        return (
          <div className="text-sm text-gray-700 max-w-[160px]">
            <div className="line-clamp-1 truncate">{issuer}</div>
            {ministryUnit && (
              <div className="mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full border border-purple-200 bg-purple-50 text-purple-700 text-[11px]">
                  {ministryUnit}
                </span>
              </div>
            )}
          </div>
        )
      },
    },
    {
      key: 'doc_number',
      title: '发文字号',
      width: '12%',
      render: (value) => (
        <span className="text-sm text-gray-700 line-clamp-1 max-w-[140px] inline-block truncate">
          {(value as string) || '-'}
        </span>
      ),
    },
    {
      key: 'summary',
      title: '政策摘要',
      width: '12%',
      render: (value) => (
        <span className="text-sm text-gray-700 line-clamp-2 max-w-[140px] inline-block truncate">
          {(value as string) || '-'}
        </span>
      ),
    },
    {
      key: 'source_url',
      title: '原文链接',
      width: '12%',
      render: (value) => {
        const v = value as string | null
        if (!v) return <span className="text-xs text-gray-400">-</span>
        return (
          <a
            href={v.startsWith('http') ? v : `https://${v}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 hover:underline break-all line-clamp-2 max-w-[140px] inline-block truncate"
          >
            {v}
          </a>
        )
      },
    },
    {
      key: 'tags',
      title: '政策标签',
      width: '18%',
      render: (_v, record) => {
        const tags = record.tags || []
        if (!tags.length) {
          return <span className="text-xs text-gray-400">-</span>
        }
        return (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {tags.map((t) => (
              <span
                key={t.id}
                className="px-2 py-0.5 rounded-full border border-[#bfdbfe] text-[#2f6fde] bg-white text-[11px]"
              >
                {t.name}
              </span>
            ))}
          </div>
        )
      },
    },
    {
      key: 'publish_date',
      title: '发布日期',
      width: '12%',
    },
    {
      key: 'status',
      title: '状态',
      width: '8%',
      render: (value) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
          {value as string}
        </span>
      ),
    },
    {
      key: 'id',
      title: '操作',
      width: '12%',
      render: (_value, record) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleEdit(record)}
            className="text-xs text-blue-600 hover:underline"
          >
            编辑
          </button>
          <button
            type="button"
            onClick={() => handleDelete(record)}
            className="text-xs text-red-500 hover:underline"
          >
            删除
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-green-600" />
            政策管理
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            维护政策信息，支持搜索、筛选与编辑。
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">级别：</label>
          <select
            value={levelFilter}
            onChange={(e) =>
              setLevelFilter(e.target.value as AdminPolicyLevel | '')
            }
            className="h-8 px-2 border border-gray-300 rounded-lg text-xs"
          >
            <option value="">全部</option>
            {POLICY_LEVEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label_zh}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">状态：</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2 border border-gray-300 rounded-lg text-xs"
          >
            <option value="">全部</option>
            <option value="active">active（有效）</option>
            <option value="invalid">invalid（已废止）</option>
            <option value="unknown">unknown（不确定）</option>
          </select>
        </div>
      </div>

      <DataTable<AdminPolicy>
        columns={columns}
        data={items}
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: (page, pageSize) =>
            setPagination({ current: page, pageSize, total: pagination.total }),
        }}
        onSort={(field, order) => {
          setSortField(field)
          setSortOrder(order)
        }}
        onSearch={(value) => {
          setPagination((prev) => ({ ...prev, current: 1 }))
          setSearch(value.trim())
        }}
        searchPlaceholder="按名称 / 发布机构 / 文号搜索..."
        searchMode="enter"
        actions={
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center px-3 py-2 rounded-lg bg-[#00b899] text-white text-sm hover:bg-[#009a7a]"
          >
            <Plus className="w-4 h-4 mr-1" />
            新增政策
          </button>
        }
      />

      <PolicyForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleSubmit}
        initial={editing}
      />
    </div>
  )
}
