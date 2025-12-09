'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2, Eye, GripVertical } from 'lucide-react'
import { AdminCarouselImage, PaginationParams } from '@/lib/types/admin'
// 移除直接的数据库导入，改用API调用
import { DataTable } from '@/components/admin/data-table/data-table'
import { CarouselForm } from './components/carousel-form'
import { DragDropCarouselList } from './components/drag-drop-carousel-list'

export default function CarouselPage() {
  const [images, setImages] = useState<AdminCarouselImage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingImage, setEditingImage] = useState<AdminCarouselImage | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'drag'>('table')
  const [scene, setScene] = useState<'home' | 'parks'>('home')
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })

  const loadImages = useCallback(async (params?: Partial<PaginationParams>) => {
    try {
      setIsLoading(true)
      
      const searchParams = new URLSearchParams({
        page: String(params?.page ?? pagination.current),
        pageSize: String(params?.pageSize ?? pagination.pageSize),
        ...(params?.search && { search: params.search }),
        ...(params?.sortBy && { sortBy: params.sortBy }),
        ...(params?.sortOrder && { sortOrder: params.sortOrder }),
        scene
      })

      const response = await fetch(`/api/admin/carousel?${searchParams}`)
      
      if (!response.ok) {
        throw new Error('获取轮播图列表失败')
      }

      const result = await response.json()
      
      setImages(result.data)
      setPagination(prev => ({
        ...prev,
        total: result.pagination.total
      }))
    } catch (error) {
      console.error('加载轮播图失败:', error)
      alert('加载轮播图失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }, [pagination.current, pagination.pageSize, scene])

  useEffect(() => {
    loadImages()
  }, [loadImages, pagination.current, pagination.pageSize])

  const handleSearch = (search: string) => {
    setPagination(prev => ({ ...prev, current: 1 }))
    // 显式第一页，避免使用旧页码
    loadImages({ search, page: 1 })
  }

  const handleSort = (field: string, order: 'asc' | 'desc') => {
    loadImages({ sortBy: field, sortOrder: order })
  }

  const handlePaginationChange = (page: number, pageSize: number) => {
    setPagination(prev => ({ ...prev, current: page, pageSize }))
  }

  const handleAdd = () => {
    setEditingImage(null)
    setShowForm(true)
  }

  const handleEdit = (image: AdminCarouselImage) => {
    setEditingImage(image)
    setShowForm(true)
  }

  const handleDelete = async (image: AdminCarouselImage) => {
    if (!confirm(`确定要删除轮播图"${image.title_zh || '无标题'}"吗？`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/carousel/${image.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '删除失败')
      }

      await loadImages()
    } catch (error) {
      console.error('删除轮播图失败:', error)
      alert('删除轮播图失败，请重试')
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingImage(null)
    loadImages()
  }

  const handlePreview = (image: AdminCarouselImage) => {
    // 在新窗口中预览图片
    window.open(image.image_url, '_blank')
  }

  const handleOrderChange = async (newImages: AdminCarouselImage[]) => {
    try {
      // 更新本地状态
      setImages(newImages)
      
      // 生成排序更新数据
      const updates = newImages.map((image, index) => ({
        id: image.id,
        sort_order: index + 1
      }))
      
      // 更新数据库
      const response = await fetch('/api/admin/carousel/order', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '排序更新失败')
      }
    } catch (error) {
      console.error('更新排序失败:', error)
      alert('更新排序失败，请重试')
      // 重新加载数据
      loadImages()
    }
  }

  const columns = [
    {
      key: 'image_url',
      title: '预览',
      width: '120px',
      render: (value: string | number | boolean | undefined, record: AdminCarouselImage, index: number) => (
        <div className="flex items-center space-x-2">
          <img 
            src={value as string} 
            alt={record.title_zh || '轮播图'}
            className="w-16 h-10 object-cover rounded border border-gray-200"
          />
          <button
            onClick={() => handlePreview(record)}
            className="p-1 text-gray-400 hover:text-blue-600"
            title="查看大图"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      )
    },
    {
      key: 'title_zh',
      title: '标题',
      sortable: true,
      render: (value: string | number | boolean | undefined, record: AdminCarouselImage, index: number) => (
        <div>
          <div className="font-medium text-gray-900">{value as string || '无标题'}</div>
          <div className="text-sm text-gray-500">{record.title_en || '无英文标题'}</div>
        </div>
      )
    },
    {
      key: 'description_zh',
      title: '描述',
      render: (value: string | number | boolean | undefined, record: AdminCarouselImage, index: number) => (
        <div className="max-w-xs">
          <div className="text-sm text-gray-900 truncate">{value as string || '无描述'}</div>
          <div className="text-xs text-gray-500 truncate">{record.description_en || '无英文描述'}</div>
        </div>
      )
    },
    {
      key: 'link_url',
      title: '链接',
      render: (value: string | number | boolean | undefined, record: AdminCarouselImage, index: number) => (
        value ? (
          <a 
            href={value as string} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 truncate max-w-xs block"
            title={value as string}
          >
            {value as string}
          </a>
        ) : (
          <span className="text-gray-400">无链接</span>
        )
      )
    },
    {
      key: 'sort_order',
      title: '排序',
      width: '80px',
      sortable: true,
      render: (value: string | number | boolean | undefined, record: AdminCarouselImage, index: number) => (
        <div className="flex items-center space-x-1">
          <GripVertical className="w-4 h-4 text-gray-400" />
          <span>{value as number}</span>
        </div>
      )
    },
    {
      key: 'is_active',
      title: '状态',
      width: '80px',
      render: (value: string | number | boolean | undefined, record: AdminCarouselImage, index: number) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value as boolean 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {value as boolean ? '启用' : '禁用'}
        </span>
      )
    },
    {
      key: 'created_at',
      title: '创建时间',
      sortable: true,
      render: (value: string | number | boolean | undefined, record: AdminCarouselImage, index: number) => (
        <span className="text-sm text-gray-500">
          {new Date(value as string).toLocaleDateString('zh-CN')}
        </span>
      )
    },
    {
      key: 'actions',
      title: '操作',
      width: '120px',
      render: (_: unknown, record: AdminCarouselImage) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleEdit(record)}
            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
            title="编辑"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(record)}
            className="p-1 text-red-600 hover:bg-red-50 rounded"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">轮播图管理</h1>
          <p className="text-gray-600 mt-1">管理首页英雄区域的轮播图片</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* 视图切换 */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              表格视图
            </button>
            <button
              onClick={() => setViewMode('drag')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'drag'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <GripVertical className="w-4 h-4 mr-1 inline" />
              排序模式
            </button>
          </div>

          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setScene('home')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                scene === 'home'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              技术首页
            </button>
            <button
              onClick={() => setScene('parks')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                scene === 'parks'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              园区首页
            </button>
          </div>
          
          <button
            onClick={handleAdd}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            新增轮播图
          </button>
        </div>
      </div>

      {/* 数据显示 */}
      {viewMode === 'table' ? (
        <DataTable
          columns={columns}
          data={images}
          loading={isLoading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: handlePaginationChange
          }}
          onSearch={handleSearch}
          onSort={handleSort}
          searchMode="enter"
          searchPlaceholder="搜索标题或描述..."
          className="shadow-sm"
        />
      ) : (
        <DragDropCarouselList
          images={images}
          loading={isLoading}
          onOrderChange={handleOrderChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPreview={handlePreview}
        />
      )}

      {/* 轮播图表单弹窗 */}
      {showForm && (
        <CarouselForm
          image={editingImage}
          sceneDefault={scene}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
