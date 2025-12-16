'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import {
  AdminPark,
  AdminProvince,
  AdminDevelopmentZone,
  AdminParkBrandHonor,
  ParkBrandHonorType,
  PARK_BRAND_HONOR_TYPE_OPTIONS,
} from '@/lib/types/admin'
import { getProvincesApi } from '@/lib/api/admin-provinces'
import { getDevelopmentZonesApi } from '@/lib/api/admin-development-zones'
import {
  createParkAdminApi,
  updateParkAdminApi,
} from '@/lib/api/admin-parks'
import {
  getParkBrandHonorsApi,
  createParkBrandHonorApi,
  updateParkBrandHonorApi,
  deleteParkBrandHonorApi,
} from '@/lib/api/admin-park-brand-honors'
import { ImageUpload } from '@/components/admin/forms/image-upload'

interface ParkFormProps {
  park?: AdminPark | null
  onSuccess: () => void
  onCancel: () => void
}

const PARK_LEVEL_OPTIONS = [
  { value: '', label: '未设置' },
  { value: '国家级经济技术开发区', label: '国家级经济技术开发区' },
  { value: '国家级高新技术产业开发区', label: '国家级高新技术产业开发区' },
  { value: '省级经济技术开发区', label: '省级经济技术开发区' },
  { value: '省级高新技术产业开发区', label: '省级高新技术产业开发区' },
  { value: '其他', label: '其他' },
]

type TabKey = 'basic' | 'honors' | 'stats' | 'policies' | 'companies' | 'news'

