"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronDown } from 'lucide-react'
import { submitCompanyProfile, type CompanyProfileData } from '@/api/company'
import { useFilterData, transformFilterDataForComponents } from '@/hooks/admin/use-filter-data'
import { COMPANY_TYPE_OPTIONS } from '@/lib/types/admin'
import { CompanySearch, type CompanySearchResult } from '@/components/company/company-search'
import { useAuthContext } from '@/components/auth/auth-provider'
import { generateCompanyLogo } from '@/lib/logoGenerator'
import { I18nCompactImageUpload } from '@/components/ui/i18n-compact-image-upload'
import { isValidEmail, isValidPhone, emailError, phoneError } from '@/lib/validators'

export default function MobileCompanyProfilePage() {
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname.startsWith('/en') ? 'en' : 'zh'
  const t = useTranslations('companyProfile')
  const tCommon = useTranslations('common')
  const { user, loading, checkUser } = useAuthContext()
  const hasLocalAuth = typeof window !== 'undefined' && (localStorage.getItem('custom_auth_token') || localStorage.getItem('access_token'))

  // step state — 完全复用 Web 端两步交互
  const [step, setStep] = useState<1 | 2>(1)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitLoading, setSubmitLoading] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [qccDataFetched, setQccDataFetched] = useState(false) // 是否获取了企查查数据

  const [formData, setFormData] = useState({
    requirement: '',
    companyName: '',
    logoFile: null as File | null,
    logoUrl: '' as string,
    country: '',
    province: '',
    economicZone: '',
    companyType: '',
    address: '',
    industryCode: '',
    annualOutput: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: ''
  })

  // 认证初始化（与 Web 保持一致，发现 token 则触发 checkUser）
  useEffect(() => {
    ;(async () => {
      const customTokenExists = !!localStorage.getItem('custom_auth_token')
      const legacyTokenExists = !!localStorage.getItem('access_token')
      if ((customTokenExists || legacyTokenExists) && !user && !loading) {
        try { await checkUser() } catch {}
      }
    })()
  }, [user, loading, checkUser])

  // 自动填充联系人（与 Web 同步）
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        contactPhone: user.phone || prev.contactPhone,
        contactEmail: user.email || prev.contactEmail,
      }))
    }
  }, [user])

  const { data: fd, isLoading: isLoadingFilter, loadProvinces, loadDevelopmentZones } = useFilterData()
  const transformed = useMemo(() => transformFilterDataForComponents(fd, locale), [fd, locale])

  // 校验逻辑 — 复用 Web 的字段要求
  const validateStep = (currentStep: number) => {
    const newErrors: Record<string, string> = {}
    if (currentStep === 1) {
      if (!formData.requirement) newErrors.requirement = t('validation.requirementRequired')
      if (!formData.companyName) newErrors.companyName = t('validation.companyNameRequired')
      if (!formData.country) newErrors.country = t('validation.countryRequired')
      if (formData.country === 'china' && !formData.province) newErrors.province = t('validation.provinceRequired')
    } else if (currentStep === 2) {
      if (!formData.companyType) newErrors.companyType = t('validation.companyTypeRequired')
      if (!formData.contactPerson) newErrors.contactPerson = t('validation.contactPersonRequired')
      if (!formData.contactPhone) newErrors.contactPhone = t('validation.contactPhoneRequired')
      if (!formData.contactEmail) newErrors.contactEmail = t('validation.contactEmailRequired')
      if (formData.contactEmail && !isValidEmail(formData.contactEmail)) newErrors.contactEmail = emailError(locale as any)
      if (formData.contactPhone && !isValidPhone(formData.contactPhone, '+86')) newErrors.contactPhone = phoneError(locale as any)
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNextStep = () => { if (validateStep(1)) setStep(2) }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      ...(field === 'country' && value !== 'china' ? { province: '', economicZone: '' } : {}),
      ...(field === 'province' ? { economicZone: '' } : {})
    }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))

    // 如果是手动修改企业名称，清除企查查数据获取状态
    if (field === 'companyName') {
      setQccDataFetched(false)
      if (value && !formData.logoFile) generateLogoPreview(value)
    }

    if (field === 'country') {
      const china = (fd.countries || []).find(c => c.code === 'china')
      if (value === 'china' && china) loadProvinces(china.id)
    }
    if (field === 'province') {
      const p = (fd.provinces || []).find(x => x.code === value)
      if (p) loadDevelopmentZones(p.id)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) { setFormData(prev => ({ ...prev, logoFile: f })); setLogoPreview(null) }
  }

  const generateLogoPreview = async (name: string) => {
    if (!name || name.length < 2) { setLogoPreview(null); return }
    try {
      const dataUrl = await generateCompanyLogo({ companyName: name, size: 128 })
      setLogoPreview(dataUrl)
    } catch { setLogoPreview(null) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateStep(2)) return
    if (!user) { alert(locale==='en'?'Please login first':'请先登录'); return }
    setSubmitLoading(true)
    try {
      // 优先采用用户上传的URL；若无，再按企业名自动生成
      let logoUrl = formData.logoUrl || ''
      if (!logoUrl && !formData.logoFile && formData.companyName) {
        try {
          const resp = await fetch('/api/generate-logo', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ companyName: formData.companyName, size:256 }) })
          const data = await resp.json().catch(()=>({}))
          if (resp.ok && data?.success && data.logoUrl) logoUrl = data.logoUrl
        } catch {}
      }

      const submitData: CompanyProfileData = {
        ...formData,
        province: formData.province || undefined,
        economicZone: formData.economicZone && formData.economicZone !== 'none' ? formData.economicZone : undefined,
        logoFile: formData.logoFile || undefined,
        logoUrl: logoUrl || undefined,
      }
      const res = await submitCompanyProfile(submitData)
      if (res.success) {
        localStorage.setItem('company_name', formData.companyName)
        // 直接跳转，不显示alert避免在返回时出现提示
        router.replace(`/${locale}/m/home`)
      } else {
        alert(res.error || (locale==='en'?'Submit failed':'提交失败'))
      }
    } finally { setSubmitLoading(false) }
  }

  // 加载状态
  if (loading || isLoadingFilter) {
    return <div className="min-h-dvh flex items-center justify-center text-gray-600">{tCommon('loading')}</div>
  }
  // 若本地存在token但还未拿到用户信息，短暂显示加载，避免闪现“请登录”
  if (!user && hasLocalAuth) {
    return <div className="min-h-dvh flex items-center justify-center text-gray-600">{tCommon('loading')}</div>
  }
  if (!user) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center text-center px-6">
        <p className="text-gray-600 mb-4">{locale==='en'?'Please login to continue':'请登录后继续'}</p>
        <button onClick={()=>router.push(`/${locale}/m/login`)} className="h-11 px-5 rounded-xl bg-[#00b899] text-white">{locale==='en'?'Go to Login':'前往登录'}</button>
      </div>
    )
  }

  // H5 视觉：卡片化 + 紧凑输入
  return (
    <section className="px-3 py-3 pb-24" style={{ backgroundColor: '#edeef7' }}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Header section matching web design */}
        <div className="rounded-2xl bg-white p-4 border border-gray-100">
          <h1 className="text-[18px] font-semibold text-gray-900 mb-2">
            {locale==='en'?'Complete Company Information':'企业信息完善'}
          </h1>
          <div className="text-[12px] text-gray-500">
        {locale==='en'
          ?`Complete information to start your green low-carbon journey (Step ${step}/2)`
          :`完善信息，即刻开启绿色低碳之旅 (第 ${step}/2 步)`
        }
          </div>
        </div>

        {step === 1 ? (
          <div className="rounded-2xl bg-white p-3 border border-gray-100">
            {/* 需求目的 */}
            <Field label={t('step1.requirement')} error={errors.requirement}>
              <select value={formData.requirement} onChange={(e)=>handleInputChange('requirement', e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 px-3 bg-white text-[14px]">
                <option value="">{t('step1.selectRequirement')}</option>
                <option value="publishTech">{t('requirements.publishTech')}</option>
                <option value="findTech">{t('requirements.findTech')}</option>
                <option value="industryInsights">{t('requirements.industryInsights')}</option>
                <option value="latestPolicy">{t('requirements.latestPolicy')}</option>
                <option value="parkInfo">{t('requirements.parkInfo')}</option>
              </select>
            </Field>
            {/* 企业名称 + 企查查搜索 */}
            <Field label={t('step1.companyName')} error={errors.companyName}>
              <CompanySearch
                value={formData.companyName}
                onChange={(v)=>handleInputChange('companyName', v)}
                onSelect={(c: CompanySearchResult)=>{
                  setFormData(prev=>({
                    ...prev,
                    companyName: c.name,
                    contactPerson: c.legalRepresentative || prev.contactPerson,
                    address: c.address || prev.address,
                  }))
                  setQccDataFetched(true) // 标记已获取企查查数据
                  if (!formData.logoFile && c.name) generateLogoPreview(c.name)
                }}
                placeholder={locale==='en'?'Enter company name keywords for auto search':'输入企业名称关键词自动搜索匹配'}
                className="mt-0"
                allowCustom
                customLabel={locale==='en' ? 'Custom company name' : '自定义输入企业名称'}
              />
              {qccDataFetched && (
                <div className="mt-1 text-[12px] text-green-600">
                  ✓ {locale==='en'?'Business registration data automatically retrieved':'已自动获取企业工商信息'}
                </div>
              )}
            </Field>
            {/* 按 Web 端规范：仅保留企业名称单一输入，无企查查搜索框 */}

            {/* 国家/省份/经开区 */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-3 mt-2">
              <Field label={t('step1.country')} error={errors.country}>
                <select value={formData.country} onChange={(e)=>handleInputChange('country', e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 px-3 bg-white text-[14px]">
                  <option value="">{t('step1.selectCountry')}</option>
                  {(transformed.countries||[]).map(c => (<option key={c.value} value={c.value}>{c.label}</option>))}
                </select>
              </Field>
              <Field label={t('step1.province')} error={errors.province}>
                <select value={formData.province} onChange={(e)=>handleInputChange('province', e.target.value)} disabled={formData.country!=='china'} className="w-full h-10 rounded-xl border border-gray-200 px-3 bg-white text-[14px]">
                  <option value="">{t('step1.selectProvince')}</option>
                  {(transformed.provinces||[]).map(p => (<option key={p.value} value={p.value}>{p.label}</option>))}
                </select>
              </Field>
            </div>
            <Field label={t('step1.economicZone')}>
              <select value={formData.economicZone} onChange={(e)=>handleInputChange('economicZone', e.target.value)} disabled={!formData.province} className="w-full h-10 rounded-xl border border-gray-200 px-3 bg-white text-[14px]">
                <option value="">{t('step1.selectEconomicZone')}</option>
                <option value="none">{locale==='en'?'Not in national development zone':'不在国家级经开区内'}</option>
                {(transformed.developmentZones||[]).map(z => (<option key={z.value} value={z.value}>{z.label}</option>))}
              </select>
            </Field>

            {/* Logo 上传：与“我的-企业信息”统一，直接上传到 Supabase，获得可持久化URL */}
            <Field label={t('step1.logo')}>
              <div className="space-y-2">
                <I18nCompactImageUpload
                  value={formData.logoUrl}
                  onChange={(url)=>{ setFormData(prev=>({ ...prev, logoUrl: url, logoFile: null })); if (url) setLogoPreview(null) }}
                  bucket="images"
                  folder="company-logos"
                  locale={locale}
                />
                {logoPreview && !formData.logoUrl && (
                  <div className="flex items-start gap-3">
                    <img src={logoPreview} alt="logo" className="w-12 h-12 rounded border flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-[12px] text-gray-600 mb-2">
                        {locale==='en'?'If no image is uploaded, a logo will be generated automatically on submit.':'若未上传图片，提交时将根据企业名称自动生成Logo'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Field>

            <button type="button" onClick={handleNextStep} className="w-full h-10 rounded-xl bg-[#00b899] text-white text-[14px] mt-1">{tCommon('nextStep')}</button>
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-3 border border-gray-100">
            <Field label={t('step2.companyType')} error={errors.companyType}>
              <div className="relative">
                <select value={formData.companyType} onChange={(e)=>handleInputChange('companyType', e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 px-3 bg-white text-[14px] appearance-none">
                  <option value="">{t('step2.selectCompanyType')}</option>
                  {COMPANY_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{locale==='en'? opt.label_en : opt.label_zh}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </Field>
            <Field label={t('step2.address')}>
              <input value={formData.address} onChange={(e)=>handleInputChange('address', e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 px-3 text-[14px]" />
            </Field>
            <div className="grid grid-cols-2 gap-x-2 gap-y-3">
              <Field label={t('step2.industryCode')}>
                <input value={formData.industryCode} onChange={(e)=>handleInputChange('industryCode', e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 px-3 text-[14px]" />
              </Field>
              <Field label={t('step2.annualOutput')}>
                <input type="number" value={formData.annualOutput} onChange={(e)=>handleInputChange('annualOutput', e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 px-3 text-[14px]" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-3">
              <Field label={t('step2.contactPerson')} error={errors.contactPerson}>
                <input value={formData.contactPerson} onChange={(e)=>handleInputChange('contactPerson', e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 px-3 text-[14px]" />
              </Field>
              <Field label={t('step2.contactPhone')} error={errors.contactPhone}>
                <input value={formData.contactPhone} onChange={(e)=>handleInputChange('contactPhone', e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 px-3 text-[14px]" />
              </Field>
            </div>
            <Field label={t('step2.contactEmail')} error={errors.contactEmail}>
              <input type="email" value={formData.contactEmail} onChange={(e)=>handleInputChange('contactEmail', e.target.value)} className="w-full h-10 rounded-xl border border-gray-200 px-3 text-[14px]" />
            </Field>
            <div className="flex items-center gap-2 mt-2">
              <button type="button" onClick={()=>setStep(1)} className="flex-1 h-10 rounded-xl border border-gray-200 bg-white text-[14px]">{tCommon('previousStep')}</button>
              <button type="submit" disabled={submitLoading} className={`flex-1 h-10 rounded-xl text-white text-[14px] ${submitLoading?'bg-gray-300':'bg-[#00b899] hover:opacity-95'}`}>{submitLoading ? tCommon('submitting') : tCommon('complete')}</button>
            </div>
          </div>
        )}
      </form>
    </section>
  )
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <label className="block mb-3">
      <div className="mb-1.5 text-[12px] text-gray-600">{label}</div>
      {children}
      {error ? <div className="mt-1 text-[12px] text-red-500">{error}</div> : null}
    </label>
  )
}
