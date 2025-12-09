'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { AdminCarouselImage } from '@/lib/types/admin'
import { LanguageTabs, LanguageField } from '@/components/admin/forms/language-tabs'
import { ImageUpload } from '@/components/admin/forms/image-upload'

interface CarouselFormProps {
  image?: AdminCarouselImage | null
  onSuccess: () => void
  onCancel: () => void
  sceneDefault?: 'home' | 'parks'
}

export function CarouselForm({ image, onSuccess, onCancel, sceneDefault = 'home' }: CarouselFormProps) {
  const [formData, setFormData] = useState({
    title_zh: '',
    title_en: '',
    description_zh: '',
    description_en: '',
    image_url: '',
    link_url: '',
    sort_order: 0,
    is_active: true,
    scene: 'home' as 'home' | 'parks' | ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (image) {
      setFormData({
        title_zh: image.title_zh || '',
        title_en: image.title_en || '',
        description_zh: image.description_zh || '',
        description_en: image.description_en || '',
        image_url: image.image_url,
        link_url: image.link_url || '',
        sort_order: image.sort_order,
        is_active: image.is_active,
        scene: (image.scene as 'home' | 'parks') || 'home'
      })
    } else {
      // 新建时获取下一个排序值
      fetchNextSortOrder()
      setFormData((prev) => ({ ...prev, scene: sceneDefault }))
    }
  }, [image, sceneDefault])

  const fetchNextSortOrder = async () => {
    try {
      const response = await fetch('/api/admin/carousel')
      const result = await response.json()
      if (result.data && result.data.length > 0) {
        const maxSortOrder = Math.max(...result.data.map((item: AdminCarouselImage) => item.sort_order || 0))
        setFormData(prev => ({ ...prev, sort_order: maxSortOrder + 1 }))
      } else {
        setFormData(prev => ({ ...prev, sort_order: 1 }))
      }
    } catch (error) {
      console.error('获取排序值失败:', error)
      setFormData(prev => ({ ...prev, sort_order: 1 }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // 验证图片
    if (!formData.image_url.trim()) {
      newErrors.image_url = '请上传轮播图片'
    }

    // 验证链接格式
    if (formData.link_url && formData.link_url.trim()) {
      try {
        new URL(formData.link_url)
      } catch {
        // 如果不是完整URL，检查是否是相对路径
        if (!formData.link_url.startsWith('/') && !formData.link_url.startsWith('#')) {
          newErrors.link_url = '请输入有效的URL或相对路径'
        }
      }
    }

    // 验证排序
    if (formData.sort_order < 0) {
      newErrors.sort_order = '排序值不能为负数'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmitting) return

    const isValid = validateForm()
    if (!isValid) return

    try {
      setIsSubmitting(true)

      const submitData = {
        title_zh: formData.title_zh.trim() || undefined,
        title_en: formData.title_en.trim() || undefined,
        description_zh: formData.description_zh.trim() || undefined,
        description_en: formData.description_en.trim() || undefined,
        image_url: formData.image_url.trim(),
        link_url: formData.link_url.trim() || undefined,
        sort_order: formData.sort_order,
        is_active: formData.is_active,
        scene: formData.scene || undefined
      }

      if (image) {
        // 更新
        const response = await fetch(`/api/admin/carousel/${image.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '更新失败')
        }
      } else {
        // 创建
        const response = await fetch('/api/admin/carousel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submitData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '创建失败')
        }
      }

      onSuccess()
    } catch (error) {
      console.error('保存轮播图失败:', error)
      alert('保存失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImageChange = (url: string) => {
    console.log('🖼️ 轮播图图片URL更新:', url)
    setFormData(prev => ({ ...prev, image_url: url }))
    if (errors.image_url) {
      setErrors(prev => ({ ...prev, image_url: '' }))
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {image ? '编辑轮播图' : '新增轮播图'}
          </h2>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 图片上传 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              轮播图片 <span className="text-red-500">*</span>
            </label>
            <ImageUpload
              value={formData.image_url}
              onChange={handleImageChange}
              placeholder="上传轮播图片（建议尺寸：1920x800px）"
              maxSize={10}
              bucket="images"
              folder="carousel"
            />
            {errors.image_url && (
              <p className="text-red-500 text-sm mt-1">{errors.image_url}</p>
            )}
          </div>

          {/* 多语言标题和描述 */}
          <LanguageTabs>
            {(language) => (
              <div className="space-y-4">
                <LanguageField
                  label={language === 'zh' ? '中文标题' : '英文标题'}
                  value={language === 'zh' ? formData.title_zh : formData.title_en}
                  onChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    [language === 'zh' ? 'title_zh' : 'title_en']: value 
                  }))}
                  placeholder={language === 'zh' ? '例如：绿色低碳技术创新' : 'e.g. Green Low-Carbon Technology Innovation'}
                />
                
                <LanguageField
                  label={language === 'zh' ? '中文描述' : '英文描述'}
                  value={language === 'zh' ? formData.description_zh : formData.description_en}
                  onChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    [language === 'zh' ? 'description_zh' : 'description_en']: value 
                  }))}
                  placeholder={language === 'zh' ? '例如：推动可持续发展，共建美好未来' : 'e.g. Promoting sustainable development for a better future'}
                  type="textarea"
                  rows={2}
                />
              </div>
            )}
          </LanguageTabs>

          {/* 链接地址 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              链接地址
            </label>
            <input
              type="text"
              value={formData.link_url}
              onChange={(e) => setFormData(prev => ({ ...prev, link_url: e.target.value }))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                errors.link_url ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="例如：https://example.com 或 /about 或 #section"
            />
            {errors.link_url && (
              <p className="text-red-500 text-sm mt-1">{errors.link_url}</p>
            )}
            <p className="text-gray-500 text-xs mt-1">
              可以是完整URL、相对路径或锚点链接，留空表示无链接
            </p>
          </div>

          {/* 排序和状态 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                排序值
              </label>
              <input
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  errors.sort_order ? 'border-red-300' : 'border-gray-300'
                }`}
                min="0"
              />
              {errors.sort_order && (
                <p className="text-red-500 text-sm mt-1">{errors.sort_order}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                数值越小排序越靠前
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                状态
              </label>
              <div className="flex items-center h-10">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  启用状态
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                场景
              </label>
              <select
                value={formData.scene}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    scene: e.target.value as 'home' | 'parks' | '',
                  }))
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent border-gray-300 text-sm"
              >
                <option value="home">绿色技术首页</option>
                <option value="parks">绿色园区首页</option>
              </select>
              <p className="text-gray-500 text-xs mt-1">
                用于区分不同入口的轮播图。
              </p>
            </div>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
