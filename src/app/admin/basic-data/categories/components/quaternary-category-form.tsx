'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { AdminQuaternaryCategory } from '@/lib/types/admin'
import { createQuaternaryCategoryApi, updateQuaternaryCategoryApi } from '@/lib/api/admin-quaternary-categories'

interface Props {
  tertiaryCategoryId: string
  category?: AdminQuaternaryCategory | null
  onSuccess: () => void
  onCancel: () => void
}

export function QuaternaryCategoryForm({ tertiaryCategoryId, category, onSuccess, onCancel }: Props) {
  const [formData, setFormData] = useState({
    name_zh: '',
    name_en: '',
    slug: '',
    sort_order: 0,
    is_active: true,
  })
  const [mappings, setMappings] = useState([{ code: '', name: '' }])
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
      if (category.national_economy_mappings && category.national_economy_mappings.length > 0) {
        setMappings(category.national_economy_mappings.map(m => ({ code: m.code, name: m.name })))
      } else {
        setMappings([{
          code: category.national_economy_code || '',
          name: category.national_economy_name || '',
        }])
      }
    } else {
      setMappings([{ code: '', name: '' }])
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
    const sanitizedMappings = mappings.map(m => ({
      code: m.code.trim(),
      name: m.name.trim()
    }))
    if (!sanitizedMappings.length || sanitizedMappings.every(m => !m.code && !m.name)) {
      e.mappings = '至少添加一条国民经济行业映射'
    } else {
      sanitizedMappings.forEach((mapping, index) => {
        if (!mapping.code) {
          e[`mapping-${index}-code`] = '行业代码不能为空'
        } else if (!/^[0-9*]{4}$/.test(mapping.code)) {
          e[`mapping-${index}-code`] = '请输入4位数字，若不足可在末尾补*'
        }
        if (!mapping.name) {
          e[`mapping-${index}-name`] = '行业名称不能为空'
        }
      })
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const updateMapping = (index: number, field: 'code' | 'name', value: string) => {
    setMappings(prev => prev.map((m, i) => i === index ? { ...m, [field]: field === 'code' ? value.replace(/[^0-9*]/g, '').slice(0, 4) : value } : m))
  }

  const addMapping = () => {
    setMappings(prev => [...prev, { code: '', name: '' }])
  }

  const removeMapping = (index: number) => {
    setMappings(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    if (!validate()) return
    try {
      setIsSubmitting(true)
      if (category) {
        await updateQuaternaryCategoryApi(category.id, {
          ...formData,
          tertiary_category_id: tertiaryCategoryId,
          national_economy_mappings: mappings.map(m => ({ code: m.code.trim(), name: m.name.trim() })),
        })
      } else {
        await createQuaternaryCategoryApi({
          ...formData,
          tertiary_category_id: tertiaryCategoryId,
          national_economy_mappings: mappings.map(m => ({ code: m.code.trim(), name: m.name.trim() })),
        })
      }
      onSuccess()
    } catch (err) {
      console.error('保存四级分类失败:', err)
      alert('保存失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">{category ? '编辑四级分类' : '新增四级分类'}</h2>
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
              placeholder="例如：高分子复合材料"
            />
            {errors.name_zh && <p className="text-xs text-red-600 mt-1">{errors.name_zh}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">英文名称</label>
            <input
              value={formData.name_en}
              onChange={(e) => setFormData(p => ({ ...p, name_en: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg ${errors.name_en ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="e.g., Polymer Composite"
            />
            {errors.name_en && <p className="text-xs text-red-600 mt-1">{errors.name_en}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">标识符</label>
            <input
              value={formData.slug}
              onChange={(e) => setFormData(p => ({ ...p, slug: generateSlug(e.target.value) }))}
              className={`w-full px-3 py-2 border rounded-lg ${errors.slug ? 'border-red-300' : 'border-gray-300'}`}
              placeholder="polymer-composite"
            />
            {errors.slug && <p className="text-xs text-red-600 mt-1">{errors.slug}</p>}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">国民经济行业映射</label>
              <button type="button" className="text-sm text-green-600" onClick={addMapping}>+ 新增映射</button>
            </div>
            {errors.mappings && <p className="text-xs text-red-600 mb-2">{errors.mappings}</p>}
            <div className="space-y-3">
              {mappings.map((mapping, index) => (
                <div key={`mapping-${index}`} className="flex items-start gap-2">
                  <div className="w-24">
                    <input
                      value={mapping.code}
                      onChange={(e) => updateMapping(index, 'code', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg ${errors[`mapping-${index}-code`] ? 'border-red-300' : 'border-gray-300'}`}
                      placeholder="3411"
                    />
                    {errors[`mapping-${index}-code`] && <p className="text-xs text-red-600 mt-1">{errors[`mapping-${index}-code`]}</p>}
                  </div>
                  <div className="flex-1">
                    <input
                      value={mapping.name}
                      onChange={(e) => updateMapping(index, 'name', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg ${errors[`mapping-${index}-name`] ? 'border-red-300' : 'border-gray-300'}`}
                      placeholder="行业名称"
                    />
                    {errors[`mapping-${index}-name`] && <p className="text-xs text-red-600 mt-1">{errors[`mapping-${index}-name`]}</p>}
                  </div>
                  {mappings.length > 1 && (
                    <button type="button" className="text-sm text-red-600" onClick={() => removeMapping(index)}>删除</button>
                  )}
                </div>
              ))}
            </div>
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
            <input type="checkbox" id="t4_active" className="w-4 h-4" checked={formData.is_active} onChange={(e) => setFormData(p => ({ ...p, is_active: e.target.checked }))} />
            <label htmlFor="t4_active" className="ml-2 text-sm">启用状态</label>
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
