'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Cpu, Building2, ScrollText } from 'lucide-react'
import { LanguageSwitcher } from '@/components/common/language-switcher'
import { getSearchStats } from '@/api/tech'
import { getParks } from '@/api/parks'
import { getPolicyList } from '@/api/policy'

export default function MobilePortalPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const isEn = locale === 'en'

  const [techCount, setTechCount] = useState<number | null>(null)
  const [parkCount, setParkCount] = useState<number | null>(null)
  const [policyCount, setPolicyCount] = useState<number | null>(null)

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
      {/* 顶部与园区首页一致：logo + 语言切换 */}
      <div
        className="px-3 pt-1 pb-0 sticky z-40 bg-white shadow-sm"
        style={{ top: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative w-56 h-14">
              <Image
                src="/images/logo/图片1.png"
                alt="绿盟logo"
                fill
                className="object-contain"
                sizes="240px"
                priority
              />
            </div>
          </div>
          <LanguageSwitcher className="text-[11px]" hideIcon />
        </div>
      </div>

      {/* 三个入口卡片 */}
      <div className="px-3 pt-4 pb-6 space-y-3 max-w-md mx-auto flex-1 w-full">
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
        © {new Date().getFullYear()} — Green Tech Platform
      </div>
    </section>
  )
}
