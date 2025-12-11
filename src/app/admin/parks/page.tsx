'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Building2, MapPin } from 'lucide-react'
import { DataTable } from '@/components/admin/data-table/data-table'
import { AdminPark, AdminProvince, PaginationParams } from '@/lib/types/admin'
import {
  getParksAdminApi,
  deleteParkAdminApi,
} from '@/lib/api/admin-parks'
import { getProvincesApi } from '@/lib/api/admin-provinces'
import { ParkForm } from './components/park-form'

const PARK_LEVEL_OPTIONS = [
  { value: '', label: '全部级别' },
  { value: '国家级经济技术开发区', label: '国家级经济技术开发区' },
  { value: '国家级高新技术产业开发区', label: '国家级高新技术产业开发区' },
  { value: '海关特殊监管区', label: '海关特殊监管区' },
  { value: '边境经济合作区', label: '边境经济合作区' },
  { value: '国家级新区', label: '国家级新区' },
  { value: '国家级自贸区', label: '国家级自贸区' },
  { value: '国家级自创区', label: '国家级自创区' },
  { value: '其他国家级园区', label: '其他国家级园区' },
  { value: '省级经济技术开发区', label: '省级经济技术开发区' },
  { value: '省级高新区', label: '省级高新区' },
  { value: '其他园区', label: '其他园区' },
]

