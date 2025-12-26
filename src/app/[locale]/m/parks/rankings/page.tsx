"use client"

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { ArrowUpDown, Award, Building2, ChevronDown, ChevronUp, Triangle, Trophy } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import {
  getParkRankings,
  type ParkRankingItem,
  type ParkRankingKind,
  type ParkRankingParkLevel,
  type ParkRankingYearOption,
} from '@/api/park-rankings'
import {
  getParkBrandDirectory,
  type BrandDirectoryItem,
  type BrandDirectoryEntry,
} from '@/api/park-brand-directory'

const PARK_LEVEL_OPTIONS: { value: ParkRankingParkLevel; labelZh: string; labelEn: string }[] = [
  { value: '国家级经济技术开发区', labelZh: '国家级经开区', labelEn: 'National ETDZ' },
  { value: '国家级高新技术产业开发区', labelZh: '国家级高新区', labelEn: 'National High-Tech Zone' },
]

function yearLabel(option: ParkRankingYearOption, locale: 'zh' | 'en') {
  if (locale === 'en') {
    return option.isLatest ? `${option.year}\u200B(Latest)` : String(option.year)
  }
  return option.isLatest ? `${option.year}年\u200B（最新）` : `${option.year}年`
}

function RankNumber({ value }: { value: number }) {
  const colorClass =
    value === 1
      ? 'text-red-500'
    : value === 2
        ? 'text-orange-500'
        : value === 3
          ? 'text-amber-500'
          : 'text-gray-500'
  const weightClass = value <= 3 ? 'font-semibold' : 'font-normal'
  return <span className={cn('w-6 text-sm tabular-nums', colorClass, weightClass)}>{value}</span>
}

function RankChangeIndicator({ current, previous }: { current: number; previous?: number | null }) {
  if (previous === null || previous === undefined) {
    return <span className="w-7 text-center text-[11px] text-gray-400">—</span>
  }
  const delta = previous - current
  if (delta > 0) {
    return (
      <span className="w-7 inline-flex items-center justify-center gap-1 text-[11px] text-green-600">
        <Triangle className="w-2.5 h-2.5 fill-green-500 stroke-green-500" />
        <span className="tabular-nums">{delta}</span>
      </span>
    )
  }
  if (delta < 0) {
    return (
      <span className="w-7 inline-flex items-center justify-center gap-1 text-[11px] text-red-500">
        <Triangle className="w-2.5 h-2.5 rotate-180 fill-red-500 stroke-red-500" />
        <span className="tabular-nums">{Math.abs(delta)}</span>
      </span>
    )
  }
  return <span className="w-7 text-center text-[11px] text-amber-500">-</span>
}

function formatApprovedAt(raw: string | null | undefined, fallbackYear?: number | null) {
  if (raw) {
    const y = Number(raw.slice(0, 4))
    if (!Number.isNaN(y)) return String(y)
  }
  if (fallbackYear && !Number.isNaN(fallbackYear)) return String(fallbackYear)
  return '-'
}

