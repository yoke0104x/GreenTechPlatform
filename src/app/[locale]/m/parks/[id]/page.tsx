"use client"

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Heart, Loader2, Share2, Bell, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { useLoadingOverlay } from '@/components/common/loading-overlay'
import {
  getParkDetail,
  getParkPolicies,
  getParkFavoriteStatus,
  addParkFavorite,
  removeParkFavorite,
  type ParkDetail,
  type ParkPolicyItem,
} from '@/api/parks'

type TabKey = 'basic' | 'stats' | 'policies' | 'companies' | 'news'

export default function MobileParkDetailPage({
  params: { id },
}: {
  params: { id: string }
}) {
  const pathname = usePathname()
  const router = useRouter()
  const locale = pathname.startsWith('/en') ? 'en' : 'zh'
  const isEn = locale === 'en'
  const { showLoading, hideLoading } = useLoadingOverlay()

  const [park, setPark] = useState<ParkDetail | null>(null)
  const [loading, setLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<TabKey>('basic')

  const [policies, setPolicies] = useState<ParkPolicyItem[]>([])
  const [policiesPage, setPoliciesPage] = useState(1)
  const [policiesTotal, setPoliciesTotal] = useState(0)
  const [policiesLoading, setPoliciesLoading] = useState(false)

  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [showMoreInfo, setShowMoreInfo] = useState(false)

  useEffect(() => {
    let alive = true
    const load = async () => {
      setLoading(true)
      showLoading()
      try {
        const [detail, favStatus] = await Promise.all([
          getParkDetail(id),
          getParkFavoriteStatus(id),
        ])
        if (!alive) return
        setPark(detail)
        setIsFavorited(favStatus.isFavorited)
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

  const handleBackNavigation = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(`/${locale}/m/parks`)
  }

  const handleToggleFavorite = async () => {
    if (!park || favoriteLoading) return
    setFavoriteLoading(true)
    try {
      if (isFavorited) {
        const ok = await removeParkFavorite(park.id)
        if (ok) setIsFavorited(false)
      } else {
        const ok = await addParkFavorite(park.id)
        if (ok) setIsFavorited(true)
      }
    } catch (error) {
      console.error('园区收藏操作失败:', error)
    } finally {
      setFavoriteLoading(false)
    }
  }

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: park?.name,
          text: park?.name,
          url: typeof window !== 'undefined' ? window.location.href : '',
        })
      } catch (error) {
        console.warn('分享失败:', error)
      }
    } else {
      alert(isEn ? 'Sharing is not supported on this device.' : '当前设备不支持分享')
    }
  }

  const handleSubscribe = () => {
    alert(isEn ? 'Subscribed successfully' : '已订阅该园区最新动态')
  }

  const loadPolicies = async (reset = true) => {
    if (!park) return
    if (policiesLoading && !reset) return
    const nextPage = reset ? 1 : policiesPage + 1
    setPoliciesLoading(true)
    try {
      const res = await getParkPolicies({
        parkId: park.id,
        sortBy: 'publishDateDesc',
        page: nextPage,
        pageSize: 10,
      })
      setPolicies((prev) => (reset ? res.items : [...prev, ...res.items]))
      setPoliciesPage(res.page)
      setPoliciesTotal(res.total)
    } catch (error) {
      console.error('加载园区政策失败:', error)
    } finally {
      setPoliciesLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'policies') {
      loadPolicies(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, park?.id])

  const canLoadMorePolicies = policies.length < policiesTotal

  const basicInfoExtra = useMemo(() => {
    if (!park) return []
    const extras: { label: string; value?: string | null }[] = [
      { label: isEn ? 'Alias' : '别名', value: park.alias },
      { label: isEn ? 'Dialect' : '方言', value: park.dialect },
      { label: isEn ? 'Climate' : '气候条件', value: park.climate },
      { label: isEn ? 'Region' : '所属地区', value: park.regionDesc },
      { label: isEn ? 'Nearby airports' : '附近机场', value: park.nearbyAirports },
      { label: isEn ? 'Nearby stations' : '火车站', value: park.nearbyRailwayStations },
      { label: isEn ? 'Scenic spots' : '著名景点', value: park.famousScenicSpots },
      { label: isEn ? 'Plate code' : '车牌代码', value: park.licensePlateCode },
      { label: isEn ? 'Phone code' : '电话区号', value: park.phoneAreaCode },
      { label: isEn ? 'Postal code' : '邮政编码', value: park.postalCode },
    ]
    return extras.filter((e) => e.value)
  }, [park, isEn])

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-[13px] text-gray-500">
        {isEn ? 'Loading park...' : '正在加载园区详情...'}
      </div>
    )
  }

  if (!park) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center text-center px-6">
        <p className="text-[14px] text-gray-700 mb-2">
          {isEn ? 'Park not found' : '未找到该园区'}
        </p>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 h-9 rounded-full bg-[#00b899] text-white text-[13px]"
        >
          {isEn ? 'Back' : '返回'}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-dvh pb-[120px]" style={{ backgroundColor: '#edeef7' }}>
      <div className="px-3 pt-4">
        {/* 顶部返回 + 标题 */}
        <div className="mb-3 flex items-center gap-2">
          <button
            type="button"
            onClick={handleBackNavigation}
            aria-label={isEn ? 'Back' : '返回'}
            className="w-8 h-8 rounded-full bg-white text-gray-700 inline-flex items-center justify-center shadow-sm border border-gray-100 active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-[16px] font-semibold text-gray-900">
            {isEn ? 'Park Detail' : '园区详情'}
          </h1>
        </div>

        {/* Header 区域：logo + 名称 */}
        <div className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm mb-3 flex items-center gap-3">
          <div className="w-[64px] h-[64px] rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
            {park.logoUrl ? (
              <Image
                src={park.logoUrl}
                alt={park.name}
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[11px] text-gray-400">
                {isEn ? 'No Logo' : '暂无Logo'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[16px] font-semibold text-gray-900 leading-snug line-clamp-2">
              {park.name}
            </h2>
            {park.level && (
              <div className="mt-1 inline-flex items-center px-2 h-6 rounded-full bg-emerald-50 text-emerald-700 text-[11px] border border-emerald-100">
                {park.level}
              </div>
            )}
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="rounded-2xl bg-white border border-gray-100 p-1 flex items-center justify-between mb-3">
          {([
            { key: 'basic', zh: '基本信息', en: 'Basic Info' },
            { key: 'stats', zh: '统计数据', en: 'Statistics' },
            { key: 'policies', zh: '园区政策', en: 'Policies' },
            { key: 'companies', zh: '入驻企业', en: 'Companies' },
            { key: 'news', zh: '资讯动态', en: 'News' },
          ] as { key: TabKey; zh: string; en: string }[]).map((tab) => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 h-8 rounded-xl text-[12px] ${
                  active
                    ? 'bg-[#00b899] text-white font-medium shadow-sm'
                    : 'text-gray-700'
                }`}
              >
                {isEn ? tab.en : tab.zh}
              </button>
            )
          })}
        </div>

        {/* 内容区域 */}
        <div className="space-y-3">
          {/* 基本信息 */}
          {activeTab === 'basic' && (
            <section className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm space-y-4">
              {/* 基本字段 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-1.5 h-4 bg-[#00b899]" />
                  <h3 className="text-[13px] font-semibold text-gray-900">
                    {isEn ? 'Basic Information' : '基本信息'}
                  </h3>
                </div>
                <div className="space-y-2 text-[12px] text-gray-700">
                  <div className="flex">
                    <span className="w-20 text-gray-500 shrink-0">
                      {isEn ? 'Chinese name' : '中文名称'}：
                    </span>
                    <span className="flex-1 text-gray-900">{park.name}</span>
                  </div>
                  {park.nameEn && (
                    <div className="flex">
                      <span className="w-20 text-gray-500 shrink-0">
                        {isEn ? 'English name' : '英文名称'}：
                      </span>
                      <span className="flex-1 text-gray-900">{park.nameEn}</span>
                    </div>
                  )}
                  {park.province && (
                    <div className="flex">
                      <span className="w-20 text-gray-500 shrink-0">
                        {isEn ? 'Province / City' : '所在省市'}：
                      </span>
                      <span className="flex-1 text-gray-900">
                        {park.province.name}
                        {park.city ? ` · ${park.city}` : ''}
                      </span>
                    </div>
                  )}
                  {park.address && (
                    <div className="flex">
                      <span className="w-20 text-gray-500 shrink-0">
                        {isEn ? 'Address' : '地址'}：
                      </span>
                      <span className="flex-1 text-gray-900">{park.address}</span>
                    </div>
                  )}
                  {park.areaKm2 != null && (
                    <div className="flex">
                      <span className="w-20 text-gray-500 shrink-0">
                        {isEn ? 'Area' : '面积'}：
                      </span>
                      <span className="flex-1 text-gray-900">
                        {park.areaKm2} {isEn ? 'km²' : '平方公里'}
                      </span>
                    </div>
                  )}
                  {park.population != null && (
                    <div className="flex">
                      <span className="w-20 text-gray-500 shrink-0">
                        {isEn ? 'Population' : '人口'}：
                      </span>
                      <span className="flex-1 text-gray-900">
                        {(park.population / 10000).toFixed(2)} {isEn ? 'million people' : '万人'}
                      </span>
                    </div>
                  )}
                  {park.establishedDate && (
                    <div className="flex">
                      <span className="w-20 text-gray-500 shrink-0">
                        {isEn ? 'Established' : '成立时间'}：
                      </span>
                      <span className="flex-1 text-gray-900">{park.establishedDate}</span>
                    </div>
                  )}
                  {park.leadingIndustries && (
                    <div className="flex">
                      <span className="w-20 text-gray-500 shrink-0">
                        {isEn ? 'Leading industries' : '主导产业'}：
                      </span>
                      <span className="flex-1 text-gray-900">{park.leadingIndustries}</span>
                    </div>
                  )}
                  {park.leadingCompanies && (
                    <div className="flex">
                      <span className="w-20 text-gray-500 shrink-0">
                        {isEn ? 'Leading companies' : '龙头企业'}：
                      </span>
                      <span className="flex-1 text-gray-900">{park.leadingCompanies}</span>
                    </div>
                  )}
                  {park.websiteUrl && (
                    <div className="flex">
                      <span className="w-20 text-gray-500 shrink-0">
                        {isEn ? 'Website' : '官网地址'}：
                      </span>
                      <a
                        href={
                          park.websiteUrl.startsWith('http')
                            ? park.websiteUrl
                            : `https://${park.websiteUrl}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 text-[#0369a1] underline break-all"
                      >
                        {park.websiteUrl}
                      </a>
                    </div>
                  )}
                  {park.wechatOfficialAccount && (
                    <div className="flex">
                      <span className="w-20 text-gray-500 shrink-0">
                        {isEn ? 'WeChat OA' : '微信公众号'}：
                      </span>
                      <span className="flex-1 text-gray-900">{park.wechatOfficialAccount}</span>
                    </div>
                  )}
                  {basicInfoExtra.length > 0 && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowMoreInfo((v) => !v)}
                        className="flex items-center gap-1 text-[12px] text-[#00b899]"
                      >
                        {showMoreInfo ? (
                          <>
                            {isEn ? 'Hide details' : '收起更多'}
                            <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            {isEn ? 'View more' : '查看更多'}
                            <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                      {showMoreInfo && (
                        <div className="mt-2 space-y-1.5 text-[12px] text-gray-700">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-1.5 h-4 bg-[#00b899]" />
                            <h4 className="text-[13px] font-semibold text-gray-900">
                              {isEn ? 'More Info' : '更多信息'}
                            </h4>
                          </div>
                          {basicInfoExtra.map((item) => (
                            <div key={item.label} className="flex">
                              <span className="w-20 text-gray-500 shrink-0">
                                {item.label}：
                              </span>
                              <span className="flex-1 text-gray-900">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 园区简介 */}
              {(park.briefZh || park.briefEn) && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-4 bg-[#00b899]" />
                    <h3 className="text-[13px] font-semibold text-gray-900">
                      {isEn ? 'Introduction' : '园区简介'}
                    </h3>
                  </div>
                  <p className="text-[12px] text-gray-700 leading-relaxed whitespace-pre-line">
                    {park.briefZh || park.briefEn}
                  </p>
                </div>
              )}

              {/* 品牌与荣誉 */}
              {park.brandHonors && park.brandHonors.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-4 bg-[#00b899]" />
                    <h3 className="text-[13px] font-semibold text-gray-900">
                      {isEn ? 'Brand & Honors' : '品牌与荣誉'}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {park.brandHonors.map((h, idx) => (
                      <span
                        key={`${h}-${idx}`}
                        className="px-2 h-6 inline-flex items-center rounded-full bg-amber-50 text-amber-700 text-[11px] border border-amber-100"
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 统计数据 */}
          {activeTab === 'stats' && (
            <section className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-4 bg-[#00b899]" />
                <h3 className="text-[13px] font-semibold text-gray-900">
                  {isEn ? 'Economic Indicators' : '经济数据'}
                </h3>
              </div>
              {park.economicStats.length === 0 ? (
                <p className="text-[12px] text-gray-500">
                  {isEn ? 'No economic data yet.' : '暂未维护经济数据。'}
                </p>
              ) : (
                <div className="space-y-3">
                  {park.economicStats.map((row) => (
                    <div
                      key={row.year}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                    >
                      <div className="text-[12px] font-semibold text-gray-900 mb-1">
                        {row.year}
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-gray-700">
                        {row.gdpBillion != null && (
                          <div>
                            {isEn ? 'GDP' : 'GDP'}：{row.gdpBillion}
                            {isEn ? ' bn RMB' : ' 亿元'}
                          </div>
                        )}
                        {row.taxRevenueBillion != null && (
                          <div>
                            {isEn ? 'Tax revenue' : '税收收入'}：{row.taxRevenueBillion}
                            {isEn ? ' bn RMB' : ' 亿元'}
                          </div>
                        )}
                        {row.industrialOutputBillion != null && (
                          <div>
                            {isEn ? 'Industrial output' : '工业总产值'}：
                            {row.industrialOutputBillion}
                            {isEn ? ' bn RMB' : ' 亿元'}
                          </div>
                        )}
                        {row.fixedAssetInvestmentBillion != null && (
                          <div>
                            {isEn ? 'Fixed asset investment' : '固定资产投资'}：
                            {row.fixedAssetInvestmentBillion}
                            {isEn ? ' bn RMB' : ' 亿元'}
                          </div>
                        )}
                        {row.utilizedForeignCapitalBillionUsd != null && (
                          <div>
                            {isEn ? 'Utilized FDI' : '实际利用外资'}：
                            {row.utilizedForeignCapitalBillionUsd}
                            {isEn ? ' bn USD' : ' 亿美元'}
                          </div>
                        )}
                        {row.totalImportExportBillionUsd != null && (
                          <div>
                            {isEn ? 'Total import & export' : '进出口总额'}：
                            {row.totalImportExportBillionUsd}
                            {isEn ? ' bn USD' : ' 亿美元'}
                          </div>
                        )}
                        {row.worldTop500Count != null && (
                          <div>
                            {isEn ? 'Fortune 500 companies' : '世界500强企业数'}：
                            {row.worldTop500Count}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-4 bg-[#00b899]" />
                  <h3 className="text-[13px] font-semibold text-gray-900">
                    {isEn ? 'Green & Sustainability' : '绿色与可持续数据'}
                  </h3>
                </div>
                {park.greenStats.length === 0 ? (
                  <p className="text-[12px] text-gray-500">
                    {isEn ? 'Green indicators will be added later.' : '绿色与可持续数据待后续补充。'}
                  </p>
                ) : (
                  <p className="text-[12px] text-gray-500">
                    {isEn
                      ? 'Green metrics are available but not yet visualized on H5.'
                      : '已存储绿色指标数据，后续可根据具体字段做可视化展示。'}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* 园区政策 */}
          {activeTab === 'policies' && (
            <section className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm space-y-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-[#00b899]" />
                  <h3 className="text-[13px] font-semibold text-gray-900">
                    {isEn ? 'Park Policies' : '园区政策'}
                  </h3>
                </div>
                <span className="text-[11px] text-gray-500">
                  {isEn ? 'Total ' : '共 '}
                  <span className="font-semibold text-gray-900">{policiesTotal}</span>
                  {isEn ? '' : ' 条'}
                </span>
              </div>
              {policies.length === 0 ? (
                <p className="text-[12px] text-gray-500">
                  {isEn ? 'No policies for this park yet.' : '该园区暂未关联政策。'}
                </p>
              ) : (
                <div className="space-y-2">
                  {policies.map((p) => (
                    <div
                      key={p.id}
                      className="relative rounded-xl border border-gray-100 bg-slate-50 px-3 py-2 pr-12"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 text-[13px] font-medium text-gray-900 leading-snug line-clamp-2">
                          {p.name}
                        </div>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                        <span>{p.publishDate}</span>
                        {p.docNumber && <span>{p.docNumber}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          router.push(`${locale === 'en' ? '/en' : '/zh'}/m/policy/${p.id}`)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white text-gray-600 inline-flex items-center justify-center active:scale-95"
                        aria-label={isEn ? 'View policy detail' : '查看政策详情'}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {canLoadMorePolicies && (
                    <div className="mt-1 flex justify-center">
                      <button
                        type="button"
                        disabled={policiesLoading}
                        onClick={() => loadPolicies(false)}
                        className="px-4 h-8 rounded-full bg-white border border-gray-200 text-[12px] text-gray-700"
                      >
                        {policiesLoading
                          ? isEn
                            ? 'Loading...'
                            : '加载中...'
                          : isEn
                            ? 'Load more'
                            : '加载更多'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* 入驻企业 / 资讯动态：占位，待后续 API 和数据结构补充 */}
          {activeTab === 'companies' && (
            <section className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-4 bg-[#00b899]" />
                <h3 className="text-[13px] font-semibold text-gray-900">
                  {isEn ? 'Resident Companies' : '入驻企业'}
                </h3>
              </div>
              <p className="text-[12px] text-gray-500">
                {isEn
                  ? 'Company list API and schema will be added later.'
                  : '入驻企业列表的接口和字段将后续补充，本阶段先不在前端造测试数据。'}
              </p>
            </section>
          )}

          {activeTab === 'news' && (
            <section className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-4 bg-[#00b899]" />
                <h3 className="text-[13px] font-semibold text-gray-900">
                  {isEn ? 'News & Updates' : '资讯动态'}
                </h3>
              </div>
              <p className="text-[12px] text-gray-500">
                {isEn
                  ? 'News list API and schema will be added later.'
                  : '园区资讯列表的接口和字段将后续补充，本阶段先不在前端造测试数据。'}
              </p>
            </section>
          )}
        </div>
      </div>

      {/* 底部功能栏：返回 / 收藏 / 分享 / 订阅 */}
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
                {favoriteLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Heart
                    className={`w-4 h-4 ${
                      isFavorited ? 'fill-current stroke-current' : 'stroke-current'
                    }`}
                  />
                )}
                <span>
                  {isFavorited
                    ? isEn
                      ? 'Favorited'
                      : '已收藏'
                    : isEn
                      ? 'Favorite'
                      : '收藏'}
                </span>
              </button>
              <button
                onClick={handleShare}
                className="h-10 rounded-xl bg-white border border-gray-200 text-gray-800 text-[13px] inline-flex items-center justify-center gap-1.5 transition-none"
              >
                <Share2 className="w-4 h-4" />
                <span>{isEn ? 'Share' : '分享'}</span>
              </button>
              <button
                onClick={handleSubscribe}
                className="h-10 rounded-xl bg-[#00b899] hover:bg-[#009a7a] text-white text-[13px] inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <Bell className="w-4 h-4" />
                <span>{isEn ? 'Subscribe' : '订阅'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