export default function AdminParksPage() {
  const [parks, setParks] = useState<AdminPark[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPark, setEditingPark] = useState<AdminPark | null>(null)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  })
  const [levelFilter, setLevelFilter] = useState('')
  const [provinceFilter, setProvinceFilter] = useState('')
  const [provinces, setProvinces] = useState<AdminProvince[]>([])

  const loadParks = useCallback(
    async (params?: Partial<PaginationParams>) => {
      try {
        setLoading(true)
        const res = await getParksAdminApi({
          page: params?.page ?? pagination.current,
          pageSize: params?.pageSize ?? pagination.pageSize,
          search: params?.search,
          sortBy: params?.sortBy,
          sortOrder: params?.sortOrder,
          level: params?.level ?? levelFilter,
          provinceId: params?.provinceId ?? provinceFilter,
        })
        setParks(res.data)
        setPagination((prev) => ({
          ...prev,
          total: res.pagination.total,
          current: res.pagination.page,
          pageSize: res.pagination.pageSize,
        }))
      } catch (error) {
        console.error('加载园区列表失败:', error)
        alert('加载园区列表失败，请稍后重试')
      } finally {
        setLoading(false)
      }
    },
    [pagination.current, pagination.pageSize, levelFilter, provinceFilter],
  )

  useEffect(() => {
    loadParks()
  }, [loadParks])

  useEffect(() => {
    ;(async () => {
      try {
        const list = await getProvincesApi()
        setProvinces(list)
      } catch (error) {
        console.error('加载省份列表失败:', error)
        setProvinces([])
      }
    })()
  }, [])

  const handleSearch = (search: string) => {
    setPagination((prev) => ({ ...prev, current: 1 }))
    loadParks({ search: search.trim(), page: 1 })
  }

  const handleSort = (field: string, order: 'asc' | 'desc') => {
    loadParks({ sortBy: field, sortOrder: order })
  }

  const handleLevelChange = (value: string) => {
    setLevelFilter(value)
    setPagination((prev) => ({ ...prev, current: 1 }))
    loadParks({ level: value, page: 1 })
  }

  const handleProvinceChange = (value: string) => {
    setProvinceFilter(value)
    setPagination((prev) => ({ ...prev, current: 1 }))
    loadParks({ provinceId: value, page: 1 })
  }

  const handlePaginationChange = (page: number, pageSize: number) => {
    setPagination((prev) => ({ ...prev, current: page, pageSize }))
    loadParks({ page, pageSize })
  }

  const handleAdd = () => {
    setEditingPark(null)
    setShowForm(true)
  }

  const handleEdit = (park: AdminPark) => {
    setEditingPark(park)
    setShowForm(true)
  }

  const handleDelete = async (park: AdminPark) => {
    if (
      !confirm(
        `确定要删除园区「${park.name_zh}」吗？\n对于国家级经济技术开发区，该操作也会同步禁用对应的经开区记录。`,
      )
    ) {
      return
    }
    try {
      await deleteParkAdminApi(park.id)
      await loadParks()
    } catch (error) {
      console.error('删除园区失败:', error)
      alert('删除园区失败，请稍后重试')
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingPark(null)
    loadParks()
  }

  const columns = [
    {
      key: 'logo_url',
      title: 'Logo',
      width: '80px',
      render: (
        value: string,
        record: AdminPark,
      ) =>
        value ? (
          <img
            src={value}
            alt={record.name_zh}
            className="w-12 h-12 object-cover rounded border border-gray-200"
          />
        ) : (
          <div className="w-12 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-gray-400" />
          </div>
        ),
    },
    {
      key: 'name_zh',
      title: '园区名称',
      sortable: true,
      render: (_: string, record: AdminPark) => (
        <div>
          <div className="font-medium text-gray-900">{record.name_zh}</div>
          {record.name_en && (
            <div className="text-sm text-gray-500">{record.name_en}</div>
          )}
        </div>
      ),
    },
    {
      key: 'level',
      title: '级别',
      sortable: true,
      render: (value: string) =>
        value ? (
          <span className="inline-flex px-2 py-1 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
            {value}
          </span>
        ) : (
          <span className="text-xs text-gray-400">未设置</span>
        ),
    },
    {
      key: 'province',
      title: '省份',
      render: (_: unknown, record: AdminPark) => (
        <span className="text-sm text-gray-700">
          {record.province?.name_zh || '-'}
        </span>
      ),
    },
    {
      key: 'development_zone',
      title: '经开区',
      render: (_: unknown, record: AdminPark) => (
        <span className="text-sm text-gray-600 flex items-center">
          {record.development_zone ? (
            <>
              <MapPin className="w-3 h-3 mr-1 text-gray-400" />
              {record.development_zone.name_zh}
            </>
          ) : (
            <span className="text-xs text-gray-400">未关联</span>
          )}
        </span>
      ),
    },
    {
      key: 'updated_at',
      title: '更新时间',
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-gray-500">
          {value ? new Date(value).toLocaleDateString('zh-CN') : '-'}
        </span>
      ),
    },
    {
      key: 'sort_rank',
      title: '排序顺位',
      sortable: true,
      width: '100px',
      render: (value: number | null | undefined) =>
        typeof value === 'number' ? (
          <span className="text-sm text-gray-800">{value}</span>
        ) : (
          <span className="text-xs text-gray-400">未设置</span>
        ),
    },
    {
      key: 'is_active',
      title: '状态',
      width: '80px',
      render: (value: boolean) => (
        <span
          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
            value
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {value ? '启用' : '停用'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      width: '120px',
      render: (_: unknown, record: AdminPark) => (
        <div className="flex items-center space-x-2">
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
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">园区管理</h1>
          <p className="text-gray-600 mt-1">
            管理园区基础信息，与园区政策、园区 H5 数据保持一致。
          </p>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          新增园区
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">园区级别</label>
          <select
            value={levelFilter}
            onChange={(e) => handleLevelChange(e.target.value)}
            className="w-64 h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {PARK_LEVEL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">省份</label>
          <select
            value={provinceFilter}
            onChange={(e) => handleProvinceChange(e.target.value)}
            className="w-64 h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">全部省份</option>
            {provinces.map((province) => (
              <option key={province.id} value={province.id}>
                {province.name_zh}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 数据表格 */}
      <DataTable<AdminPark>
        columns={columns as any}
        data={parks}
        loading={loading}
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: handlePaginationChange,
        }}
        onSearch={handleSearch}
        onSort={handleSort}
        searchMode="enter"
        searchPlaceholder="按园区名称或简介搜索..."
        className="shadow-sm"
      />

      {showForm && (
        <ParkForm
          park={editingPark}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false)
            setEditingPark(null)
          }}
        />
      )}
    </div>
  )
}
