'use client'

import { useState, useEffect } from 'react'
import { X, Upload, FileText, Trash2 } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { AdminTechnology, AdminCategory, AdminSubcategory, TECH_SOURCE_OPTIONS, TECH_ACQUISITION_METHOD_OPTIONS, TechSource, TechAcquisitionMethod, TechReviewStatus } from '@/lib/types/admin'
import { getPublicCategoriesApi, getPublicSubcategoriesApi } from '@/lib/api/public-categories'
import { createUserTechnologyApi, updateUserTechnologyApi } from '@/lib/api/user-technologies'
import { CompactImageUpload } from '@/components/ui/compact-image-upload'
import { LanguageTabs, LanguageField } from '@/components/admin/forms/language-tabs'
import { uploadMultipleFilesWithInfo, FileAttachment } from '@/lib/supabase-storage'
import { isAllowedTechAttachment, allowedAttachmentHint } from '@/lib/validators'
import { useAuthContext } from '@/components/auth/auth-provider'
import { safeFetch, handleApiResponse } from '@/lib/safe-fetch'
import { useFixedLabelSuggestions } from '@/hooks/use-fixed-label-suggestions'

interface UserTechnologyFormProps {
  technology?: AdminTechnology | null
  onSuccess: () => void
  onCancel: () => void
}

