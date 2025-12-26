"use client"

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Search, SlidersHorizontal, ArrowUpDown, ArrowUpAZ, ArrowDownAZ, Clock, ChevronUp, RotateCcw, ChevronRight, Menu } from 'lucide-react'
import { LanguageSwitcher } from '@/components/common/language-switcher'
import Link from 'next/link'
import { useLoadingOverlay } from '@/components/common/loading-overlay'
import { useFilterData, transformFilterDataForComponents } from '@/hooks/admin/use-filter-data'
import { getPublicCarouselApi } from '@/lib/api/public-carousel'
import { type AdminCarouselImage } from '@/lib/types/admin'
import {
  getParks,
  getParkTags,
  type ParkListItem,
  type ParkTag,
} from '@/api/parks'

const PAGE_SIZE = 10

const PARK_LEVEL_OPTIONS: { value: string; labelZh: string; labelEn: string }[] = [
  { value: '', labelZh: '全部', labelEn: 'All' },
  { value: '国家级经济技术开发区', labelZh: '国家级经济技术开发区', labelEn: 'National ETDZ' },
  { value: '国家级高新技术产业开发区', labelZh: '国家级高新技术产业开发区', labelEn: 'National High-Tech Zone' },
  { value: '海关特殊监管区', labelZh: '海关特殊监管区', labelEn: 'Special Customs Supervision' },
  { value: '边境经济合作区', labelZh: '边境经济合作区', labelEn: 'Border Economic Coop Zone' },
  { value: '国家级新区', labelZh: '国家级新区', labelEn: 'National New Area' },
  { value: '国家级自贸区', labelZh: '国家级自贸区', labelEn: 'National FTZ' },
  { value: '国家级自创区', labelZh: '国家级自创区', labelEn: 'National Innovation Zone' },
  { value: '其他国家级园区', labelZh: '其他国家级园区', labelEn: 'Other National Parks' },
  { value: '省级经济技术开发区', labelZh: '省级经济技术开发区', labelEn: 'Provincial ETDZ' },
  { value: '省级高新区', labelZh: '省级高新区', labelEn: 'Provincial High-Tech Zone' },
  { value: '其他园区', labelZh: '其他园区', labelEn: 'Other Parks' },
]

