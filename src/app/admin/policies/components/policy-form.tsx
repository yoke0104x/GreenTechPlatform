'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import {
  AdminPolicy,
  AdminPolicyLevel,
  AdminPolicyTag,
  POLICY_LEVEL_OPTIONS,
  POLICY_MINISTRY_UNIT_OPTIONS,
  AdminProvince,
  AdminDevelopmentZone,
} from '@/lib/types/admin'
import { getPolicyTagsAdminApi } from '@/lib/api/admin-policies'
import { getProvincesApi } from '@/lib/api/admin-provinces'
import { getDevelopmentZonesApi } from '@/lib/api/admin-development-zones'

export interface PolicyFormValues {
  id?: string
  name: string
  level: AdminPolicyLevel
  status: string
  issuer?: string
   // 部委单位，仅当 level = 'ministry' 时使用
  ministryUnit?: string
  docNumber?: string
  publishDate?: string
  effectiveDate?: string
  summary?: string
  sourceUrl?: string
  regionId?: string
  parkId?: string
  tagIds: string[]
}

interface PolicyFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (values: PolicyFormValues) => Promise<void>
  initial?: (AdminPolicy & { tagIds?: string[] }) | null
}

export function PolicyForm({ open, onClose, onSubmit, initial }: PolicyFormProps) {
  const [values, setValues] = useState<PolicyFormValues>({
    id: initial?.id,
    name: initial?.name || '',
    level: (initial?.level as AdminPolicyLevel) || 'national',
    status: initial?.status || 'active',
    issuer: initial?.issuer || '',
    ministryUnit: initial?.ministry_unit || '',
    docNumber: initial?.doc_number || '',
    publishDate: initial?.publish_date || '',
    effectiveDate: initial?.effective_date || '',
    summary: initial?.summary || '',
    sourceUrl: initial?.source_url || '',
    regionId: initial?.region_id || '',
    parkId: initial?.park_id || '',
    tagIds: initial?.tagIds || [],
  })
  const [submitting, setSubmitting] = useState(false)
  const [tags, setTags] = useState<AdminPolicyTag[]>([])
  const [provinces, setProvinces] = useState<AdminProvince[]>([])
  const [zones, setZones] = useState<AdminDevelopmentZone[]>([])

  useEffect(() => {
    if (!open) return
    ;(async () => {
      try {
        const [tagList, provinceList] = await Promise.all([
          getPolicyTagsAdminApi(),
          getProvincesApi(),
        ])
        setTags(tagList)
        setProvinces(provinceList)

        const regionId = initial?.region_id || values.regionId
        if (regionId) {
          const z = await getDevelopmentZonesApi(regionId)
          setZones(z)
        } else {
          setZones([])
        }
      } catch (error) {
        console.warn('加载政策表单依赖数据失败:', error)
      }
    })()
  }, [open])

  useEffect(() => {
    setValues({
      id: initial?.id,
      name: initial?.name || '',
      level: (initial?.level as AdminPolicyLevel) || 'national',
      status: initial?.status || 'active',
      issuer: initial?.issuer || '',
      ministryUnit: initial?.ministry_unit || '',
      docNumber: initial?.doc_number || '',
      publishDate: initial?.publish_date || '',
      effectiveDate: initial?.effective_date || '',
      summary: initial?.summary || '',
      sourceUrl: initial?.source_url || '',
      regionId: initial?.region_id || '',
      parkId: initial?.park_id || '',
      tagIds: initial?.tagIds || [],
    })
  }, [initial?.id])

  const handleChange = (field: keyof PolicyFormValues, value: any) => {
    setValues((prev) => {
      // 如果修改了发布日期且当前实施日期为空，则默认同步
      if (field === 'publishDate' && (prev.effectiveDate === '' || prev.effectiveDate == null)) {
        return { ...prev, publishDate: value, effectiveDate: value }
      }
      return { ...prev, [field]: value }
    })
  }

  const handleRegionChange = async (regionId: string) => {
    handleChange('regionId', regionId)
    handleChange('parkId', '')
    if (regionId) {
      try {
        const z = await getDevelopmentZonesApi(regionId)
        setZones(z)
      } catch (e) {
        console.warn('加载经开区失败:', e)
        setZones([])
      }
    } else {
      setZones([])
    }
  }

  const handleToggleTag = (id: string) => {
    setValues((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(id)
        ? prev.tagIds.filter((x) => x !== id)
        : [...prev.tagIds, id],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!values.name || !values.level) return
    setSubmitting(true)
    try {
      await onSubmit(values)
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {values.id ? '编辑政策' : '新增政策'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              政策名称
            </label>
            <input
              type="text"
              value={values.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                政策级别
              </label>
              <select
                value={values.level}
                onChange={(e) =>
                  handleChange('level', e.target.value as AdminPolicyLevel)
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                {POLICY_LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label_zh}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                状态
              </label>
              <select
                value={values.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="active">active（有效）</option>
                <option value="invalid">invalid（已废止）</option>
                <option value="unknown">unknown（不确定）</option>
              </select>
            </div>

            <div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  发布机构
                </label>
                <input
                  type="text"
                  value={values.issuer}
                  onChange={(e) => handleChange('issuer', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              {values.level === 'ministry' && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    部委单位（仅部委政策）
                  </label>
                  <select
                    value={values.ministryUnit || ''}
                    onChange={(e) => handleChange('ministryUnit', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">未设置</option>
                    {POLICY_MINISTRY_UNIT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label_zh}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                发文字号
              </label>
              <input
                type="text"
                value={values.docNumber}
                onChange={(e) => handleChange('docNumber', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                发布日期
              </label>
              <input
                type="date"
                value={values.publishDate || ''}
                onChange={(e) => handleChange('publishDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                实施日期
              </label>
              <input
                type="date"
                value={values.effectiveDate || ''}
                onChange={(e) =>
                  handleChange('effectiveDate', e.target.value)
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                省份（地区）
              </label>
              <select
                value={values.regionId || ''}
                onChange={(e) => handleRegionChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">未设置</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name_zh}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                经开区 / 园区
              </label>
              <select
                value={values.parkId || ''}
                onChange={(e) => handleChange('parkId', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">未设置</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name_zh}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              政策摘要
            </label>
            <textarea
              value={values.summary || ''}
              onChange={(e) => handleChange('summary', e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              政策原文链接
            </label>
            <input
              type="text"
              value={values.sourceUrl || ''}
              onChange={(e) => handleChange('sourceUrl', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              政策标签
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const active = values.tagIds.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => handleToggleTag(tag.id)}
                    className={`px-3 h-8 rounded-full border text-xs ${
                      active
                        ? 'bg-[#eef2ff] border-[#6b6ee2] text-[#4b50d4]'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    {tag.name}
                  </button>
                )
              })}
              {!tags.length && (
                <p className="text-xs text-gray-400">
                  暂无可用标签，请在“政策标签管理”中新增。
                </p>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-gray-300 text-sm text-gray-700 bg-white"
              disabled={submitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="h-9 px-4 rounded-lg bg-[#00b899] text-white text-sm disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
