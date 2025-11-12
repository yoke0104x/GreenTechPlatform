'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { AdminTertiaryCategory } from '@/lib/types/admin'
import { createTertiaryCategoryApi, updateTertiaryCategoryApi } from '@/lib/api/admin-tertiary-categories'

interface Props {
  subcategoryId: string
  category?: AdminTertiaryCategory | null
  onSuccess: () => void
  onCancel: () => void
}

export function TertiaryCategoryForm({ subcategoryId, category, onSuccess, onCancel }: Props) {
  const [formData, setFormData] = useState({
    name_zh: '',
    name_en: '',
    slug: '',
    sort_order: 0,
    is_active: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (category) {
      setFormData({
        name_zh: category.name_zh,
        name_en: category.name_en,
        slug: category.slug,
        sort_order: category.sort_order,
        is_active: category.is_active,
      })
    }
  }, [category])

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[\u4e00-\u9fff]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!formData.name_zh.trim()) e.name_zh = '中文名称不能为空'
    if (!formData.name_en.trim()) e.name_en = '英文名称不能为空'
    if (!formData.slug.trim()) e.slug = '标识符不能为空'
    if (formData.slug && !/^[a-z0-9-]+$/.test(formData.slug)) e.slug = '仅限小写字母、数字、连字符'
    if (formData.sort_order < 0) e.sort_order = '排序值不能为负'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    if (!validate()) return
    try {
      setIsSubmitting(true)
      if (category) {
        await updateTertiaryCategoryApi(category.id, {
          ...formData,
          subcategory_id: subcategoryId,
        })
      } else {
        await createTertiaryCategoryApi({
          ...formData,
          subcategory_id: subcategoryId,
        })
      }
      onSuccess()
    } catch (err) {
      console.error('保存三级分类失败:', err)
      alert('保存失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{category ? '编辑三级分类' : '新增三级分类'}</h2>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">中文名称</label>
            <input
              value={formData.name_zh}
              onChange={(e) => setFormData(p => ({ ...p, name_zh: e.target.value, slug: !category && !p.slug ? generateSlug(e.target.value) : p.slug }))}
              className={`w-full px-3 py-2 border rounded-lg ${errors.name_zh ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="例如：风电叶片材料"
            />
            {errors.name_zh && <p className="text-xs text-red-600 mt-1">{errors.name_zh}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">英文名称</label>
            <input
              value={formData.name_en}
              onChange={(e) => setFormData(p => ({ ...p, name_en: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg ${errors.name_en ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="e.g., Wind Blade Materials"
            />
            {errors.name_en && <p className="text-xs text-red-600 mt-1">{errors.name_en}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">标识符</label>
            <input
              value={formData.slug}
              onChange={(e) => setFormData(p => ({ ...p, slug: generateSlug(e.target.value) }))}
              className={`w-full px-3 py-2 border rounded-lg ${errors.slug ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="wind-blade-materials"
            />
            {errors.slug && <p className="text-xs text-red-600 mt-1">{errors.slug}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">排序值</label>
            <input
              type="number"
              value={formData.sort_order}
              onChange={(e) => setFormData(p => ({ ...p, sort_order: parseInt(e.target.value) || 0 }))}
              className={`w-full px-3 py-2 border rounded-lg ${errors.sort_order ? 'border-red-300' : 'border-gray-300'}`}
            />
          </div>
          <div className="flex items-center">
            <input type="checkbox" id="t3_active" className="w-4 h-4" checked={formData.is_active} onChange={(e) => setFormData(p => ({ ...p, is_active: e.target.checked }))} />
            <label htmlFor="t3_active" className="ml-2 text-sm">启用状态</label>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button type="button" onClick={onCancel} className="px-3 py-2 border rounded-lg">取消</button>
            <button type="submit" disabled={isSubmitting} className="px-3 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50">
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