export default function MobileParksHomePage() {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const locale = pathname.startsWith('/en') ? 'en' : 'zh'
  const { showLoading, hideLoading } = useLoadingOverlay()

  // 轮播
  const [carousel, setCarousel] = useState<AdminCarouselImage[]>([])
  const [current, setCurrent] = useState(0)
  const [loadingCarousel, setLoadingCarousel] = useState(true)

  // 筛选 & 搜索
  const [keyword, setKeyword] = useState('')
  const [level, setLevel] = useState<string>('') // 园区级别，自由字符串
  const [selectedProvince, setSelectedProvince] = useState<string>('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [currentSort, setCurrentSort] = useState<'default' | 'updatedAtDesc' | 'nameAsc' | 'nameDesc'>('default')

  // 列表数据
  const [parks, setParks] = useState<ParkListItem[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loadingList, setLoadingList] = useState(false)

  const canLoadMore = parks.length < total

  // 园区标签
  const [parkTags, setParkTags] = useState<ParkTag[]>([])

  // 省份/经开区筛选数据（复用 useFilterData）
  const { data: fd, isLoading: fdLoading, loadProvinces } = useFilterData()
  const transformed = useMemo(
    () => transformFilterDataForComponents(fd, locale),
    [fd, locale],
  )

  // 自动加载中国省份列表
  useEffect(() => {
    if (!fd?.countries?.length) return
    if (fd?.provinces?.length) return
    const china = fd.countries.find(
      (c: any) => c.code === 'china' || c.name_zh === '中国' || c.name_en === 'China',
    )
    if (china?.id) {
      loadProvinces(china.id)
    }
  }, [fd?.countries, fd?.provinces?.length, loadProvinces])

  // 加载园区标签
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const tags = await getParkTags()
        if (!alive) return
        setParkTags(tags)
      } catch (error) {
        console.error('加载园区标签失败:', error)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // 加载轮播（parks 场景）
  useEffect(() => {
    let mounted = true
    showLoading()
    ;(async () => {
      try {
        const list = await getPublicCarouselApi('parks')
        if (!mounted) return
        if (list && list.length) setCarousel(list as AdminCarouselImage[])
        else setCarousel([])
      } catch {
        if (mounted) setCarousel([])
      } finally {
        if (mounted) setLoadingCarousel(false)
        hideLoading()
      }
    })()
    return () => {
      mounted = false
      hideLoading()
    }
  }, [hideLoading, showLoading])

  // 轮播自动播放
  useEffect(() => {
    if (!carousel.length) return
    const timer = setInterval(() => setCurrent((p) => (p + 1) % carousel.length), 6000)
    return () => clearInterval(timer)
  }, [carousel.length])

  const replaceFiltersInUrl = (next?: Partial<{
    q: string
    level: string
    province: string
    tags: string[]
    sort: 'default' | 'updatedAtDesc' | 'nameAsc' | 'nameDesc'
  }>) => {
    const sp = new URLSearchParams()
    const qv = next?.q ?? keyword
    const levelv = next?.level ?? level
    const provincev = next?.province ?? selectedProvince
    const tagsv = next?.tags ?? selectedTags
    const sortv = next?.sort ?? currentSort

    if (qv.trim()) sp.set('q', qv.trim())
    if (levelv) sp.set('level', levelv)
    if (provincev) sp.set('province', provincev)
    if (tagsv.length) sp.set('tags', tagsv.join(','))
    if (sortv && sortv !== 'default') sp.set('sort', sortv)

    const base = `/${locale}/m/parks`
    const qs = sp.toString()
    router.replace(qs ? `${base}?${qs}` : base)
  }

  const loadParks = async (
    resetPage = true,
    overrides?: {
      keyword?: string
      level?: string
      province?: string
      tags?: string[]
      sortBy?: 'default' | 'updatedAtDesc' | 'nameAsc' | 'nameDesc'
    },
  ) => {
    if (loadingList) return
    const nextPage = resetPage ? 1 : page + 1

    const keywordValue = overrides?.keyword ?? keyword
    const levelValue = overrides?.level ?? level
    const provinceValue = overrides?.province ?? selectedProvince
    const tagsValue = overrides?.tags ?? selectedTags
    const sortValue = overrides?.sortBy ?? currentSort

    setLoadingList(true)
    showLoading()
    try {
      const res = await getParks({
        keyword: keywordValue.trim() || undefined,
        level: levelValue || undefined,
        province: provinceValue || undefined,
        tags: tagsValue.length ? tagsValue : undefined,
        sortBy: sortValue,
        page: nextPage,
        pageSize: PAGE_SIZE,
      })
      setTotal(res.total)
      setPage(res.page)
      setParks((prev) => (resetPage ? res.items : [...prev, ...res.items]))
    } catch (error) {
      console.error('加载园区列表失败:', error)
    } finally {
      setLoadingList(false)
      hideLoading()
    }
  }

  // Hydrate filters from URL query (so back from detail preserves state) + initial fetch
  useEffect(() => {
    const qv = searchParams.get('q') ?? ''
    const levelv = searchParams.get('level') ?? ''
    const provincev = searchParams.get('province') ?? ''
    const tagsvRaw = searchParams.get('tags') ?? ''
    const tagsv = tagsvRaw ? tagsvRaw.split(',').filter(Boolean) : []
    const sortv = (searchParams.get('sort') ?? '') as 'default' | 'updatedAtDesc' | 'nameAsc' | 'nameDesc'
    const allowedSorts: Array<'default' | 'updatedAtDesc' | 'nameAsc' | 'nameDesc'> = [
      'default',
      'updatedAtDesc',
      'nameAsc',
      'nameDesc',
    ]

    setKeyword(qv)
    setLevel(levelv)
    setSelectedProvince(provincev)
    setSelectedTags(tagsv)
    setCurrentSort(allowedSorts.includes(sortv) ? sortv : 'default')

    loadParks(true, {
      keyword: qv,
      level: levelv,
      province: provincev,
      tags: tagsv,
      sortBy: allowedSorts.includes(sortv) ? sortv : 'default',
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleProvinceChange = (code: string) => {
    setSelectedProvince(code)
  }

  const isEn = locale === 'en'

  return (
    <section className="min-h-dvh" style={{ backgroundColor: '#edeef7' }}>
      {/* Header */}
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
          <div className="flex items-center gap-2">
            <LanguageSwitcher className="text-[11px]" hideIcon />
            <Link
              href={`/${locale}/m`}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100"
              aria-label={isEn ? 'Portal' : 'Portal入口'}
            >
              <Menu className="w-4 h-4 text-[#00b899]" />
            </Link>
          </div>
        </div>
      </div>

      {/* Carousel */}
      <div className="px-3 mt-3">
        <div className="relative w-full h-[180px] rounded-2xl overflow-hidden bg-gray-100 shadow-sm">
          {loadingCarousel ? (
            <div className="w-full h-full flex items-center justify-center text-[12px] text-gray-400">
              {isEn ? 'Loading banners...' : '正在加载轮播图...'}
            </div>
          ) : carousel.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-[12px] text-gray-400">
              {isEn ? 'No banners yet' : '暂无轮播图'}
            </div>
          ) : (
            <>
              {carousel.map((item, idx) => (
                <div
                  key={item.id}
                  className={`absolute inset-0 transition-opacity duration-700 ${
                    idx === current ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <Image
                    src={item.image_url}
                    alt={item.title_zh || item.title_en || 'carousel'}
                    fill
                    className="object-cover"
                    sizes="100vw"
                  />
                </div>
              ))}
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {carousel.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setCurrent(idx)}
                    className={`w-1.5 h-1.5 rounded-full ${
                      idx === current ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="px-3 mt-3">
        <div className="h-11 rounded-full bg-white border border-gray-200 shadow-sm flex items-center px-3">
          <Search className="w-4 h-4 text-gray-400 mr-2" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') replaceFiltersInUrl()
            }}
            placeholder={
              isEn
                ? 'Search by park name'
                : '输入园区名称关键词'
            }
            className="flex-1 bg-transparent outline-none text-[14px]"
          />
          <span className="mx-2 h-6 w-px bg-gray-200" />
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className="relative h-9 px-2 rounded-full inline-flex items-center gap-1 text-[12px] text-gray-600 hover:bg-gray-50"
            aria-label={isEn ? 'Filter' : '筛选'}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{isEn ? 'Filters' : '筛选'}</span>
            {((selectedTags.length ? 1 : 0) +
              (selectedProvince ? 1 : 0) +
              (level ? 1 : 0)) > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#00b899] text-white text-[10px] flex items-center justify-center">
                {(selectedTags.length ? 1 : 0) +
                  (selectedProvince ? 1 : 0) +
                  (level ? 1 : 0)}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div className="px-3 mt-3">
          <div className="rounded-2xl bg-white border border-gray-100 p-3 space-y-3">
            {/* 园区级别（简单文本选项；具体枚举由后台数据驱动，前端只负责展示） */}
            <div>
              <div className="text-[13px] text-gray-900 mb-1">
                {isEn ? 'Park Level' : '园区级别'}
              </div>
              <div className="flex flex-wrap gap-2">
                {PARK_LEVEL_OPTIONS.map((opt) => {
                  const active = level === opt.value
                  return (
                    <button
                      key={opt.value || 'all'}
                      type="button"
                      onClick={() => setLevel(opt.value)}
                      className={`px-3 h-8 rounded-full border text-[12px] ${
                        active
                          ? 'bg-[#e6fffa] border-[#00b899] text-[#007f66]'
                          : 'bg-white border-gray-200 text-gray-600'
                      }`}
                    >
                      {isEn ? opt.labelEn : opt.labelZh}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 园区标签 */}
            {parkTags.length > 0 && (
              <div>
                <div className="text-[13px] text-gray-900 mb-1">
                  {isEn ? 'Park Tags' : '园区标签'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {parkTags.map((tag) => {
                    const active = selectedTags.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() =>
                          setSelectedTags((prev) =>
                            prev.includes(tag.id)
                              ? prev.filter((x) => x !== tag.id)
                              : [...prev, tag.id],
                          )
                        }
                        className={`px-3 h-8 rounded-full border text-[12px] ${
                          active
                            ? 'bg-[#eef2ff] border-[#6b6ee2] text-[#4b50d4]'
                            : 'bg-white border-gray-200 text-gray-600'
                        }`}
                      >
                        {tag.name}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 省份 */}
            <div>
              <div className="text-[13px] text-gray-900 mb-1">
                {isEn ? 'Province' : '省份'}
              </div>
              {fdLoading ? (
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-8 w-20 bg-gray-100 rounded-full animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedProvince('')
                    }}
                    className={`px-3 h-8 rounded-full border text-[12px] ${
                      selectedProvince === ''
                        ? 'bg-[#e6fffa] border-[#00b899] text-[#007f66]'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    {isEn ? 'All' : '全部'}
                  </button>
                  {(transformed.provinces || []).map((p: any) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => handleProvinceChange(p.value)}
                      className={`px-3 h-8 rounded-full border text-[12px] ${
                        selectedProvince === p.value
                          ? 'bg-[#e6fffa] border-[#00b899] text-[#007f66]'
                          : 'bg-white border-gray-200 text-gray-600'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 操作按钮（对齐政策平台样式） */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setFilterOpen(false)
                }}
                className="h-8 px-3 rounded-full text-[12px] border border-gray-200 text-gray-600 bg-white inline-flex items-center gap-1"
              >
                <ChevronUp className="w-3.5 h-3.5" />
                {isEn ? 'Collapse' : '收起'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setKeyword('')
                  setLevel('')
                  setSelectedTags([])
                  setSelectedProvince('')
                  setPage(1)
                  setFilterOpen(false)
                  replaceFiltersInUrl({ q: '', level: '', province: '', tags: [], sort: currentSort })
                }}
                className="h-8 px-3 rounded-full text-[12px] border border-gray-200 text-gray-600 bg-white inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {isEn ? 'Reset' : '重置'}
              </button>
              <button
                type="button"
                onClick={() => {
                  replaceFiltersInUrl()
                  setFilterOpen(false)
                }}
                className="h-8 px-4 rounded-full text-[12px] bg-[#00b899] text-white"
              >
                {isEn ? 'Apply' : '应用筛选'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 结果统计 + 排序 */}
      <div className="px-3 mt-3 flex items-center justify-between">
        <div className="text-[12px] text-gray-700">
          {isEn ? (
            <>
              Found <span className="text-blue-600 font-semibold">{total}</span> parks
            </>
          ) : (
            <>
              共找到 <span className="text-blue-600 font-semibold">{total}</span> 个园区
            </>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            className="h-7 rounded-full px-2 border border-gray-200 bg-white text-[11px] text-gray-800 inline-flex items-center gap-1 shadow-sm"
          >
            <ArrowUpDown className="w-3 h-3" />
            <span>{isEn ? 'Sort' : '切换排序'}</span>
          </button>
          {sortOpen && (
            <>
              <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                <button
                  onClick={() => {
                    setCurrentSort('default')
                    setSortOpen(false)
                    replaceFiltersInUrl({ sort: 'default' })
                  }}
                  className={`w-full px-3 h-9 text-left text-[12px] hover:bg-gray-50 inline-flex items-center gap-2 ${
                    currentSort === 'default' ? 'text-[#00b899] font-semibold' : ''
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  {isEn ? 'Default order' : '默认排序'}
                </button>
                <button
                  onClick={() => {
                    setCurrentSort('updatedAtDesc')
                    setSortOpen(false)
                    replaceFiltersInUrl({ sort: 'updatedAtDesc' })
                  }}
                  className={`w-full px-3 h-9 text-left text-[12px] hover:bg-gray-50 inline-flex items-center gap-2 ${
                    currentSort === 'updatedAtDesc' ? 'text-[#00b899] font-semibold' : ''
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  {isEn ? 'Latest updated' : '最近更新'}
                </button>
                <button
                  onClick={() => {
                    setCurrentSort('nameAsc')
                    setSortOpen(false)
                    replaceFiltersInUrl({ sort: 'nameAsc' })
                  }}
                  className={`w-full px-3 h-9 text-left text-[12px] hover:bg-gray-50 inline-flex items-center gap-2 ${
                    currentSort === 'nameAsc' ? 'text-[#00b899] font-semibold' : ''
                  }`}
                >
                  <ArrowUpAZ className="w-4 h-4" />
                  {isEn ? 'Name A-Z' : '名称升序'}
                </button>
                <button
                  onClick={() => {
                    setCurrentSort('nameDesc')
                    setSortOpen(false)
                    replaceFiltersInUrl({ sort: 'nameDesc' })
                  }}
                  className={`w-full px-3 h-9 text-left text-[12px] hover:bg-gray-50 inline-flex items-center gap-2 ${
                    currentSort === 'nameDesc' ? 'text-[#00b899] font-semibold' : ''
                  }`}
                >
                  <ArrowDownAZ className="w-4 h-4" />
                  {isEn ? 'Name Z-A' : '名称降序'}
                </button>
              </div>
              <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
            </>
          )}
        </div>
      </div>

      {/* 列表 */}
      <div className="px-3 mt-3 pb-4">
        {parks.length === 0 && !loadingList ? (
          <div className="h-[160px] rounded-2xl bg-white border border-dashed border-gray-200 flex flex-col items-center justify-center text-center px-6">
            <p className="text-[14px] text-gray-800">
              {isEn ? 'No parks found' : '暂无园区数据'}
            </p>
            <p className="mt-1 text-[12px] text-gray-500">
              {isEn
                ? 'Try adjusting filters or contact admin to add parks.'
                : '可尝试调整筛选条件，或联系管理员补充园区信息。'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {parks.map((p) => (
              <article
                key={p.id}
                onClick={() => router.push(`/${locale}/m/parks/${p.id}`)}
                className="w-full cursor-pointer rounded-2xl bg-white border border-gray-100 shadow-sm p-3 active:scale-[0.99] transition"
              >
                <div className="flex items-start gap-3">
                  {/* logo */}
                  <div className="w-[60px] h-[60px] rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                    {p.logoUrl ? (
                      <Image
                        src={p.logoUrl}
                        alt={p.name}
                        width={60}
                        height={60}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                        {isEn ? 'No Logo' : '暂无Logo'}
                      </div>
                    )}
                  </div>

                  {/* 文本区 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[15px] font-semibold text-gray-900 line-clamp-2">
                        {p.name}
                      </h3>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/${locale}/m/parks/${p.id}`)
                        }}
                        className="shrink-0 pl-2 pr-1.5 h-6 rounded-full bg-[#00b899] text-white text-[11px] leading-none inline-flex items-center gap-[2px]"
                      >
                        {isEn ? 'Details' : '查看详情'}
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    {p.brief && (
                      <p className="mt-1 text-[12px] text-gray-600 line-clamp-5">
                        {p.brief}
                      </p>
                    )}
                  </div>
                </div>

                {/* 标签 & 更新时间 */}
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {p.level && (
                      <span className="px-2 h-6 inline-flex items-center rounded-lg bg-emerald-50 text-emerald-700 text-[11px]">
                        {p.level}
                      </span>
                    )}
                    {p.province && (
                      <span className="px-2 h-6 inline-flex items-center rounded-lg bg-[#eef2ff] text-[#4b50d4] text-[11px]">
                        {p.province.name}
                      </span>
                    )}
                    {p.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 h-6 inline-flex items-center rounded-lg bg-violet-50 text-violet-700 text-[11px]"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                  {p.updatedAt && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>
                        {isEn ? 'Updated' : '更新于'} {p.updatedAt.slice(0, 10)}
                      </span>
                    </div>
                  )}
                </div>
              </article>
            ))}

            {canLoadMore && (
              <div className="mt-2 flex justify-center">
                <button
                  type="button"
                  disabled={loadingList}
                  onClick={() => loadParks(false)}
                  className={`w-full h-10 rounded-xl text-[14px] border ${
                    loadingList
                      ? 'text-gray-400 border-gray-200 bg-gray-100'
                      : 'text-[#00b899] border-[#a7f3d0] bg-[#ecfdf5]'
                  }`}
                >
                  {loadingList
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
      </div>
    </section>
  )
}