export function ParkForm({ park, onSuccess, onCancel }: ParkFormProps) {
  const [formData, setFormData] = useState({
    name_zh: '',
    name_en: '',
    logo_url: '',
    level: '',
    level_code: '',
    province_id: '',
    development_zone_id: '',
    city: '',
    address: '',
    website_url: '',
    wechat_official_account: '',
    leading_industries: '',
    leading_companies: '',
    alias: '',
    dialect: '',
    climate: '',
    region_desc: '',
    license_plate_code: '',
    phone_area_code: '',
    postal_code: '',
    brief_zh: '',
    brief_en: '',
    nearby_airports: '',
    nearby_railway_stations: '',
    famous_scenic_spots: '',
    area_km2: undefined as number | undefined,
    population: undefined as number | undefined,
    established_date: '',
    is_active: true,
    sort_rank: '' as string | number,
  })

  const [provinces, setProvinces] = useState<AdminProvince[]>([])
  const [developmentZones, setDevelopmentZones] = useState<AdminDevelopmentZone[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [brandHonors, setBrandHonors] = useState<AdminParkBrandHonor[]>([])
  const [loadingBrandHonors, setLoadingBrandHonors] = useState(false)
  const [honorSubmittingId, setHonorSubmittingId] = useState<string | null>(null)
  const [creatingHonor, setCreatingHonor] = useState(false)
  const [newHonor, setNewHonor] = useState<{
    year: string
    title: string
    type: ParkBrandHonorType | ''
    approved_at: string
    sort_order: string
  }>({
    year: '',
    title: '',
    type: '',
    approved_at: '',
    sort_order: '',
  })
  const [activeTab, setActiveTab] = useState<TabKey>('basic')

  const isNationalEconomicZone = formData.level === '国家级经济技术开发区'

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

  useEffect(() => {
    setFormData({
      name_zh: park?.name_zh || '',
      name_en: park?.name_en || '',
      logo_url: park?.logo_url || '',
      level: park?.level || '',
      level_code: park?.level_code || '',
      province_id: park?.province_id || '',
      development_zone_id: park?.development_zone_id || '',
      city: park?.city || '',
      address: park?.address || '',
      website_url: park?.website_url || '',
      wechat_official_account: park?.wechat_official_account || '',
      leading_industries: park?.leading_industries || '',
      leading_companies: park?.leading_companies || '',
      alias: park?.alias || '',
      dialect: park?.dialect || '',
      climate: park?.climate || '',
      region_desc: park?.region_desc || '',
      license_plate_code: park?.license_plate_code || '',
      phone_area_code: park?.phone_area_code || '',
      postal_code: park?.postal_code || '',
      brief_zh: park?.brief_zh || '',
      brief_en: park?.brief_en || '',
      nearby_airports: park?.nearby_airports || '',
      nearby_railway_stations: park?.nearby_railway_stations || '',
      famous_scenic_spots: park?.famous_scenic_spots || '',
      area_km2: park?.area_km2 ?? undefined,
      population: park?.population ?? undefined,
      established_date: park?.established_date || '',
      is_active: park?.is_active ?? true,
      sort_rank: typeof park?.sort_rank === 'number' ? park.sort_rank : '',
    })

    if (park?.province_id) {
      loadDevelopmentZones(park.province_id)
    } else {
      setDevelopmentZones([])
    }

    if (park?.id) {
      ;(async () => {
        try {
          setLoadingBrandHonors(true)
          const list = await getParkBrandHonorsApi(park.id)
          setBrandHonors(list)
        } catch (error) {
          console.error('加载园区品牌荣誉失败:', error)
          setBrandHonors([])
        } finally {
          setLoadingBrandHonors(false)
        }
      })()
    } else {
      setBrandHonors([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [park?.id])

  const loadDevelopmentZones = async (provinceId: string) => {
    if (!provinceId) {
      setDevelopmentZones([])
      return
    }
    try {
      const list = await getDevelopmentZonesApi(provinceId)
      setDevelopmentZones(list)
    } catch (error) {
      console.error('加载经开区列表失败:', error)
      setDevelopmentZones([])
    }
  }

  const handleProvinceChange = (provinceId: string) => {
    setFormData((prev) => ({
      ...prev,
      province_id: provinceId,
      development_zone_id: '',
    }))
    loadDevelopmentZones(provinceId)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.name_zh.trim()) {
      newErrors.name_zh = '园区中文名称不能为空'
    }
    if (isNationalEconomicZone && !formData.development_zone_id) {
      newErrors.development_zone_id = '国家级经济技术开发区必须选择对应经开区'
    }
    if (formData.sort_rank !== '' && Number.isNaN(Number(formData.sort_rank))) {
      newErrors.sort_rank = '排序顺位必须是数字'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    if (!validateForm()) return

    try {
      setIsSubmitting(true)
      const sortRankValue =
        formData.sort_rank === '' || formData.sort_rank === null
          ? null
          : Number(formData.sort_rank)

      const payload: Partial<AdminPark> = {
        name_zh: formData.name_zh.trim(),
        name_en: formData.name_en.trim() || undefined,
        logo_url: formData.logo_url || undefined,
        level: formData.level || undefined,
        level_code: formData.level_code || undefined,
        province_id: formData.province_id || undefined,
        development_zone_id: formData.development_zone_id || undefined,
        city: formData.city.trim() || undefined,
        address: formData.address.trim() || undefined,
        website_url: formData.website_url.trim() || undefined,
        wechat_official_account:
          formData.wechat_official_account.trim() || undefined,
        leading_industries:
          formData.leading_industries.trim() || undefined,
        leading_companies:
          formData.leading_companies.trim() || undefined,
        alias: formData.alias.trim() || undefined,
        climate: formData.climate.trim() || undefined,
        region_desc: formData.region_desc.trim() || undefined,
        license_plate_code:
          formData.license_plate_code.trim() || undefined,
        phone_area_code: formData.phone_area_code.trim() || undefined,
        postal_code: formData.postal_code.trim() || undefined,
        brief_zh: formData.brief_zh.trim() || undefined,
        brief_en: formData.brief_en.trim() || undefined,
        nearby_airports: formData.nearby_airports.trim() || undefined,
        nearby_railway_stations:
          formData.nearby_railway_stations.trim() || undefined,
        famous_scenic_spots:
          formData.famous_scenic_spots.trim() || undefined,
        area_km2:
          formData.area_km2 === undefined || Number.isNaN(formData.area_km2)
            ? undefined
            : formData.area_km2,
        population:
          formData.population === undefined ||
          Number.isNaN(formData.population)
            ? undefined
            : formData.population,
        established_date: formData.established_date || undefined,
        is_active: formData.is_active,
        sort_rank:
          sortRankValue !== null && !Number.isNaN(sortRankValue)
            ? sortRankValue
            : null,
      }

      if (park) {
        await updateParkAdminApi(park.id, payload)
      } else {
        await createParkAdminApi(payload)
      }

      onSuccess()
    } catch (error) {
      console.error('保存园区失败:', error)
      alert('保存园区失败，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleHonorFieldChange = (
    id: string,
    field: 'year' | 'title' | 'type' | 'approved_at' | 'sort_order',
    value: string,
  ) => {
    setBrandHonors((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h
        if (field === 'year') {
          const trimmed = value.trim()
          if (!trimmed) return { ...h, year: null }
          const parsed = Number(trimmed)
          if (Number.isNaN(parsed)) return h
          return { ...h, year: parsed }
        }
        if (field === 'type') {
          return { ...h, type: (value || null) as ParkBrandHonorType | null }
        }
        if (field === 'approved_at') {
          return { ...h, approved_at: value.trim() || null }
        }
        if (field === 'sort_order') {
          const trimmed = value.trim()
          if (!trimmed) return { ...h, sort_order: null }
          const parsed = Number(trimmed)
          if (Number.isNaN(parsed)) return h
          return { ...h, sort_order: parsed }
        }
        return { ...h, title: value }
      }),
    )
  }

  const handleSaveHonor = async (honor: AdminParkBrandHonor) => {
    if (!park?.id) return
    if (!honor.title?.trim()) {
      alert('品牌荣誉名称不能为空')
      return
    }
    try {
      setHonorSubmittingId(honor.id)
      const payload: Partial<AdminParkBrandHonor> = {
        title: honor.title.trim(),
        year:
          typeof honor.year === 'number' && !Number.isNaN(honor.year)
            ? honor.year
            : null,
        type: honor.type ?? null,
        approved_at: honor.approved_at ?? null,
      }
      const updated = await updateParkBrandHonorApi(honor.id, payload)
      setBrandHonors((prev) =>
        prev.map((h) => (h.id === updated.id ? updated : h)),
      )
    } catch (error) {
      console.error('保存品牌荣誉失败:', error)
      alert('保存品牌荣誉失败，请稍后重试')
    } finally {
      setHonorSubmittingId(null)
    }
  }

  const handleDeleteHonor = async (honor: AdminParkBrandHonor) => {
    if (
      !confirm(`确定要删除品牌荣誉「${honor.title}」吗？该操作不可恢复。`)
    ) {
      return
    }
    try {
      setHonorSubmittingId(honor.id)
      await deleteParkBrandHonorApi(honor.id)
      setBrandHonors((prev) => prev.filter((h) => h.id !== honor.id))
    } catch (error) {
      console.error('删除品牌荣誉失败:', error)
      alert('删除品牌荣誉失败，请稍后重试')
    } finally {
      setHonorSubmittingId(null)
    }
  }

  const handleCreateHonor = async () => {
    if (!park?.id) return
    if (!newHonor.title.trim()) {
      alert('请先填写品牌荣誉名称')
      return
    }
    try {
      setCreatingHonor(true)
      const payload: Partial<AdminParkBrandHonor> & { park_id: string } = {
        park_id: park.id,
        title: newHonor.title.trim(),
      }
      if (newHonor.year.trim()) {
        const parsed = Number(newHonor.year.trim())
        if (!Number.isNaN(parsed)) payload.year = parsed
      }
      if (newHonor.type) payload.type = newHonor.type
      if (newHonor.approved_at?.trim()) {
        payload.approved_at = newHonor.approved_at.trim()
      }
      if (newHonor.sort_order.trim()) {
        const parsedOrder = Number(newHonor.sort_order.trim())
        if (!Number.isNaN(parsedOrder)) {
          payload.sort_order = parsedOrder
        }
      }
      const created = await createParkBrandHonorApi(payload)
      setBrandHonors((prev) => [created, ...prev])
      setNewHonor({ year: '', title: '', type: '', approved_at: '', sort_order: '' })
    } catch (error) {
      console.error('新增品牌荣誉失败:', error)
      alert('新增品牌荣誉失败，请稍后重试')
    } finally {
      setCreatingHonor(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {park ? '编辑园区' : '新增园区'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 选项卡导航 */}
          <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
            {[
              { key: 'basic', label: '基本信息' },
              { key: 'honors', label: '品牌与荣誉' },
              { key: 'stats', label: '统计数据' },
              { key: 'policies', label: '园区政策' },
              { key: 'companies', label: '入驻企业' },
              { key: 'news', label: '资讯动态' },
            ].map((tab) => {
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key as TabKey)}
                  className={`px-3 py-1.5 rounded-md text-sm ${
                    active
                      ? 'bg-green-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {activeTab === 'basic' && (
            <>
              {/* 基本信息 */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  基本信息
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        园区中文名称
                      </label>
                      <input
                        type="text"
                        value={formData.name_zh}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name_zh: e.target.value,
                          }))
                        }
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                          errors.name_zh ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="例如：苏州工业园区"
                      />
                      {errors.name_zh && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.name_zh}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        园区英文名称
                      </label>
                      <input
                        type="text"
                        value={formData.name_en}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            name_en: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="例如：Suzhou Industrial Park"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        排序顺位（默认排序用，从0开始）
                      </label>
                      <input
                        type="number"
                        value={formData.sort_rank}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            sort_rank: e.target.value === '' ? '' : Number(e.target.value),
                          }))
                        }
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                          errors.sort_rank ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="例如：0 表示最靠前，数值越大越靠后"
                      />
                      {errors.sort_rank && (
                        <p className="text-xs text-red-500 mt-1">
                          {errors.sort_rank}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-400">
                        园区 H5 首页选择“默认排序”时，将按该字段从小到大排列，未设置的排在后面。
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          园区级别
                        </label>
                        <select
                          value={formData.level}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              level: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          {PARK_LEVEL_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          级别编码（可选）
                        </label>
                        <input
                          type="text"
                          value={formData.level_code}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              level_code: e.target.value,
                            }))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="例如：7"
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      园区 Logo
                    </label>
                    <ImageUpload
                      value={formData.logo_url}
                      onChange={(url) =>
                        setFormData((prev) => ({ ...prev, logo_url: url }))
                      }
                      placeholder="点击上传园区 Logo"
                      maxSize={2}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      所在省份
                    </label>
                    <select
                      value={formData.province_id}
                      onChange={(e) => handleProvinceChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">请选择省份</option>
                      {provinces.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name_zh}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      对应经开区（仅国家级经济技术开发区必选）
                    </label>
                    <select
                      value={formData.development_zone_id}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          development_zone_id: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">不关联经开区</option>
                      {developmentZones.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name_zh}
                        </option>
                      ))}
                    </select>
                    {errors.development_zone_id && (
                      <p className="text-xs text-red-500 mt-1">
                        {errors.development_zone_id}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      如果该园区级别为“国家级经济技术开发区”，则必须选择对应经开区。
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        所在城市（可选）
                      </label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            city: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="例如：苏州"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        详细地址（可选）
                      </label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            address: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="例如：苏州工业园区星湖街333号"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        官网地址（可选）
                      </label>
                      <input
                        type="text"
                        value={formData.website_url}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            website_url: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus-border-transparent"
                        placeholder="https://example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        微信公众号（可选）
                      </label>
                      <input
                        type="text"
                        value={formData.wechat_official_account}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            wechat_official_account: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus-border-transparent"
                        placeholder="请输入公众号名称"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        主导产业（可选）
                      </label>
                      <input
                        type="text"
                        value={formData.leading_industries}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            leading_industries: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus-border-transparent"
                        placeholder="例如：智能制造、新材料"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        代表企业（可选）
                      </label>
                      <input
                        type="text"
                        value={formData.leading_companies}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            leading_companies: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus-border-transparent"
                        placeholder="例如：三星、和舰、龙旗等"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        别名（可选）
                      </label>
                      <input
                        type="text"
                        value={formData.alias}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            alias: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus-border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        方言（可选）
                      </label>
                      <input
                        type="text"
                        value={formData.dialect}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            dialect: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus-border-transparent"
                        placeholder="如：吴语"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        气候条件（可选）
                      </label>
                      <input
                        type="text"
                        value={formData.climate}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            climate: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus-border-transparent"
                        placeholder="如：亚热带季风气候"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        区域描述（可选）
                      </label>
                      <input
                        type="text"
                        value={formData.region_desc}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            region_desc: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus-border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        车牌代码（可选）
                      </label>
                      <input
                        type="text"
                        value={formData.license_plate_code}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            license_plate_code: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus-border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        电话区号（可选）
                      </label>
                      <input
                        type="text"
                        value={formData.phone_area_code}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            phone_area_code: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus-border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        邮政编码（可选）
                      </label>
                      <input
                        type="text"
                        value={formData.postal_code}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            postal_code: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus-ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        成立时间（可选）
                      </label>
                      <input
                        type="text"
                        value={formData.established_date || ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            established_date: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="如：1994-05-03"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        面积（平方公里，可选）
                      </label>
                      <input
                        type="number"
                        value={formData.area_km2 ?? ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            area_km2:
                              e.target.value === '' ? undefined : Number(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="如：288"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        人口（人，可选）
                      </label>
                      <input
                        type="number"
                        value={formData.population ?? ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            population:
                              e.target.value === '' ? undefined : Number(e.target.value),
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="如：1200000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        附近机场（可选）
                      </label>
                      <input
                        type="text"
                        value={formData.nearby_airports}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            nearby_airports: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="多个请用中文逗号分隔"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        火车站（可选）
                      </label>
                      <input
                        type="text"
                        value={formData.nearby_railway_stations}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            nearby_railway_stations: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="多个请用中文逗号分隔"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        著名景点（可选）
                      </label>
                      <input
                        type="text"
                        value={formData.famous_scenic_spots}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            famous_scenic_spots: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        邮政编码（可选）
                      </label>
                      <input
                        type="text"
                        value={formData.postal_code}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            postal_code: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      简要介绍（中文）
                    </label>
                    <textarea
                      value={formData.brief_zh}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          brief_zh: e.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="请输入园区简介，支持换行"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      简要介绍（英文）
                    </label>
                    <textarea
                      value={formData.brief_en}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          brief_en: e.target.value,
                        }))
                      }
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus-border-transparent"
                      placeholder="English brief for international users (optional)"
                    />
                  </div>
                </div>
              </div>

              {/* 状态 */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="park_is_active"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      is_active: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <label
                  htmlFor="park_is_active"
                  className="ml-2 text-sm text-gray-700"
                >
                  启用状态
                </label>
              </div>
            </>
          )}

          {activeTab === 'honors' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  品牌与荣誉
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  这些记录将用于园区详情页 H5 上的时间轴展示。可为同一年维护多条不同类型的品牌荣誉。
                </p>
              </div>

              {!park?.id ? (
                <p className="text-sm text-gray-500">
                  请先保存园区基础信息，保存后可在“品牌与荣誉”页签下维护记录。
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800">
                        已有品牌荣誉
                      </span>
                      {loadingBrandHonors && (
                        <span className="text-xs text-gray-400">
                          正在加载...
                        </span>
                      )}
                    </div>

                    {brandHonors.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        暂无品牌荣誉记录，可在下方添加。
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {brandHonors.map((honor) => (
                          <div
                            key={honor.id}
                            className="grid grid-cols-1 md:grid-cols-[80px,1fr,160px,140px,90px,100px] gap-3 items-center rounded-md border border-gray-200 px-3 py-2"
                          >
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                年份
                              </label>
                              <input
                                type="text"
                                value={
                                  honor.year !== null &&
                                  honor.year !== undefined
                                    ? String(honor.year)
                                    : ''
                                }
                                onChange={(e) =>
                                  handleHonorFieldChange(
                                    honor.id,
                                    'year',
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                                placeholder="如 2010"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                品牌荣誉名称
                              </label>
                              <input
                                type="text"
                                value={honor.title || ''}
                                onChange={(e) =>
                                  handleHonorFieldChange(
                                    honor.id,
                                    'title',
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                                placeholder="例如：国家生态工业示范园区"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                类型
                              </label>
                              <select
                                value={(honor.type as ParkBrandHonorType) || ''}
                                onChange={(e) =>
                                  handleHonorFieldChange(
                                    honor.id,
                                    'type',
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm bg-white"
                              >
                                <option value="">未分类</option>
                                {PARK_BRAND_HONOR_TYPE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">
                                获批时间
                              </label>
                              <input
                                type="date"
                                value={honor.approved_at || ''}
                                onChange={(e) =>
                                  handleHonorFieldChange(
                                    honor.id,
                                    'approved_at',
                                    e.target.value,
                                  )
                                }
                                className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                              />
                            </div>
                            <div className="flex items-center justify-end gap-2">
                              <div className="text-xs text-gray-500 flex items-center gap-1">
                                <span>优先级</span>
                                <input
                                  type="text"
                                  value={honor.sort_order ?? ''}
                                  onChange={(e) =>
                                    handleHonorFieldChange(
                                      honor.id,
                                      'sort_order',
                                      e.target.value,
                                    )
                                  }
                                  className="w-16 px-2 py-1 border border-gray-300 rounded-md text-xs"
                                  placeholder="-"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSaveHonor(honor)}
                                disabled={honorSubmittingId === honor.id}
                                className="px-3 py-1 rounded-md bg-blue-600 text-white text-xs hover:bg-blue-700 disabled:opacity-60"
                              >
                                {honorSubmittingId === honor.id
                                  ? '保存中...'
                                  : '保存'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteHonor(honor)}
                                disabled={honorSubmittingId === honor.id}
                                className="px-3 py-1 rounded-md bg-red-50 text-red-600 text-xs hover:bg-red-100 disabled:opacity-60"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-dashed border-gray-200 pt-4">
                    <span className="block text-sm font-medium text-gray-800 mb-2">
                      新增品牌荣誉
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-[80px,1fr,160px,140px,100px,100px] gap-3 items-end">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          年份
                        </label>
                        <input
                          type="text"
                          value={newHonor.year}
                          onChange={(e) =>
                            setNewHonor((prev) => ({
                              ...prev,
                              year: e.target.value,
                            }))
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                          placeholder="如 2010"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          品牌荣誉名称
                        </label>
                        <input
                          type="text"
                          value={newHonor.title}
                          onChange={(e) =>
                            setNewHonor((prev) => ({
                              ...prev,
                              title: e.target.value,
                            }))
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                          placeholder="例如：国家生态工业示范园区"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          类型
                        </label>
                        <select
                          value={newHonor.type}
                          onChange={(e) =>
                            setNewHonor((prev) => ({
                              ...prev,
                              type: e.target.value as ParkBrandHonorType | '',
                            }))
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm bg-white"
                        >
                          <option value="">未分类</option>
                          {PARK_BRAND_HONOR_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          获批时间
                        </label>
                        <input
                          type="date"
                          value={newHonor.approved_at}
                          onChange={(e) =>
                            setNewHonor((prev) => ({
                              ...prev,
                              approved_at: e.target.value,
                            }))
                          }
                          className="w-full px-2 py-1 border border-gray-300 rounded-md text-sm"
                        />
                      </div>
                      <div className="flex justify-end">
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                          <span>优先级</span>
                          <input
                            type="text"
                            value={newHonor.sort_order}
                            onChange={(e) =>
                              setNewHonor((prev) => ({
                                ...prev,
                                sort_order: e.target.value,
                              }))
                            }
                            className="w-16 px-2 py-1 border border-gray-300 rounded-md text-xs"
                            placeholder="-"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleCreateHonor}
                          disabled={creatingHonor}
                          className="px-4 py-2 rounded-md bg-green-600 text-white text-sm hover:bg-green-700 disabled:opacity-60"
                        >
                          {creatingHonor ? '添加中...' : '添加'}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab !== 'basic' && activeTab !== 'honors' && (
            <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
              {activeTab === 'stats' && '统计数据暂未在此表单维护，后续会接入 park_economic_stats 后台编辑。'}
              {activeTab === 'policies' && '园区政策的维护请在政策管理模块进行，后续可在此联动。'}
              {activeTab === 'companies' && '入驻企业管理尚未接入，如需维护请在企业模块或后续版本中完成。'}
              {activeTab === 'news' && '资讯动态管理尚未接入，后续接入园区资讯后台。'}
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
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