export function UserTechnologyForm({ technology, onSuccess, onCancel }: UserTechnologyFormProps) {
  const { user } = useAuthContext()
  const pathname = usePathname()
  
  // 检测当前语言
  const locale = pathname.startsWith('/en') ? 'en' : 'zh'
  
  const [isLoading, setIsLoading] = useState(false)
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false)
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [subcategories, setSubcategories] = useState<AdminSubcategory[]>([])
  
  const [formData, setFormData] = useState({
    name_zh: technology?.name_zh || '',
    name_en: technology?.name_en || '',
    description_zh: technology?.description_zh || '',
    description_en: technology?.description_en || '',
    website_url: technology?.website_url || '',
    tech_source: (technology?.tech_source || '') as TechSource,
    acquisition_method: (technology?.acquisition_method || 'enterprise_report') as TechAcquisitionMethod,
    category_id: technology?.category_id || '',
    subcategory_id: technology?.subcategory_id || '',
    custom_label: technology?.custom_label || '', // 应用场景标签
    image_url: technology?.image_url || '',
    attachment_urls: technology?.attachment_urls || [],
    attachments: technology?.attachments || [],
    review_status: (technology?.review_status || 'pending_review') as TechReviewStatus
  })

  // 企业信息状态（用于显示，自动填充）
  const [companyInfo, setCompanyInfo] = useState({
    company_id: '',
    company_name_zh: '',
    company_name_en: '',
    company_logo_url: '',
    company_country_id: '',
    company_province_id: '',
    company_development_zone_id: ''
  })

  const {
    suggestions: labelSuggestions,
    isOpen: showLabelSuggestions,
    setIsOpen: setShowLabelSuggestions,
    containerRef: suggestionContainerRef,
    matchedLabel: customLabelMeta,
    handleFocus: handleLabelInputFocus,
    handleSelect: handleSelectFixedLabel
  } = useFixedLabelSuggestions(formData.custom_label, (label) => handleInputChange('custom_label', label))

  useEffect(() => {
    loadCategories()
    loadUserCompanyInfo()
    
    // 如果是编辑模式，加载子分类
    if (technology?.category_id) {
      loadSubcategories(technology.category_id)
    }
  }, [technology])

  const loadUserCompanyInfo = async () => {
    if (!user?.id) return
    
    try {
      const response = await safeFetch('/api/user/company', { method: 'GET', useAuth: true })
      const result = await handleApiResponse(response)
      const company = result || {}
      if (company) {
        setCompanyInfo({
          company_id: company.id || '',
          company_name_zh: company.name_zh || '',
          company_name_en: company.name_en || '',
          company_logo_url: company.logo_url || '',
          company_country_id: company.country_id || '',
          company_province_id: company.province_id || '',
          company_development_zone_id: company.development_zone_id || ''
        })
      }
    } catch (error) {
      console.error('获取用户企业信息失败:', error)
    }
  }

  const loadCategories = async () => {
    try {
      const result = await getPublicCategoriesApi()
      setCategories(result || [])
    } catch (error) {
      console.error('加载分类失败:', error)
      setCategories([])
    }
  }

  const loadSubcategories = async (categoryId: string) => {
    if (!categoryId) {
      setSubcategories([])
      return
    }
    
    try {
      const result = await getPublicSubcategoriesApi(categoryId)
      setSubcategories(result || [])
    } catch (error) {
      console.error('加载子分类失败:', error)
      setSubcategories([])
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // 当分类改变时，重新加载子分类
    if (field === 'category_id') {
      setFormData(prev => ({ ...prev, subcategory_id: '' }))
      loadSubcategories(value)
    }
  }



  const handleAttachmentUpload = async (files: File[]) => {
    if (!files || files.length === 0) return
    
    // 限制最多5个附件
    const currentAttachments = formData.attachments || []
    const remainingSlots = 5 - currentAttachments.length
    
    if (files.length > remainingSlots) {
      alert(locale === 'en' 
        ? `Maximum ${remainingSlots} attachments allowed (currently ${currentAttachments.length} files)`
        : `最多只能上传${remainingSlots}个附件（当前已有${currentAttachments.length}个）`)
      return
    }

    // 验证文件大小和类型
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { // 10MB限制
        alert(locale === 'en' 
          ? `File "${file.name}" exceeds 10MB limit, please select a smaller file`
          : `文件 "${file.name}" 超过10MB限制，请选择更小的文件`)
        return
      }
      // 类型限制
      if (!isAllowedTechAttachment(file)) {
        alert(locale === 'en'
          ? `File type not allowed: ${file.name}\n${allowedAttachmentHint('en')}`
          : `不允许的文件类型：${file.name}\n${allowedAttachmentHint('zh')}`)
        return
      }
    }

    // 设置上传状态
    setIsUploadingAttachment(true)

    try {
      console.log('开始上传附件:', files)
      
      // 为每个文件单独上传，这样可以更好地跟踪进度和错误
      const newAttachments: FileAttachment[] = []
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        console.log(`正在上传第${i + 1}个文件: ${file.name}`)
        
        try {
          // 使用Promise.race添加超时机制
          const uploadPromise = uploadMultipleFilesWithInfo([file], 'images', 'technology-attachments')
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error(locale === 'en' ? 'Upload timeout, please check your network connection' : '上传超时，请检查网络连接')), 30000)
          )
          
          const result = await Promise.race([uploadPromise, timeoutPromise]) as FileAttachment[]
          if (result && result.length > 0) {
            newAttachments.push(result[0])
            console.log(`文件 ${file.name} 上传成功`)
          }
        } catch (fileError) {
          console.error(`文件 ${file.name} 上传失败:`, fileError)
          setIsUploadingAttachment(false)
          const errorMsg = fileError instanceof Error ? fileError.message : (locale === 'en' ? 'Unknown error' : '未知错误')
          alert(locale === 'en' 
            ? `❌ File "${file.name}" upload failed: ${errorMsg}`
            : `❌ 文件 "${file.name}" 上传失败: ${errorMsg}`)
          return
        }
      }
      
      if (newAttachments.length > 0) {
        console.log('所有文件上传完成，新附件:', newAttachments)
        
        // 更新表单数据 - 直接使用setFormData确保更新
        const updatedAttachments = [...currentAttachments, ...newAttachments]
        console.log('准备更新attachments:', updatedAttachments)
        
        setFormData(prev => {
          const newData = { ...prev, attachments: updatedAttachments }
          console.log('直接更新formData - attachments:', newData.attachments)
          return newData
        })
        
        // 同时也调用handleInputChange作为备份
        handleInputChange('attachments', updatedAttachments)
        
        // 成功通知
        const fileNames = files.length === 1 ? `"${files[0].name}"` : (locale === 'en' ? `${files.length} files` : `${files.length}个文件`)
        alert(locale === 'en' ? `✅ ${fileNames} uploaded successfully!` : `✅ ${fileNames} 上传成功！`)
      }
      
    } catch (error) {
      console.error('附件上传失败:', error)
      const errorMessage = error instanceof Error ? error.message : (locale === 'en' ? 'Unknown error' : '未知错误')
      alert(locale === 'en' ? `❌ Attachment upload failed: ${errorMessage}` : `❌ 附件上传失败: ${errorMessage}`)
    } finally {
      // 确保始终重置上传状态
      setIsUploadingAttachment(false)
    }
  }

  const removeAttachment = (index: number) => {
    const currentAttachments = formData.attachments || []
    const newAttachments = currentAttachments.filter((_, i) => i !== index)
    handleInputChange('attachments', newAttachments)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 验证必填字段
    if (!formData.name_zh.trim()) {
      alert(locale === 'en' ? 'Please enter technology name' : '请填写技术名称')
      return
    }
    
    if (!formData.category_id) {
      alert(locale === 'en' ? 'Please select technology category' : '请选择技术分类')
      return
    }

    // 子分类必填
    if (!formData.subcategory_id) {
      alert(locale === 'en' ? 'Please select technology subcategory' : '请选择技术子分类')
      return
    }
    
    if (!formData.tech_source) {
      alert(locale === 'en' ? 'Please select technology source' : '请选择技术来源')
      return
    }

    // 描述长度限制 2000 字
    if (formData.description_zh && formData.description_zh.length > 2000) {
      alert(locale === 'en' ? 'Chinese description cannot exceed 2000 characters' : '中文技术描述不能超过2000字')
      return
    }
    if (formData.description_en && formData.description_en.length > 2000) {
      alert(locale === 'en' ? 'English description cannot exceed 2000 characters' : '英文技术描述不能超过2000字')
      return
    }
    // 可选网站URL校验（若填写，放宽为可缺省协议的域名）
    if (formData.website_url) {
      const url = formData.website_url.trim()
      const relaxed = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}([\/:?#].*)?$/i
      if (!relaxed.test(url)) {
        alert(locale === 'en' ? 'Please enter a valid website URL' : '请输入有效的网址链接')
        return
      }
    }

    setIsLoading(true)
    
    try {
      // 合并用户企业信息到技术数据
      // 归一化网址（未写协议时默认加 https://）
      const normalizedWebsite = formData.website_url?.trim()
        ? (/^https?:\/\//i.test(formData.website_url.trim())
            ? formData.website_url.trim()
            : `https://${formData.website_url.trim()}`)
        : undefined

    const technologyData = {
      ...formData,
      website_url: normalizedWebsite,
      // 企业关联信息（自动填充）
      ...companyInfo,
      // 用户创建的技术默认启用
      is_active: true
    }
      
      if (technology?.id) {
        // 检查是否是已发布的技术
        const isPublishedTech = technology.review_status === 'published';
        
        if (isPublishedTech) {
          // 已发布的技术修改后需要重新审核
          technologyData.review_status = 'pending_review';
          await updateUserTechnologyApi(technology.id, technologyData);
          alert(locale === 'en' 
            ? 'Your technology modification request has been submitted for review. Results will be notified within 3-5 business days via messages, SMS, and email. The technology will be temporarily removed from the homepage and will be displayed again after approval.'
            : '您的技术修改申请已提交，我们正在对其进行审核，结果将在3-5个工作日内通过站内信、短信、邮件的形式通知您。技术将暂时从首页移除，审核通过后重新展示。');
        } else {
          // 其他状态的技术正常更新
          await updateUserTechnologyApi(technology.id, technologyData);
          alert(locale === 'en' ? 'Technology updated successfully' : '技术更新成功');
        }
      } else {
        await createUserTechnologyApi(technologyData)
        alert(locale === 'en' 
          ? 'Your technology publication request has been submitted for review. Results will be notified within 3-5 business days via messages, SMS, and email.'
          : '您的技术发布申请已提交，我们正在对其进行审核，结果将在3-5个工作日内通过站内信、短信、邮件的形式通知您')
      }
      
      onSuccess()
    } catch (error) {
      console.error('保存技术失败:', error)
      alert(locale === 'en' 
        ? `Failed to save technology: ${error instanceof Error ? error.message : 'Unknown error'}`
        : `保存技术失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* 表单头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {technology 
              ? (locale === 'en' ? 'Edit Technology' : '编辑技术')
              : (locale === 'en' ? 'Add Technology' : '新增技术')
            }
          </h2>
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单内容 */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <form onSubmit={(e) => { e.preventDefault(); }} className="p-6 space-y-8">
            
            {/* 第一部分：基本信息 */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-[#00b899] text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <h3 className="text-lg font-medium text-gray-900">
                  {locale === 'en' ? 'Basic Information' : '基本信息'}
                </h3>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 左列 */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {locale === 'en' ? 'Chinese Technology Name' : '技术中文名称'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name_zh}
                      onChange={(e) => handleInputChange('name_zh', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder={locale === 'en' ? 'Please enter technology name' : '请输入技术名称'}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                    {locale === 'en' ? 'English Technology Name' : '技术英文名称'} <span className="text-gray-400 text-xs">{locale === 'en' ? '(Optional)' : '（可选）'}</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name_en}
                      onChange={(e) => handleInputChange('name_en', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder={locale === 'en' ? 'Please enter English name' : '请输入英文名称'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {locale === 'en' ? 'Technology Website ' : '技术网址链接'} <span className="text-gray-400 text-xs">{locale === 'en' ? '(Optional)' : '（可选）'}</span>
                    </label>
                    <input
                      type="url"
                      value={formData.website_url}
                      onChange={(e) => handleInputChange('website_url', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="https://example.com/tech"
                    />
                  </div>
                </div>

                {/* 右列 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {locale === 'en' ? 'Technology Image' : '技术图片'} <span className="text-gray-400 text-xs">{locale === 'en' ? '(Optional)' : '（可选）'}</span>
                  </label>
                  <CompactImageUpload
                    value={formData.image_url}
                    onChange={(url) => handleInputChange('image_url', url)}
                    maxSize={5}
                    bucket="images"
                    folder="technologies"
                  />
                </div>
              </div>
            </div>

            {/* 第二部分：技术来源与分类 */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-[#00b899] text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <h3 className="text-lg font-medium text-gray-900">
                  {locale === 'en' ? 'Technology Source & Category' : '技术来源与分类'}
                </h3>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {locale === 'en' ? 'Technology Category' : '技术分类'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => handleInputChange('category_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">
                      {locale === 'en' ? 'Please select technology category' : '请选择技术分类'}
                    </option>
                    {categories && categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {locale === 'en' ? (category.name_en || category.name_zh) : category.name_zh}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {locale === 'en' ? 'Technology Subcategory' : '技术子分类'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.subcategory_id}
                    onChange={(e) => handleInputChange('subcategory_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={!formData.category_id}
                    required
                  >
                    <option value="">
                      {locale === 'en' ? 'Please select technology subcategory' : '请选择技术子分类'}
                    </option>
                    {subcategories && subcategories.map(subcategory => (
                      <option key={subcategory.id} value={subcategory.id}>
                        {locale === 'en' ? (subcategory.name_en || subcategory.name_zh) : subcategory.name_zh}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {locale === 'en' ? 'Technology Source' : '技术来源'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.tech_source}
                    onChange={(e) => handleInputChange('tech_source', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  >
                    <option value="">
                      {locale === 'en' ? 'Please select technology source' : '请选择技术来源'}
                    </option>
                    {TECH_SOURCE_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {locale === 'en' ? option.label_en : option.label_zh}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 技术获取方式字段已隐藏，用户创建的技术自动设置为"企业上报" */}
              </div>
              
              {/* 应用场景标签 */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {locale === 'en' ? 'Application Scenario Tags ' : '应用场景标签'} <span className="text-gray-400 text-xs">{locale === 'en' ? '(Optional)' : '（可选）'}</span>
                </label>
                <div className="relative" ref={suggestionContainerRef}>
                  <input
                    type="text"
                    value={formData.custom_label}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value.length <= 20) {
                        handleInputChange('custom_label', value)
                        setShowLabelSuggestions(value.trim().length > 0)
                      }
                    }}
                    onFocus={handleLabelInputFocus}
                    placeholder={locale === 'en' 
                      ? 'Enter application scenario tags, e.g.: Energy Saving, Smart Manufacturing...'
                      : '输入应用场景标签，如：节能环保、智能制造...'
                    }
                    maxLength={20}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 pr-16"
                  />
                  <div className="absolute right-3 top-2 text-xs text-gray-400">
                    {formData.custom_label.length}/20
                  </div>
                  {showLabelSuggestions && labelSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto z-10">
                      {labelSuggestions.map(option => (
                        <button
                          type="button"
                          key={`${option.categoryId}-${option.label}`}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleSelectFixedLabel(option)}
                          className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-gray-50"
                        >
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${option.color.bgClass} ${option.color.textClass}`}>
                            {option.label}
                          </span>
                          <span className="ml-3 text-xs text-gray-500">{option.categoryName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {customLabelMeta && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${customLabelMeta.color.bgClass} ${customLabelMeta.color.textClass}`}>
                      {customLabelMeta.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {locale === 'en'
                        ? `Matched fixed label (${customLabelMeta.categoryName})`
                        : `匹配到${customLabelMeta.categoryName}固定标签`}
                    </span>
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {locale === 'en' 
                    ? 'Application scenario tags for display on technology showcase pages, maximum 20 characters'
                    : '用于在技术展示页面显示的应用场景标签，最多20个字符'
                  }
                </p>
              </div>
            </div>

            {/* 第三部分：技术简介与附件 */}
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-[#00b899] text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <h3 className="text-lg font-medium text-gray-900">
                  {locale === 'en' ? 'Technology Description & Attachments' : '技术简介与附件'}
                </h3>
              </div>
              
              {/* 技术描述 - 使用语言切换标签 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {locale === 'en' ? 'Technology Description' : '技术描述'}
                </label>
                <LanguageTabs>
                  {(language) => (
                    <LanguageField
                      label={language === 'zh' ? '中文描述' : 'English Description'}
                      value={language === 'zh' ? formData.description_zh : formData.description_en}
                      onChange={(value) => handleInputChange(
                        language === 'zh' ? 'description_zh' : 'description_en',
                        value
                      )}
                      placeholder={language === 'zh' ? '请输入技术的中文描述' : 'Please enter the English description of the technology'}
                      type="textarea"
                      rows={4}
                    />
                  )}
                </LanguageTabs>
              </div>

              {/* 技术资料 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  {locale === 'en' ? 'Technology Documents' : '技术资料'}
                </label>
                <div className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
                  isUploadingAttachment ? 'border-green-400 bg-green-50' : 'border-gray-300'
                }`}>
                  <div className="text-center">
                    <div className="text-gray-500 mb-4">
                      {isUploadingAttachment ? (
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                          <p className="text-green-600 font-medium">
                            {locale === 'en' ? 'Uploading attachments...' : '正在上传附件...'}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {locale === 'en' ? 'Please wait, files are being uploaded' : '请稍候，文件正在上传中'}
                          </p>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p>
                            {locale === 'en' 
                              ? 'Support uploading images, PDF, Word, Excel and other documents'
                              : '支持上传图片、PDF、Word、Excel等文档'
                            }
                          </p>
                          <p className="text-sm mt-1">
                            {locale === 'en' 
                              ? 'Click or drag files here to upload (single file no more than 10MB)'
                              : '点击或拖拽文件到此处上传（单个文件不超过10MB）'
                            }
                          </p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      multiple
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        if (e.target.files) {
                          handleAttachmentUpload(Array.from(e.target.files))
                          // 清空文件输入框，允许重复选择相同文件
                          e.target.value = ''
                        }
                      }}
                      className="hidden"
                      id="attachment-upload"
                      disabled={isUploadingAttachment}
                    />
                    <div className="space-x-2">
                      <button
                        type="button"
                        onClick={() => document.getElementById('attachment-upload')?.click()}
                        disabled={isUploadingAttachment}
                        className={`px-4 py-2 text-white rounded-lg transition-colors ${
                          isUploadingAttachment 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-[#00b899] hover:bg-[#009a7a]'
                        }`}
                      >
                        {isUploadingAttachment 
                          ? (locale === 'en' ? 'Uploading...' : '上传中...')
                          : (locale === 'en' ? 'Select Files' : '选择文件')
                        }
                      </button>
                      {isUploadingAttachment && (
                        <button
                          type="button"
                          onClick={() => setIsUploadingAttachment(false)}
                          className="px-3 py-2 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors text-sm"
                          title={locale === 'en' ? 'If upload is stuck, click this button to reset status' : '如果上传卡住，点击此按钮重置状态'}
                        >
                          {locale === 'en' ? 'Cancel Upload' : '取消上传'}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  
                  {/* 已上传附件列表 */}
                  {formData.attachments && formData.attachments.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        {locale === 'en' 
                          ? `Uploaded files (${formData.attachments.length}/5):`
                          : `已上传的文件（${formData.attachments.length}/5）：`
                        }
                      </h4>
                      <div className="space-y-2">
                        {formData.attachments.map((attachment, index) => (
                          <div key={`${attachment.url}-${attachment.filename}-${index}`} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                            <div className="flex items-center">
                              <FileText className="w-4 h-4 text-blue-500 mr-2" />
                              <div className="flex flex-col">
                                <span className="text-sm text-gray-700">{attachment.filename}</span>
                                <span className="text-xs text-gray-500">
                                  {attachment.size ? (attachment.size / 1024 / 1024).toFixed(2) + ' MB' : (locale === 'en' ? 'Unknown size' : '未知大小')}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAttachment(index)}
                              className="text-red-500 hover:text-red-700 p-1"
                              title={locale === 'en' ? 'Delete attachment' : '删除附件'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* 表单底部 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {locale === 'en' ? 'Cancel' : '取消'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || isUploadingAttachment}
            className="px-4 py-2 bg-[#00b899] hover:bg-[#009a7a] text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading 
              ? (locale === 'en' ? 'Saving...' : '保存中...')
              : isUploadingAttachment 
                ? (locale === 'en' ? 'Files uploading...' : '文件上传中...')
                : (locale === 'en' ? 'Save' : '保存')
            }
          </button>
        </div>
      </div>
    </div>
  )
}
