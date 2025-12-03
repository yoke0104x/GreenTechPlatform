'use client'

import { useEffect, useState } from 'react'
import { Tag, Plus } from 'lucide-react'
import { DataTable, type Column } from '@/components/admin/data-table/data-table'
import { AdminPolicyTag } from '@/lib/types/admin'
import {
  getPolicyTagsAdminApi,
  createPolicyTagAdminApi,
  updatePolicyTagAdminApi,
  deletePolicyTagAdminApi,
} from '@/lib/api/admin-policies'

export default function AdminPolicyTagsPage() {
  const [items, setItems] = useState<AdminPolicyTag[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const loadTags = async () => {
    try {
      setLoading(true)
      const data = await getPolicyTagsAdminApi({
        search,
        status: statusFilter || undefined,
      })
      setItems(data)
    } catch (error) {
      console.error('加载政策标签失败:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTags()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter])

  const handleCreate = async () => {
    const name = window.prompt('请输入新标签名称')
    if (!name) return
    try {
      await createPolicyTagAdminApi({ name })
      await loadTags()
    } catch (error) {
      console.error('创建标签失败:', error)
      alert('创建标签失败，请稍后重试')
    }
  }

  const handleEdit = async (tag: AdminPolicyTag) => {
    const name = window.prompt('修改标签名称', tag.name)
    if (!name) return
    try {
      await updatePolicyTagAdminApi(tag.id, { name })
      await loadTags()
    } catch (error) {
      console.error('更新标签失败:', error)
      alert('更新标签失败，请稍后重试')
    }
  }

  const handleDelete = async (tag: AdminPolicyTag) => {
    if (!window.confirm(`确定要删除标签「${tag.name}」吗？`)) return
    try {
      await deletePolicyTagAdminApi(tag.id)
      await loadTags()
    } catch (error) {
      console.error('删除标签失败:', error)
      alert('删除标签失败，请稍后重试')
    }
  }

  const columns: Column<AdminPolicyTag>[] = [
    {
      key: 'name',
      title: '标签名称',
      width: '40%',
      render: (value, record) => (
        <button
          type="button"
          className="text-sm text-gray-900 hover:text-green-600"
          onClick={() => handleEdit(record)}
        >
          {value as string}
        </button>
      ),
    },
    {
      key: 'code',
      title: '编码',
      width: '20%',
      render: (value) => (
        <span className="text-xs text-gray-500">
          {(value as string) || '-'}
        </span>
      ),
    },
    {
      key: 'status',
      title: '状态',
      width: '10%',
      render: (value) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
            value === 'active'
              ? 'bg-green-50 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {value as string}
        </span>
      ),
    },
    {
      key: 'sort_order',
      title: '排序',
      width: '10%',
    },
    {
      key: 'id',
      title: '操作',
      width: '15%',
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
            <Tag className="w-6 h-6 text-green-600" />
            政策标签管理
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            维护政策标签列表，控制启用状态与排序。
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500">状态：</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2 border border-gray-300 rounded-lg text-xs"
          >
            <option value="">全部</option>
            <option value="active">active（启用）</option>
            <option value="disabled">disabled（停用）</option>
          </select>
        </div>
      </div>

      <DataTable<AdminPolicyTag>
        columns={columns}
        data={items}
        loading={loading}
        onSearch={(value) => setSearch(value.trim())}
        searchPlaceholder="按标签名称搜索..."
        actions={
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center px-3 py-2 rounded-lg bg-[#00b899] text-white text-sm hover:bg-[#009a7a]"
          >
            <Plus className="w-4 h-4 mr-1" />
            新建标签
          </button>
        }
        pagination={undefined}
        hideSearch={false}
      />
    </div>
  )
}

