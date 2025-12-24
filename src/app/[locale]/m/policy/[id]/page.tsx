'use client'

import { useEffect, useState, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink, Heart, Loader2, Share2, Phone } from 'lucide-react'
import { useLoadingOverlay } from '@/components/common/loading-overlay'
import {
  getPolicyDetail,
  getPolicyFavoriteStatus,
  addPolicyFavorite,
  removePolicyFavorite,
  type PolicyDetail,
} from '@/api/policy'
import { MobileContactUsModal } from '@/app/[locale]/m/components/MobileContactUsModal'
import { useAuthContext } from '@/components/auth/auth-provider'

export default function MobilePolicyDetailPage({
  params: { id },
}: {
  params: { id: string }
}) {
  const pathname = usePathname()
  const router = useRouter()
  const locale = pathname.startsWith('/en') ? 'en' : 'zh'
  const isEn = locale === 'en'
  const { showLoading, hideLoading } = useLoadingOverlay()
  const { user } = useAuthContext()

  const [policy, setPolicy] = useState<PolicyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const issuers = useMemo(() => {
    if (!policy?.issuer) return []
    return policy.issuer
      .split(/[，,、;；|]/)
      .map((s) => s.trim())
      .filter(Boolean)
  }, [policy])

  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      showLoading()
      try {
        const [detailRes, favRes] = await Promise.all([
          getPolicyDetail(id),
          getPolicyFavoriteStatus(id),
        ])
        if (!alive) return
        if (detailRes.success && detailRes.data) {
          setPolicy(detailRes.data)
        } else {
          setPolicy(null)
        }
        if (favRes && typeof favRes.isFavorited === 'boolean') {
          setIsFavorited(favRes.isFavorited)
        }
      } finally {
        if (alive) setLoading(false)
        hideLoading()
      }
    }
    load()
    return () => {
      alive = false
      hideLoading()
    }
  }, [id, hideLoading, showLoading])

  // 检查登录状态并提示（复用园区详情页逻辑）
  const checkAuthAndPrompt = () => {
    if (!user) {
      const message = isEn ? 'Please register or login to continue' : '请注册登录后继续操作'
      if (confirm(message)) {
        router.push(`/${locale}/m/login`)
      }
      return false
    }
    return true
  }

  const handleToggleFavorite = async () => {
    if (!policy || favoriteLoading) return
    setFavoriteLoading(true)
    try {
      if (isFavorited) {
        const ok = await removePolicyFavorite(policy.id)
        if (ok) setIsFavorited(false)
      } else {
        const res = await addPolicyFavorite(policy.id)
        if (res) setIsFavorited(true)
      }
    } catch (error) {
      console.error('政策收藏操作失败:', error)
    } finally {
      setFavoriteLoading(false)
    }
  }

  const handleBackNavigation = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(`/${locale}/m/policy`)
  }

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: policy?.name,
          text: policy?.name,
          url: typeof window !== 'undefined' ? window.location.href : '',
        })
      } catch (error) {
        console.warn('分享失败:', error)
      }
    } else {
      alert(locale === 'en' ? 'Sharing is not supported on this device.' : '当前设备不支持分享')
    }
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-[13px] text-gray-500">
        {locale === 'en' ? 'Loading policy...' : '正在加载政策详情...'}
      </div>
    )
  }

  if (!policy) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center text-center px-6">
        <p className="text-[14px] text-gray-700 mb-2">
          {locale === 'en' ? 'Policy not found' : '未找到该政策'}
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 h-9 rounded-full bg-[#00b899] text-white text-[13px]"
        >
          {locale === 'en' ? 'Back' : '返回'}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-dvh pb-[120px]" style={{ backgroundColor: '#edeef7' }}>
      <div className="px-3 pt-4">
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleBackNavigation}
            aria-label={locale === 'en' ? 'Back' : '返回'}
            className="w-8 h-8 rounded-full bg-white text-gray-700 inline-flex items-center justify-center shadow-sm border border-gray-100 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-[16px] font-semibold text-gray-900">
            {locale === 'en' ? 'Policy detail' : '政策详情'}
          </h1>
        </div>

        <article className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm space-y-4">
          {/* Title + favorite */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-[16px] font-semibold text-gray-900 leading-snug">
                {policy.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleToggleFavorite}
              disabled={favoriteLoading}
              className={`shrink-0 w-9 h-9 rounded-full border flex items-center justify-center ${
                isFavorited
                  ? 'border-rose-200 bg-rose-50 text-rose-500'
                  : 'border-gray-200 bg-gray-50 text-gray-500'
              }`}
            >
              {favoriteLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Heart
                  className={`w-4 h-4 ${
                    isFavorited ? 'fill-current' : 'fill-transparent'
                  }`}
                />
              )}
            </button>
          </div>

          {/* 政策信息 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-4 bg-[#00b899]" />
              <h3 className="text-[13px] font-semibold text-gray-900">
                {locale === 'en' ? 'Policy Info' : '政策信息'}
              </h3>
            </div>
            <div className="mt-1 space-y-3 text-[12px] text-gray-700 pl-3 text-left">
              {issuers.length > 0 && (
                <div className="flex flex-wrap items-start gap-2">
                  <span className="text-gray-500 w-16 text-right shrink-0 leading-6">
                    {locale === 'en' ? 'Issuer' : '发布机构'}：
                  </span>
                  <span className="inline-flex flex-wrap gap-2 align-middle">
                    {issuers.map((it, idx) => (
                      <span
                        key={`${policy.id}-issuer-${idx}`}
                        className="px-2 h-6 inline-flex items-center rounded-lg bg-gray-100 text-gray-700 text-[11px]"
                      >
                        {it}
                      </span>
                    ))}
                  </span>
                </div>
              )}

              {policy.docNumber && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-16 text-right shrink-0 leading-6">
                    {locale === 'en' ? 'Document No.' : '发文字号'}：
                  </span>
                  <span className="text-[13px] text-gray-900">{policy.docNumber}</span>
                </div>
              )}

              {policy.publishDate && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-16 text-right shrink-0 leading-6">
                    {locale === 'en' ? 'Publish date' : '发布日期'}：
                  </span>
                  <span className="text-[13px] text-gray-900">{policy.publishDate}</span>
                </div>
              )}

              {policy.effectiveDate && (
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-16 text-right shrink-0 leading-6">
                    {locale === 'en' ? 'Effective date' : '实施日期'}：
                  </span>
                  <span className="text-[13px] text-gray-900">{policy.effectiveDate}</span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-16 text-right shrink-0 leading-6">
                  {locale === 'en' ? 'Policy level' : '政策级别'}：
                </span>
                <span className="px-2 h-6 inline-flex items-center rounded-lg bg-gray-100 text-gray-700 text-[11px]">
                  {policy.level === 'national'
                    ? locale === 'en'
                      ? 'Central'
                      : '中央政策'
                    : policy.level === 'ministry'
                      ? locale === 'en'
                        ? 'Ministry'
                        : '部委政策'
                      : policy.level === 'local'
                        ? locale === 'en'
                          ? 'Local'
                          : '地方政策'
                        : locale === 'en'
                          ? 'Park'
                          : '园区政策'}
                </span>
              </div>

              {(policy.level === 'local' || policy.level === 'park') && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 w-16 text-right shrink-0 leading-6">
                    {locale === 'en' ? 'Region' : '省市地区'}：
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {policy.province && (
                      <span className="px-2 h-6 inline-flex items-center rounded-lg text-[11px] bg-gray-100 text-gray-700">
                        {policy.province.name}
                      </span>
                    )}
                    {policy.developmentZone && (
                      <span className="px-2 h-6 inline-flex items-center rounded-lg text-[11px] bg-gray-100 text-gray-700">
                        {policy.developmentZone.name}
                      </span>
                    )}
                    {!policy.province && !policy.developmentZone && (
                      <span className="text-[11px] text-gray-500 leading-6">
                        {locale === 'en' ? 'Not specified' : '未设置'}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {policy.tags && policy.tags.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 w-16 text-right shrink-0 leading-6">
                    {locale === 'en' ? 'Policy tags' : '政策标签'}：
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {policy.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 h-6 inline-flex items-center rounded-lg border border-[#bfdbfe] text-[#2f6fde] bg-white text-[11px]"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 政策摘要 */}
          {policy.summary && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-[#00b899]" />
                <h3 className="text-[13px] font-semibold text-gray-900">
                  {locale === 'en' ? 'Policy Summary' : '政策摘要'}
                </h3>
              </div>
              <p className="pl-3 text-[12px] text-gray-700 leading-relaxed whitespace-pre-line">
                {policy.summary}
              </p>
            </div>
          )}

          {/* 政策原文链接 */}
          {policy.sourceUrl && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-4 bg-[#00b899]" />
                <h3 className="text-[13px] font-semibold text-gray-900">
                  {locale === 'en' ? 'Original Policy' : '政策原文链接'}
                </h3>
              </div>
              <div className="pl-3">
                <button
                  type="button"
                  onClick={() => {
                    if (policy.sourceUrl) {
                      if (policy.sourceUrl.startsWith('http')) {
                        window.open(policy.sourceUrl, '_blank')
                      } else {
                        window.open(`https://${policy.sourceUrl}`, '_blank')
                      }
                    }
                  }}
                  className="inline-flex items-center gap-1 px-3 h-9 rounded-full bg-[#0ea5e9]/10 text-[#0369a1] text-[12px]"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>
                    {locale === 'en'
                      ? 'View full text'
                      : '查看政策原文（外部链接）'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </article>
      </div>

      {/* Bottom action bar */}
      <div className="fixed left-0 right-0 bottom-0 z-50 bg-white border-t">
        <div
          className="mx-auto max-w-md px-3"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)', paddingTop: 8 }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={handleBackNavigation}
              className="h-10 w-10 rounded-full bg-white border border-gray-200 text-gray-800 inline-flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="grid grid-cols-3 gap-2 flex-1">
              <button
                onClick={handleToggleFavorite}
                disabled={favoriteLoading}
                className={`h-10 rounded-xl border text-[13px] inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                  isFavorited
                    ? 'bg-rose-50 border-rose-200 text-rose-600'
                    : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50'
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${isFavorited ? 'fill-current stroke-current' : 'stroke-current'}`}
                />
                <span>{isFavorited ? (locale === 'en' ? 'Favorited' : '已收藏') : (locale === 'en' ? 'Favorite' : '收藏')}</span>
              </button>
              <button
                onClick={handleShare}
                className="h-10 rounded-xl bg-white border border-gray-200 text-gray-800 text-[13px] inline-flex items-center justify-center gap-1.5 transition-none"
              >
                <Share2 className="w-4 h-4" />
                <span>{locale === 'en' ? 'Share' : '分享'}</span>
              </button>
              <button
                onClick={() => {
                  if (checkAuthAndPrompt()) {
                    setContactOpen(true)
                  }
                }}
                className="h-10 rounded-xl bg-[#00b899] hover:bg-[#009a7a] text-white text-[13px] inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <Phone className="w-4 h-4" />
                <span>{locale === 'en' ? 'Contact' : '联系咨询'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* 联系我们弹窗：政策咨询 */}
      <MobileContactUsModal
        isOpen={contactOpen}
        onClose={() => setContactOpen(false)}
        technologyId={policy.id}
        technologyName={policy.name}
        locale={locale}
        category="政策咨询"
        source="policy"
      />
    </div>
  )
}
