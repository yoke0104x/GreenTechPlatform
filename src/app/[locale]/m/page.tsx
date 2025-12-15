'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ArrowRight, Cpu, Building2, ScrollText, ChevronRight, User } from 'lucide-react'
import { LanguageSwitcher } from '@/components/common/language-switcher'
import { getSearchStats } from '@/api/tech'
import { getParks } from '@/api/parks'
import { getPolicyList } from '@/api/policy'
import { getUserCompanyInfo } from '@/api/company'
import { useAuthContext } from '@/components/auth/auth-provider'

export default function MobilePortalPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const isEn = locale === 'en'
  const router = useRouter()
  const { user, loading: authLoading, logout } = useAuthContext()

  const [techCount, setTechCount] = useState<number | null>(null)
  const [parkCount, setParkCount] = useState<number | null>(null)
  const [policyCount, setPolicyCount] = useState<number | null>(null)
  const [company, setCompany] = useState<{ name: string; logoUrl?: string } | null>(null)
  const [companyLoading, setCompanyLoading] = useState(false)
  const displayName =
    user?.name ||
    user?.email ||
    user?.phone ||
    company?.name ||
    (user ? (isEn ? 'User' : '用户') : '')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        // 技术总数
        const statsResp = await getSearchStats({})
        if (!cancelled && statsResp.success && statsResp.data) {
          setTechCount(statsResp.data.technologyCount)
        }
      } catch (e) {
        if (!cancelled) setTechCount(null)
      }
      try {
        // 园区总数：请求第一页，pageSize=1，仅取 total
        const parksResp = await getParks({ page: 1, pageSize: 1, sortBy: 'default' })
        if (!cancelled) {
          setParkCount(parksResp.total ?? null)
        }
      } catch {
        if (!cancelled) setParkCount(null)
      }
      try {
        // 政策总数：请求第一页，pageSize=1，仅取 total
        const policiesResp = await getPolicyList({
          page: 1,
          pageSize: 1,
          sortBy: 'publishDateDesc',
        })
        if (!cancelled && policiesResp.success && policiesResp.data) {
          setPolicyCount(policiesResp.data.total ?? null)
        }
      } catch {
        if (!cancelled) setPolicyCount(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // 加载用户企业信息，用于顶部欢迎区
  useEffect(() => {
    let cancelled = false
    if (!user) {
      setCompany(null)
      setCompanyLoading(false)
      return
    }
    setCompanyLoading(true)
    ;(async () => {
      try {
        const resp = await getUserCompanyInfo()
        if (cancelled) return
        if (resp.success && resp.data) {
          const data = resp.data
          const name =
            data.name_zh ||
            data.name_en ||
            data.name ||
            user.company_name ||
            user.name ||
            ''
          setCompany({
            name,
            logoUrl: data.logo_url || undefined,
          })
        } else {
          setCompany(null)
        }
      } catch {
        if (!cancelled) setCompany(null)
      } finally {
        if (!cancelled) setCompanyLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  const cards = [
    {
      key: 'tech',
      href: `/${locale}/m/home`,
      title: isEn ? 'Green Tech Platform' : '绿色技术平台',
      count: techCount,
      suffix: isEn ? ' green technologies' : ' 项绿色技术',
      Icon: Cpu,
      image: '/images/portal-tech.jpg',
    },
    {
      key: 'parks',
      href: `/${locale}/m/parks`,
      title: isEn ? 'Green Parks Platform' : '绿色园区平台',
      count: parkCount,
      suffix: isEn ? ' green parks' : ' 个绿色园区',
      Icon: Building2,
      image: '/images/green-parks.jpg',
    },
    {
      key: 'policy',
      href: `/${locale}/m/policy`,
      title: isEn ? 'Green Policy Platform' : '绿色政策平台',
      count: policyCount,
      suffix: isEn ? ' green policies' : ' 项绿色政策',
      Icon: ScrollText,
      image: '/images/climatepolicy.jpg',
    },
  ]

  return (
    <section className="min-h-dvh flex flex-col" style={{ backgroundColor: '#edeef7' }}>
      {/* 顶部欢迎区：企业 logo + 欢迎文案 + 语言切换 */}
      <div
        className="px-3 pt-2 pb-2 sticky z-40 bg-white shadow-sm"
        style={{ top: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center">
              {company?.logoUrl ? (
                <Image
                  src={company.logoUrl}
                  alt={company.name}
                  fill
                  className="object-cover"
                  sizes="48px"
                  priority
                />
              ) : (
                <User className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] text-gray-500">
                {user ? (isEn ? 'Welcome back!' : '欢迎回来！') : isEn ? 'Not logged in' : '未登录'}
              </span>
              {user ? (
                <span className="text-[15px] font-semibold text-gray-900 truncate">
                  {displayName ||
                    (companyLoading
                      ? isEn
                        ? 'Loading...'
                        : '加载中...'
                      : isEn
                        ? 'User'
                        : '用户')}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push(`/${locale}/m/login`)}
                  className="inline-flex items-center gap-1 text-[14px] font-medium text-[#2563eb] active:scale-95"
                >
                  {isEn ? 'Go to login' : '去登录'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <LanguageSwitcher className="text-[11px]" hideIcon />
        </div>
      </div>

      {/* 三个入口卡片 */}
      <div className="px-3 pt-2 pb-4 space-y-3 max-w-md mx-auto flex-1 w-full">
        <div className="w-full flex justify-center pb-0">
          <div className="relative w-full max-w-[240px] aspect-[16/5]">
            <Image
              src="/images/logo/图片1.png"
              alt={isEn ? 'Green Tech Platform' : '绿色技术平台'}
              fill
              className="object-contain"
              sizes="(max-width: 640px) 100vw, 240px"
              priority
            />
          </div>
        </div>
        {cards.map((card) => (
          <div
            key={card.key}
            className="relative rounded-2xl bg-white border border-[#e5f2ec] shadow-sm overflow-hidden"
          >
            <Link
              href={card.href}
              className="absolute inset-0 z-10"
              aria-label={card.title}
            />
            <div className="relative flex items-center gap-3 min-h-[96px]">
              {card.image && (
                <div className="absolute inset-y-0 right-0 w-1/2 overflow-hidden pointer-events-none">
                  <div className="relative w-full h-full">
                    {/* 实际图片，紧贴卡片上下右侧边缘 */}
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${card.image})` }}
                    />
                    {/* 左侧渐变虚化，向右逐渐透明，避免干扰文字 */}
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          'linear-gradient(90deg, #ffffff 0%, rgba(255,255,255,0.5) 30%, transparent 100%)',
                      }}
                    />
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 relative z-[1] px-4 py-3">
                <div className="w-12 h-12 rounded-full bg-[#e6f7f0] flex items-center justify-center">
                  <card.Icon className="w-6 h-6 text-[#00b899]" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="text-[14px] font-semibold text-gray-900">
                    {card.title}
                  </div>
                  <div
                    className={`mt-1 inline-flex items-center rounded-lg px-2 h-6 text-[11px] ${
                      card.key === 'parks'
                        ? 'bg-emerald-50 text-emerald-700'
                        : card.key === 'tech'
                          ? 'bg-[#eef2ff] text-[#4b50d4]'
                          : 'bg-[#fff7ed] text-[#d97706]'
                    }`}
                  >
                    {typeof card.count === 'number' ? (
                      <span className="truncate max-w-[180px]">
                        <span className="font-semibold">{card.count}</span>
                        <span>{card.suffix}</span>
                      </span>
                    ) : (
                      <span className="truncate max-w-[180px]">
                        {isEn ? 'Loading...' : '加载中...'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-gray-600 shadow-sm flex items-center justify-center pointer-events-none">
                <ArrowRight className="w-4 h-4" strokeWidth={2.2} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-3 pb-6 text-center text-[11px] text-gray-400">
        {user ? (
          <div className="mb-6 text-[12px]">
            <button
              type="button"
              onClick={async () => {
                await logout()
                router.push(`/${locale}/m/login`)
              }}
              className="text-[#6b6ee2] underline"
            >
              {isEn ? 'Log out' : '退出登录'}
            </button>
          </div>
        ) : null}
        © {new Date().getFullYear()} — Green Tech Platform
      </div>
    </section>
  )
}
