'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { AdminCategory, AdminSubcategory } from '@/lib/types/admin'
import { getCategoriesApi, deleteCategoryApi, deleteSubcategoryApi } from '@/lib/api/admin-categories'
import { getMockCategories } from '@/lib/supabase/admin-categories-mock'
import { CategoryForm } from './components/category-form'
import { SubcategoryForm } from './components/subcategory-form'
import { TertiaryCategoryManager } from './components/tertiary-category-manager'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showSubcategoryForm, setShowSubcategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null)
  const [editingSubcategory, setEditingSubcategory] = useState<AdminSubcategory | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const [isUsingMockData, setIsUsingMockData] = useState(false)
  const [openTertiaryFor, setOpenTertiaryFor] = useState<{ id: string, name: string } | null>(null)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setIsLoading(true)
      
      // 首先尝试从数据库加载
      try {
        const data = await getCategoriesApi()
        setCategories(data)
        setExpandedCategories(data.map(cat => cat.id))
        setIsUsingMockData(false)
        console.log('✅ 从数据库加载分类成功')
        return
      } catch (dbError) {
        console.warn('⚠️ 数据库连接失败，使用模拟数据:', dbError)
      }
      
      // 如果数据库失败，使用模拟数据
      const mockData = await getMockCategories()
      setCategories(mockData)
      setExpandedCategories(mockData.map(cat => cat.id))
      setIsUsingMockData(true)
      console.log('✅ 使用模拟数据加载成功')
      
    } catch (error) {
      console.error('加载产业分类失败:', error)
      alert('加载产业分类失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleAddCategory = () => {
    setEditingCategory(null)
    setShowCategoryForm(true)
  }

  const handleEditCategory = (category: AdminCategory) => {
    setEditingCategory(category)
    setShowCategoryForm(true)
  }

  const handleAddSubcategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId)
    setEditingSubcategory(null)
    setShowSubcategoryForm(true)
  }

  const handleEditSubcategory = (subcategory: AdminSubcategory) => {
    setSelectedCategoryId(subcategory.category_id)
    setEditingSubcategory(subcategory)
    setShowSubcategoryForm(true)
  }

  const handleDeleteCategory = async (category: AdminCategory) => {
    if (!confirm(`确定要删除分类"${category.name_zh}"吗？这将同时删除所有子分类。`)) {
      return
    }

    try {
      if (isUsingMockData) {
        // TODO: 实现模拟数据删除逻辑
        console.log('删除分类:', category.id)
      } else {
        await deleteCategoryApi(category.id)
      }
      alert('分类删除成功')
      await loadCategories()
    } catch (error) {
      console.error('删除分类失败:', error)
      alert(`删除分类失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const handleDeleteSubcategory = async (subcategory: AdminSubcategory) => {
    if (!confirm(`确定要删除子分类"${subcategory.name_zh}"吗？`)) {
      return
    }

    try {
      if (isUsingMockData) {
        // TODO: 实现模拟数据删除逻辑
        console.log('删除子分类:', subcategory.id)
      } else {
        await deleteSubcategoryApi(subcategory.id)
      }
      alert('子分类删除成功')
      await loadCategories()
    } catch (error) {
      console.error('删除子分类失败:', error)
      alert(`删除子分类失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const handleFormSuccess = () => {
    setShowCategoryForm(false)
    setShowSubcategoryForm(false)
    setEditingCategory(null)
    setEditingSubcategory(null)
    setSelectedCategoryId('')
    loadCategories()
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 数据库状态提示 */}
      {isUsingMockData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">当前使用模拟数据</h3>
              <div className="mt-1 text-sm text-yellow-700">
                <p>数据库表尚未创建，请按照 <strong>setup-database.md</strong> 文件说明设置数据库。</p>
              </div>
              <div className="mt-3">
                <button
                  onClick={loadCategories}
                  className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded hover:bg-yellow-200 transition-colors"
                >
                  重新连接数据库
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">产业分类管理</h1>
          <p className="text-gray-600 mt-1">管理绿色技术平台的产业分类和子分类</p>
        </div>
        <button
          onClick={handleAddCategory}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          新增分类
        </button>
      </div>

      {/* 分类列表 */}
      <div className="bg-white rounded-lg border border-gray-200">
        {categories.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>暂无产业分类数据</p>
            <button
              onClick={handleAddCategory}
              className="mt-4 text-green-600 hover:text-green-700"
            >
              立即创建第一个分类
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {categories.map((category) => (
              <div key={category.id} className="p-4">
                {/* 主分类行 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <button
                      onClick={() => toggleExpanded(category.id)}
                      className="mr-2 p-1 hover:bg-gray-100 rounded"
                    >
                      {expandedCategories.includes(category.id) ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    <div>
                      <h3 className="font-medium text-gray-900">{category.name_zh}</h3>
                      <p className="text-sm text-gray-500">{category.name_en}</p>
                      <p className="text-xs text-gray-400">标识: {category.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      {category.subcategories?.length || 0} 个子分类
                    </span>
                    <button
                      onClick={() => handleAddSubcategory(category.id)}
                      className="p-1 text-green-600 hover:bg-green-50 rounded"
                      title="添加子分类"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      title="编辑分类"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                      title="删除分类"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 子分类列表 */}
                {expandedCategories.includes(category.id) && category.subcategories && (
                  <div className="mt-4 ml-6 space-y-2">
                    {category.subcategories.map((subcategory) => (
                      <div key={subcategory.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          {/* 默认技术图片预览 */}
                          <div className="flex-shrink-0">
                            {subcategory.default_tech_image_url ? (
                              <img
                                src={subcategory.default_tech_image_url}
                                alt={`${subcategory.name_zh}默认图片`}
                                className="w-12 h-12 object-cover rounded border border-gray-200"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center border border-gray-200">
                                <span className="text-xs text-gray-400">无图片</span>
                              </div>
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-800">{subcategory.name_zh}</h4>
                            <p className="text-xs text-gray-500">{subcategory.name_en}</p>
                            <p className="text-xs text-gray-400">标识: {subcategory.slug}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditSubcategory(subcategory)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="编辑子分类"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setOpenTertiaryFor({ id: subcategory.id, name: subcategory.name_zh })}
                            className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-50"
                          >
                            管理三级分类
                          </button>
                          <button
                            onClick={() => handleDeleteSubcategory(subcategory)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="删除子分类"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {category.subcategories.length === 0 && (
                      <div className="p-3 text-center text-gray-400 text-sm">
                        暂无子分类
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 分类表单弹窗 */}
      {showCategoryForm && (
        <CategoryForm
          category={editingCategory}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowCategoryForm(false)}
        />
      )}

      {/* 子分类表单弹窗 */}
      {showSubcategoryForm && (
        <SubcategoryForm
          categoryId={selectedCategoryId}
          subcategory={editingSubcategory}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowSubcategoryForm(false)}
        />
      )}

      {/* 三级分类管理弹窗 */}
      {openTertiaryFor && (
        <TertiaryCategoryManager
          subcategoryId={openTertiaryFor.id}
          subcategoryName={openTertiaryFor.name}
          onClose={() => setOpenTertiaryFor(null)}
        />
      )}
    </div>
  )
}