const RankingCard = React.forwardRef<HTMLDivElement, {
  item: ParkRankingItem
  locale: 'zh' | 'en'
  expanded: boolean
  onToggle: () => void
}>((props, ref) => {
  const { item, locale, expanded, onToggle } = props
  const title = locale === 'en' && item.titleEn ? item.titleEn : item.titleZh

  const list = expanded ? item.entries : item.entries.slice(0, 5)
  const empty = list.length === 0

  return (
    <div ref={ref} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden scroll-mt-28">
      <div className="px-4 pt-4">
        <div className="flex items-center gap-3">
          <div className="w-[6px] h-5 bg-[#00b899]" />
          <div className="flex-1 text-sm font-semibold text-gray-900 leading-snug">
            {title}（{item.year}）
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 pb-2">
        {empty ? (
          <div className="py-6 text-center text-sm text-gray-500">
            {locale === 'en' ? 'No data for this year.' : '该年度暂无数据'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {list.map((row) => {
              const park = row.park
              const name = park ? (locale === 'en' ? park.nameEn || park.nameZh : park.nameZh) : '-'
              const provinceLabel = park?.province
                ? locale === 'en'
                  ? park.province.nameEn || park.province.nameZh
                  : park.province.nameZh
                : '-'
              return (
                <div
                  key={`${item.id}-${row.rank}-${park?.id || 'x'}`}
                  className="py-2 flex items-center gap-0.5 pl-1"
                >
                  <RankNumber value={row.rank} />
                  <RankChangeIndicator current={row.rank} previous={row.previousRank} />
                  {/* 保持“排名变化列”和“园区名称列”的位置不变，仅调整 Logo 在中间的相对位置 */}
                  <div className="w-[54px] flex items-center pl-3">
                    <div className="w-8 h-8 relative rounded-lg overflow-hidden bg-gray-100">
                      {park?.logoUrl ? (
                        <Image src={park.logoUrl} alt={name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 truncate">{name}</div>
                  </div>
                  <div className="text-sm text-gray-500 whitespace-nowrap">{provinceLabel}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {item.entries.length > 5 && (
        <button
          type="button"
          onClick={onToggle}
          className="w-full px-4 py-3 text-xs text-[#2563eb] bg-gray-50 hover:bg-gray-100 flex items-center justify-center gap-1"
        >
          {expanded ? (locale === 'en' ? 'Collapse' : '收起榜单') : (locale === 'en' ? 'View full list' : '查看完整榜单')}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      )}
    </div>
  )
})
RankingCard.displayName = 'RankingCard'

const BrandDirectoryCard = React.forwardRef<HTMLDivElement, {
  item: BrandDirectoryItem
  locale: 'zh' | 'en'
  expanded: boolean
  onToggle: () => void
  sortOrder: 'asc' | 'desc'
  onToggleSort: () => void
}>((props, ref) => {
  const { item, locale, expanded, onToggle, sortOrder, onToggleSort } = props
  const sortedEntries = useMemo(() => {
    return [...item.entries].sort((a: BrandDirectoryEntry, b: BrandDirectoryEntry) => {
      const getYear = (entry: BrandDirectoryEntry) => {
        if (entry.approvedAt) {
          const y = Number(entry.approvedAt.slice(0, 4))
          if (!Number.isNaN(y)) return y
        }
        if (entry.year && !Number.isNaN(entry.year)) return entry.year
        return sortOrder === 'asc' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY
      }
      const ya = getYear(a)
      const yb = getYear(b)
      return sortOrder === 'asc' ? ya - yb : yb - ya
    })
  }, [item.entries, sortOrder])

  const list = expanded ? sortedEntries : sortedEntries.slice(0, 5)
  const empty = list.length === 0

  return (
    <div ref={ref} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden scroll-mt-28">
      <div className="px-4 pt-4">
        <div className="flex items-center gap-3">
          <div className="w-[6px] h-5 bg-[#00b899]" />
          <div className="flex-1 text-sm font-semibold text-gray-900 leading-snug">
            {item.title}
          </div>
          <button
            type="button"
            onClick={onToggleSort}
            className="h-7 rounded-full px-2 border border-gray-200 bg-white text-[11px] text-gray-800 inline-flex items-center gap-1 shadow-sm hover:bg-gray-50"
          >
            <ArrowUpDown className="w-3 h-3" />
            {sortOrder === 'asc' ? (locale === 'en' ? 'Year ↑' : '年份升序') : (locale === 'en' ? 'Year ↓' : '年份降序')}
          </button>
        </div>
      </div>

      <div className="px-4 pt-3 pb-2">
        <div className="grid grid-cols-[minmax(0,1fr)_100px_70px] items-center gap-3 text-[12px] font-semibold text-gray-700 bg-gray-50 rounded-lg py-2 mb-2">
          <div className="flex items-center gap-3">
            <span className="w-8 shrink-0" aria-hidden />
            <span>{locale === 'en' ? 'Park' : '园区名称'}</span>
          </div>
          <span className="text-left whitespace-nowrap pl-[18px] pr-1">
            {locale === 'en' ? 'Province' : '所在省市'}
          </span>
          <span className="text-right whitespace-nowrap pr-4">{locale === 'en' ? 'Year' : '获批年份'}</span>
        </div>
        {empty ? (
          <div className="py-6 text-center text-sm text-gray-500">
            {locale === 'en' ? 'No data.' : '暂无数据'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {list.map((row: BrandDirectoryEntry) => {
              const park = row.park
              const name = park ? (locale === 'en' ? park.nameEn || park.nameZh : park.nameZh) : '-'
              const provinceLabel = park?.province
                ? locale === 'en'
                  ? park.province.nameEn || park.province.nameZh
                  : park.province.nameZh
                : '-'
              const approvedAtLabel = formatApprovedAt(row.approvedAt, row.year)

              return (
                <div
                  key={row.id}
                  className="py-2.5 grid grid-cols-[minmax(0,1fr)_100px_70px] gap-2 items-center text-[12px] text-gray-900"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-7 h-7 relative rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {park?.logoUrl ? (
                        <Image src={park.logoUrl} alt={name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-0.5">
                      <div className="truncate">{name}</div>
                    </div>
                  </div>
                  <div className="text-left whitespace-nowrap pl-[18px] pr-1 truncate">
                    {provinceLabel}
                  </div>
                  <div className="text-right whitespace-nowrap pr-4">{approvedAtLabel}</div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {item.entries.length > 5 && (
        <button
          type="button"
          onClick={onToggle}
          className="w-full px-4 py-3 text-xs text-[#2563eb] bg-gray-50 hover:bg-gray-100 flex items-center justify-center gap-1"
        >
          {expanded ? (locale === 'en' ? 'Collapse' : '收起名录') : (locale === 'en' ? 'View full list' : '查看完整名录')}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      )}
    </div>
  )
})
BrandDirectoryCard.displayName = 'BrandDirectoryCard'

export default function MobileParkRankingsPage() {
  const pathname = usePathname()
  const locale: 'zh' | 'en' = pathname.startsWith('/en') ? 'en' : 'zh'

  const [parkLevel, setParkLevel] = useState<ParkRankingParkLevel>('国家级经济技术开发区')
  const [kind, setKind] = useState<ParkRankingKind>('ranking')
  const [year, setYear] = useState<number | 'latest'>('latest')
  const [selectedListId, setSelectedListId] = useState<string>('all')

  const [yearOptions, setYearOptions] = useState<ParkRankingYearOption[]>([])
  const [rankingItems, setRankingItems] = useState<ParkRankingItem[]>([])
  const [loading, setLoading] = useState(true)

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
  const listRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const [brandTags, setBrandTags] = useState<string[]>([])
  const [brandTitle, setBrandTitle] = useState<string>('all')
  const [brandItems, setBrandItems] = useState<BrandDirectoryItem[]>([])
  const [expandedBrandIds, setExpandedBrandIds] = useState<Record<string, boolean>>({})
  const brandCardRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [brandSortOrders, setBrandSortOrders] = useState<Record<string, 'asc' | 'desc'>>({})

  const selectedYearLabel = useMemo(() => {
    if (typeof year === 'number') {
      const opt = yearOptions.find((o) => o.year === year)
      if (opt) return yearLabel(opt, locale)
      return locale === 'en' ? String(year) : `${year}年`
    }
    const latest = yearOptions.find((o) => o.isLatest) || yearOptions[0]
    return latest ? yearLabel(latest, locale) : locale === 'en' ? 'Latest' : '最新'
  }, [year, yearOptions, locale])

  useEffect(() => {
    if (kind !== 'ranking') return
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const res = await getParkRankings({
          parkLevel,
          kind,
          year,
        })
        if (!alive) return
        setYearOptions(res.yearOptions || [])
        setRankingItems(res.items || [])
        if (year === 'latest' && typeof res.selectedYear === 'number') {
          setYear(res.selectedYear)
        }
        setSelectedListId('all')
      } catch (e) {
        console.error('加载榜单失败:', e)
        if (!alive) return
        setYearOptions([])
        setRankingItems([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [parkLevel, kind, year])

  useEffect(() => {
    if (kind !== 'brand') return
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const res = await getParkBrandDirectory({
          title: brandTitle === 'all' ? undefined : brandTitle,
        })
        if (!alive) return
        setBrandTags(res.tags || [])
        setBrandItems(res.items || [])
        setExpandedBrandIds({})
      } catch (e) {
        console.error('加载品牌名录失败:', e)
        if (!alive) return
        setBrandTags([])
        setBrandItems([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [kind, brandTitle])

  useEffect(() => {
    // 切换 tab 时重置筛选与展开状态
    if (kind === 'ranking') {
      setBrandTitle('all')
      setExpandedBrandIds({})
    } else {
      setSelectedListId('all')
      setExpandedIds({})
    }
  }, [kind])

  // 当选择指定榜单时滚动到对应卡片
  useEffect(() => {
    if (selectedListId === 'all') return
    const el = listRefs.current[selectedListId]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [selectedListId])

  useEffect(() => {
    if (kind !== 'brand') return
    if (brandTitle === 'all') return
    const el = brandCardRefs.current[brandTitle]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [kind, brandTitle])

  return (
    <div className="px-4 py-4 space-y-4">
      {/* 顶部选择区域卡片（吸顶） */}
      <div className="bg-white rounded-2xl shadow-sm px-4 py-3 space-y-3 sticky top-0 z-20">
        {/* Tab：排名榜单 / 品牌名单 */}
        <div className="flex items-center justify-center gap-12 px-1 pb-2">
          <button
            type="button"
            onClick={() => setKind('ranking')}
            className="relative pb-1"
          >
            <span
              className={cn(
                'text-base',
                kind === 'ranking' ? 'text-gray-900 font-semibold' : 'text-gray-400 font-normal',
              )}
            >
              <span className="inline-flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                {locale === 'en' ? 'Rankings' : '排名榜单'}
              </span>
            </span>
            {kind === 'ranking' && (
              <span className="absolute left-0 right-0 -bottom-[2px] h-[5px] bg-[#00B899]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setKind('brand')}
            className="relative pb-1"
          >
            <span
              className={cn(
                'text-base',
                kind === 'brand' ? 'text-gray-900 font-semibold' : 'text-gray-400 font-normal',
              )}
            >
              <span className="inline-flex items-center gap-2">
                <Award className="w-4 h-4" />
                {locale === 'en' ? 'Brand List' : '品牌名录'}
              </span>
            </span>
            {kind === 'brand' && (
              <span className="absolute left-0 right-0 -bottom-[2px] h-[5px] bg-[#00B899]" />
            )}
          </button>
        </div>

        {kind === 'ranking' ? (
          // 筛选器：园区级别、榜单、时间
          <div className="grid grid-cols-3 gap-2">
            <Select value={parkLevel} onValueChange={(v) => setParkLevel(v as ParkRankingParkLevel)}>
              <SelectTrigger className="h-8 rounded-md bg-gray-50 text-xs text-gray-500 px-3 py-1 border-0 focus:ring-0 focus:outline-none w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PARK_LEVEL_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {locale === 'en' ? o.labelEn : o.labelZh}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedListId} onValueChange={(v) => setSelectedListId(v)}>
              <SelectTrigger className="h-8 rounded-md bg-gray-50 text-xs text-gray-500 px-3 py-1 border-0 focus:ring-0 focus:outline-none w-full">
                <SelectValue placeholder={locale === 'en' ? 'All lists' : '全部榜单'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{locale === 'en' ? 'All lists' : '全部榜单'}</SelectItem>
                {rankingItems.map((it) => (
                  <SelectItem key={it.id} value={it.id}>
                    {locale === 'en' && it.titleEn ? it.titleEn : it.titleZh}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={typeof year === 'number' ? String(year) : 'latest'}
              onValueChange={(v) => {
                if (v === 'latest') {
                  setYear('latest')
                  return
                }
                const parsed = Number(v)
                setYear(Number.isNaN(parsed) ? 'latest' : parsed)
              }}
            >
              <SelectTrigger className="h-8 rounded-md bg-gray-50 text-xs text-gray-500 px-3 py-1 border-0 focus:ring-0 focus:outline-none w-full">
                <SelectValue placeholder={selectedYearLabel} />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.length === 0 ? (
                  <SelectItem value="latest" disabled>
                    {locale === 'en' ? 'No years' : '暂无年度'}
                  </SelectItem>
                ) : (
                  yearOptions.map((o) => (
                    <SelectItem key={o.year} value={String(o.year)}>
                      {yearLabel(o, locale)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        ) : (
          // 品牌名录：标签筛选
          <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1">
            <button
              type="button"
              onClick={() => setBrandTitle('all')}
              className={cn(
                'shrink-0 h-7 px-3 rounded-md text-xs bg-gray-100 text-gray-600',
                brandTitle === 'all' && 'bg-[#00B899]/10 text-[#00B899] font-semibold',
              )}
            >
              {locale === 'en' ? 'All' : '全部'}
            </button>
            {brandTags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setBrandTitle(t)}
                className={cn(
                  'shrink-0 h-7 px-3 rounded-md text-xs bg-gray-100 text-gray-600',
                  brandTitle === t && 'bg-[#00B899]/10 text-[#00B899] font-semibold',
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-gray-500">
          {locale === 'en' ? 'Loading…' : '加载中…'}
        </div>
      ) : kind === 'ranking' && rankingItems.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-500">
          {locale === 'en' ? 'No lists yet.' : '暂无榜单数据'}
        </div>
      ) : kind === 'brand' && brandItems.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-500">
          {locale === 'en' ? 'No directory data.' : '暂无品牌名录数据'}
        </div>
      ) : (
        <div className="space-y-4">
          {kind === 'ranking'
            ? rankingItems.map((it) => (
                <RankingCard
                  key={it.id}
                  ref={(node) => {
                    listRefs.current[it.id] = node
                  }}
                  item={it}
                  locale={locale}
                  expanded={!!expandedIds[it.id]}
                  onToggle={() =>
                    setExpandedIds((prev) => ({ ...prev, [it.id]: !prev[it.id] }))
                  }
                />
              ))
            : brandItems.map((it) => (
                <BrandDirectoryCard
                  key={it.title}
                  ref={(node) => {
                    brandCardRefs.current[it.title] = node
                  }}
                  item={it}
                  locale={locale}
                  expanded={!!expandedBrandIds[it.title]}
                  sortOrder={brandSortOrders[it.title] || 'asc'}
                  onToggleSort={() =>
                    setBrandSortOrders((prev) => ({
                      ...prev,
                      [it.title]: prev[it.title] === 'desc' ? 'asc' : 'desc',
                    }))
                  }
                  onToggle={() =>
                    setExpandedBrandIds((prev) => ({ ...prev, [it.title]: !prev[it.title] }))
                  }
                />
              ))}
        </div>
      )}
    </div>
  )
}
