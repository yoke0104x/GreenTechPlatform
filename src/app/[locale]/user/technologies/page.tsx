'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Plus, Edit, Trash2, Lightbulb, Tag, FileText, Image as ImageIcon, RefreshCw, MessageSquare, Eye, Download, X } from 'lucide-react'
import { AdminTechnology, AdminCategory, AdminSubcategory, AdminCountry, AdminProvince, AdminDevelopmentZone, AdminCompany, TechnologyAttachment, PaginationParams, TECH_SOURCE_OPTIONS, TECH_REVIEW_STATUS_OPTIONS, TechReviewStatus, TECH_ACQUISITION_METHOD_OPTIONS } from '@/lib/types/admin'
import { DataTable, Column } from '@/components/admin/data-table/data-table'
import { UserTechnologyForm } from './components/user-technology-form'
import { getUserTechnologiesApi, deleteUserTechnologyApi } from '@/lib/api/user-technologies'
import { useAuthContext } from '@/components/auth/auth-provider'

export default function UserTechnologiesPage() {
  const { user } = useAuthContext()
  const params = useParams()
  const locale = params.locale as string
  
  const [technologies, setTechnologies] = useState<AdminTechnology[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingTechnology, setEditingTechnology] = useState<AdminTechnology | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [viewingTechnology, setViewingTechnology] = useState<AdminTechnology | null>(null)
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  })

  // 获取用户名（邮箱或手机号）
  const getUserName = () => {
    return user?.email || user?.phone || user?.name || 'User'
  }

  useEffect(() => {
    if (user?.id) {
      loadTechnologies()
    }
  }, [pagination.current, pagination.pageSize, user?.id])

  const loadTechnologies = async (params?: Partial<PaginationParams>) => {
    if (!user?.id) return
    
    try {
      setIsLoading(true)
      
      // 只加载当前用户创建的技术
      const result = await getUserTechnologiesApi({
        page: pagination.current,
        pageSize: pagination.pageSize,
        userId: user.id, // 必须的用户ID
        ...params
      })
      
      setTechnologies(result.data)
      setPagination(prev => ({
        ...prev,
        total: result.pagination.total
      }))
    } catch (error) {
      console.error('加载技术列表失败:', error)
      alert(locale === 'en' ? 'Failed to load technology list, please retry' : '加载技术列表失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (search: string) => {
    setPagination(prev => ({ ...prev, current: 1 }))
    // 确保搜索从第一页开始
    loadTechnologies({ search, page: 1 })
  }

  const handleSort = (field: string, order: 'asc' | 'desc') => {
    loadTechnologies({ sortBy: field, sortOrder: order })
  }

  const handlePaginationChange = (page: number, pageSize: number) => {
    setPagination(prev => ({ ...prev, current: page, pageSize }))
  }

  const handleAdd = () => {
    setEditingTechnology(null)
    setShowForm(true)
  }

  const handleView = (technology: AdminTechnology) => {
    setViewingTechnology(technology)
    setShowDetailModal(true)
  }

  const handleEdit = (technology: AdminTechnology) => {
    setEditingTechnology(technology)
    setShowForm(true)
  }

  const handleDelete = async (technology: AdminTechnology) => {
    const confirmMessage = locale === 'en' 
      ? `Are you sure you want to delete the technology "${technology.name_zh}"?`
      : `确定要删除技术"${technology.name_zh}"吗？`
    
    if (!confirm(confirmMessage)) {
      return
    }

    if (!user?.id) {
      alert(locale === 'en' ? 'User information incomplete, unable to delete' : '用户信息不完整，无法删除')
      return
    }

    try {
      await deleteUserTechnologyApi(technology.id, user.id)
      alert(locale === 'en' ? 'Technology deleted successfully' : '技术删除成功')
      await loadTechnologies()
    } catch (error) {
      console.error('删除技术失败:', error)
      const errorMessage = locale === 'en' 
        ? `Failed to delete technology: ${error instanceof Error ? error.message : 'Unknown error'}`
        : `删除技术失败: ${error instanceof Error ? error.message : '未知错误'}`
      alert(errorMessage)
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingTechnology(null)
    loadTechnologies()
  }

  const handleResubmit = async (technology: AdminTechnology) => {
    const confirmMessage = locale === 'en'
      ? `Are you sure you want to resubmit the technology "${technology.name_zh}" for review?`
      : `确定要重新提交技术"${technology.name_zh}"进行审核吗？`
    
    if (!confirm(confirmMessage)) {
      return
    }

    try {
      // 将技术状态设置为待审核
      const response = await fetch(`/api/user/technologies/${technology.id}/resubmit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('重新提交失败')
      }

      const successMessage = locale === 'en'
        ? 'Your technology publication application has been resubmitted. We are reviewing it and will notify you within 3-5 working days via internal message, SMS, or email.'
        : '您的技术发布申请已重新提交，我们正在对其进行审核，结果将在3-5个工作日内通过站内信、短信、邮件的形式通知您'
      
      alert(successMessage)
      await loadTechnologies()
    } catch (error) {
      console.error('重新提交失败:', error)
      const errorMessage = locale === 'en'
        ? `Resubmission failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        : `重新提交失败: ${error instanceof Error ? error.message : '未知错误'}`
      alert(errorMessage)
    }
  }

  const getReviewStatusLabel = (status?: TechReviewStatus) => {
    const option = TECH_REVIEW_STATUS_OPTIONS.find(opt => opt.value === status)
    return locale === 'en' ? option?.label_en || 'Unknown' : option?.label_zh || '未知'
  }

  const getReviewStatusBadge = (status?: TechReviewStatus) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTechSourceLabel = (source?: string) => {
    const option = TECH_SOURCE_OPTIONS.find(opt => opt.value === source)
    return locale === 'en' ? option?.label_en || 'Unknown' : option?.label_zh || '未知'
  }

  const getTechAcquisitionMethodLabel = (method?: string) => {
    const option = TECH_ACQUISITION_METHOD_OPTIONS.find(opt => opt.value === method)
    return locale === 'en' ? option?.label_en || 'Unknown' : option?.label_zh || '未知'
  }

  // 从URL中提取或生成有意义的文件名
  const getDisplayFilename = (url: string) => {
    const urlPath = url.split('/').pop() || '';
    const parts = urlPath.split('.');
    
    if (parts.length > 1) {
      const ext = parts.pop(); // 获取文件扩展名
      return locale === 'en' ? `Tech-Material.${ext}` : `技术资料.${ext}`;
    }
    
    return locale === 'en' ? 'Tech-Material' : '技术资料';
  };

  const handlePreviewImage = (imageUrl: string) => {
    window.open(imageUrl, '_blank')
  }

  const handleDownloadAttachment = async (attachmentUrl: string, originalFilename?: string) => {
    try {
      // 获取有意义的文件名
      const filename = originalFilename || getDisplayFilename(attachmentUrl);
      
      // 使用API接口进行下载
      const downloadUrl = `/api/files/download?url=${encodeURIComponent(attachmentUrl)}&filename=${encodeURIComponent(filename)}`
      
      // 创建隐藏的下载链接
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = filename
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (error) {
      console.error('下载附件失败:', error)
      alert(locale === 'en' ? 'Failed to download attachment, please retry' : '下载附件失败，请重试')
    }
  }

  const columns: Column<AdminTechnology>[] = [
    {
      key: 'image_url',
      title: locale === 'en' ? 'Image' : '图片',
      width: '100px',
      render: (value: AdminTechnology[keyof AdminTechnology], record: AdminTechnology, index: number) => (
        <div className="flex items-center space-x-2">
          {value ? (
            <div className="relative">
              <img 
                src={value as string} 
                alt={record.name_zh}
                className="w-16 h-12 object-cover rounded border border-gray-200 cursor-pointer hover:opacity-80"
                onClick={() => handlePreviewImage(value as string)}
              />
            </div>
          ) : (
            <div className="w-16 h-12 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-gray-400" />
            </div>
          )}
        </div>
      )
    },
    {
      key: 'name_zh',
      title: locale === 'en' ? 'Technology Name' : '技术名称',
      sortable: true,
      render: (value: AdminTechnology[keyof AdminTechnology], record: AdminTechnology, index: number) => (
        <div className="max-w-xs">
          <div className="font-medium text-gray-900 truncate">{locale === 'en' ? record.name_en || record.name_zh : record.name_zh}</div>
          {locale === 'zh' && record.name_en && (
            <div className="text-sm text-gray-500 truncate">{record.name_en}</div>
          )}
          {locale === 'en' && record.name_zh !== record.name_en && (
            <div className="text-sm text-gray-500 truncate">{record.name_zh}</div>
          )}
        </div>
      )
    },
    {
      key: 'category',
      title: locale === 'en' ? 'Category' : '分类',
      render: (value: AdminTechnology[keyof AdminTechnology], record: AdminTechnology, index: number) => (
        <div className="text-sm">
          {record.category && (
            <div className="flex items-center text-blue-600 mb-1">
              <Tag className="w-3 h-3 mr-1" />
              {locale === 'en' ? record.category.name_en || record.category.name_zh : record.category.name_zh}
            </div>
          )}
          {record.subcategory && (
            <div className="text-gray-500 ml-4 text-xs">
              {locale === 'en' ? record.subcategory.name_en || record.subcategory.name_zh : record.subcategory.name_zh}
            </div>
          )}
          {!record.category && !record.subcategory && (
            <span className="text-gray-400">{locale === 'en' ? 'Uncategorized' : '未分类'}</span>
          )}
        </div>
      )
    },
    {
      key: 'tech_source',
      title: locale === 'en' ? 'Tech Source' : '技术来源',
      render: (value: AdminTechnology[keyof AdminTechnology], record: AdminTechnology, index: number) => (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
          {getTechSourceLabel(value as string)}
        </span>
      )
    },
    {
      key: 'attachments',
      title: locale === 'en' ? 'Attachments' : '附件',
      width: '160px',
      render: (_: AdminTechnology[keyof AdminTechnology], record: AdminTechnology) => {
        // 优先使用新的attachments字段，fallback到attachment_urls
        let attachments: Array<{url: string, filename?: string}> = [];
        
        if (record.attachments && Array.isArray(record.attachments)) {
          // 新格式：包含完整附件信息
          attachments = record.attachments;
        } else if (record.attachment_urls && Array.isArray(record.attachment_urls)) {
          // 旧格式：只有URL
          attachments = record.attachment_urls.map(url => ({ url }));
        }
        
        return (
          <div className="flex items-center">
            {attachments && attachments.length > 0 ? (
              <div className="flex flex-col space-y-1">
                <div className="flex items-center text-green-600">
                  <FileText className="w-4 h-4 mr-1" />
                  <span className="text-sm">
                    {locale === 'en' ? `${attachments.length} files` : `${attachments.length}个文件`}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {attachments.map((attachment, index) => {
                    const filename = attachment.filename || getDisplayFilename(attachment.url);
                    const shortName = filename.length > 15 ? filename.substring(0, 15) + '...' : filename;
                    return (
                      <button
                        key={index}
                        onClick={() => handleDownloadAttachment(attachment.url, attachment.filename)}
                        className="text-xs text-blue-600 hover:text-blue-800 underline truncate max-w-24"
                        title={filename}
                      >
                        {shortName}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <span className="text-gray-400 text-sm">{locale === 'en' ? 'None' : '无'}</span>
            )}
          </div>
        );
      }
    },
    {
      key: 'review_status',
      title: locale === 'en' ? 'Review Status' : '审核状态',
      width: '100px',
      render: (_: AdminTechnology[keyof AdminTechnology], record: AdminTechnology) => {
        const status = record.review_status || 'published'
        return (
          <div className="space-y-1">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              getReviewStatusBadge(status)
            }`}>
              {getReviewStatusLabel(status)}
            </span>
            {status === 'rejected' && record.reject_reason && (
              <div className="text-xs text-red-600 max-w-32 truncate" title={record.reject_reason}>
                {record.reject_reason}
              </div>
            )}
          </div>
        )
      }
    },
    {
      key: 'is_active',
      title: locale === 'en' ? 'Status' : '启用状态',
      width: '80px',
      render: (value: AdminTechnology[keyof AdminTechnology], record: AdminTechnology, index: number) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value as boolean 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {value as boolean ? (locale === 'en' ? 'Active' : '启用') : (locale === 'en' ? 'Inactive' : '禁用')}
        </span>
      )
    },
    {
      key: 'created_at',
      title: locale === 'en' ? 'Created' : '创建时间',
      sortable: true,
      render: (value: AdminTechnology[keyof AdminTechnology], record: AdminTechnology, index: number) => (
        <span className="text-sm text-gray-500">
          {new Date(value as string).toLocaleDateString(locale === 'en' ? 'en-US' : 'zh-CN')}
        </span>
      )
    },
    {
      key: 'actions',
      title: locale === 'en' ? 'Actions' : '操作',
      width: '160px',
      render: (_: AdminTechnology[keyof AdminTechnology], record: AdminTechnology) => {
        const status = record.review_status || 'published'
        const isPendingReview = status === 'pending_review'
        
        return (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => handleView(record)}
              className="p-1 text-gray-600 hover:bg-gray-50 rounded"
              title={locale === 'en' ? 'View details' : '浏览详情'}
            >
              <Eye className="w-4 h-4" />
            </button>
            
            {status === 'rejected' && (
              <button
                onClick={() => handleResubmit(record)}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
                title={locale === 'en' ? 'Resubmit' : '重新提交'}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            
            <button
              onClick={() => handleEdit(record)}
              disabled={isPendingReview}
              className={`p-1 rounded ${
                isPendingReview 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-blue-600 hover:bg-blue-50'
              }`}
              title={isPendingReview ? (locale === 'en' ? 'Cannot edit during review' : '待审核状态不可编辑') : (locale === 'en' ? 'Edit' : '编辑')}
            >
              <Edit className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => handleDelete(record)}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
              title={locale === 'en' ? 'Delete' : '删除'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {locale === 'en' ? 'Publish Technology' : '技术发布'}
          </h1>
          <p className="text-gray-600 mt-1">
            {locale === 'en' ? 'Publish your green low-carbon technologies and update technology information' : '发布您的绿色低碳技术和更新技术信息'}
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          {locale === 'en' ? 'Publish New Technology' : '发布新技术'}
        </button>
      </div>

      {/* 数据表格 */}
      <DataTable
        columns={columns}
        data={technologies}
        loading={isLoading}
        searchMode="enter"
        pagination={{
          current: pagination.current,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: handlePaginationChange
        }}
        onSearch={handleSearch}
        onSort={handleSort}
        searchPlaceholder={locale === 'en' ? 'Search technology name, description...' : '搜索技术名称、描述或简介...'}
        className="shadow-sm"
      />

      {/* 技术表单弹窗 */}
      {showForm && (
        <UserTechnologyForm
          technology={editingTechnology}
          onSuccess={handleFormSuccess}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* 技术详情浏览弹窗 - 这里可以根据需要进一步国际化 */}
      {showDetailModal && viewingTechnology && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* 弹窗头部 */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center">
                <Eye className="w-5 h-5 text-blue-600 mr-2" />
                <h2 className="text-xl font-bold text-gray-900">
                  {locale === 'en' ? 'Technology Details' : '技术详情'}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false)
                  setViewingTechnology(null)
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="p-6 space-y-8">
                {/* 基本信息 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                    {locale === 'en' ? 'Basic Information' : '基本信息'}
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'en' ? 'Chinese Name' : '技术名称（中文）'}</label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{viewingTechnology.name_zh || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'en' ? 'English Name' : '技术名称（英文）'}</label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{viewingTechnology.name_en || '-'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'en' ? 'Tech Source' : '技术来源'}</label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{getTechSourceLabel(viewingTechnology.tech_source)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'en' ? 'Technology Website' : '技术网址'}</label>
                        <div className="text-sm bg-gray-50 p-3 rounded-lg">
                          {viewingTechnology.website_url ? (
                            <a
                              href={viewingTechnology.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline break-all"
                            >
                              {viewingTechnology.website_url}
                            </a>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'en' ? 'Category' : '技术分类'}</label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                          {locale === 'en' 
                            ? (viewingTechnology.category?.name_en || viewingTechnology.category?.name_zh || '-')
                            : (viewingTechnology.category?.name_zh || '-')}
                          {viewingTechnology.subcategory && (
                            <span className="text-gray-500">
                              {' / '} 
                              {locale === 'en' 
                                ? (viewingTechnology.subcategory.name_en || viewingTechnology.subcategory.name_zh)
                                : viewingTechnology.subcategory.name_zh}
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'en' ? 'Acquisition Method' : '技术获取方式'}</label>
                        <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">{getTechAcquisitionMethodLabel(viewingTechnology.acquisition_method)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'en' ? 'Application Scenario Tags' : '应用场景标签'}</label>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          {viewingTechnology.custom_label ? (
                            <span className="inline-flex items-center px-2 py-1 text-xs text-blue-600 bg-blue-50 border border-blue-400 rounded">
                              {viewingTechnology.custom_label}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'en' ? 'Review Status' : '审核状态'}</label>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getReviewStatusBadge(viewingTechnology.review_status)}`}>
                            {getReviewStatusLabel(viewingTechnology.review_status)}
                          </span>
                          {viewingTechnology.review_status === 'rejected' && viewingTechnology.reject_reason && (
                            <span className="text-xs text-red-600">{locale === 'en' ? `Reason: ${viewingTechnology.reject_reason}` : `原因：${viewingTechnology.reject_reason}`}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'en' ? 'Technology Image' : '技术图片'}</label>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        {viewingTechnology.image_url ? (
                          <img
                            src={viewingTechnology.image_url}
                            alt={viewingTechnology.name_zh}
                            className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-80"
                            onClick={() => handlePreviewImage(viewingTechnology.image_url!)}
                          />
                        ) : (
                          <div className="w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                            <ImageIcon className="w-12 h-12 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 技术描述 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">{locale === 'en' ? 'Description' : '技术描述'}</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'en' ? 'Chinese Description' : '中文描述'}</label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto whitespace-pre-line">
                        {(() => {
                          const text = viewingTechnology.description_zh || '';
                          const lines = String(text).split(/\r?\n/);
                          const labelRe = /^(\s*(?:技术描述|收益类型|收益描述|应用地区和国家|技术成熟度|ID)\s*：)/;
                          return lines.map((line, i) => {
                            const m = line.match(labelRe);
                            return (
                              <div key={i}>
                                {m ? (<><strong>{m[1].trim()}</strong>{line.slice(m[1].length)}</>) : line}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'en' ? 'English Description' : '英文描述'}</label>
                      <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg max-h-32 overflow-y-auto whitespace-pre-line">
                        {(() => {
                          const text = viewingTechnology.description_en || '';
                          const lines = String(text).split(/\r?\n/);
                          const labelRe = /^(\s*(?:Description|Benefit\s+Types|Benefit\s+Details|Deployed\s+In|Technology\s+Readiness\s+Level|ID)\s*:)/;
                          return lines.map((line, i) => {
                            const m = line.match(labelRe);
                            return (
                              <div key={i}>
                                {m ? (<><strong>{m[1].trim()}</strong>{line.slice(m[1].length)}</>) : line}
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 用户视图不显示企业信息 */}

                {/* 技术资料 */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">{locale === 'en' ? 'Attachments' : '技术资料'}</h3>
                  {(viewingTechnology.attachments && viewingTechnology.attachments.length > 0) || (viewingTechnology.attachment_urls && viewingTechnology.attachment_urls.length > 0) ? (
                    <div className="space-y-2">
                      {(viewingTechnology.attachments && viewingTechnology.attachments.length > 0
                        ? viewingTechnology.attachments
                        : (viewingTechnology.attachment_urls || []).map(url => ({ url }))
                      ).map((att: any, index: number) => (
                        <div key={`${att.url}-${index}`} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                          <div className="flex items-center">
                            <FileText className="w-4 h-4 text-blue-500 mr-2" />
                            <div className="flex flex-col">
                              <span className="text-sm text-gray-700">{att.filename || getDisplayFilename(att.url)}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDownloadAttachment(att.url, att.filename)}
                            className="px-3 py-1 text-sm text-white bg-green-600 rounded hover:bg-green-700"
                          >
                            {locale === 'en' ? 'Download' : '下载'}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">{locale === 'en' ? 'No attachments' : '暂无技术资料'}</div>
                  )}
                </div>
              </div>
            </div>

            {/* 弹窗底部 */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowDetailModal(false)
                  setViewingTechnology(null)
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {locale === 'en' ? 'Close' : '关闭'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
