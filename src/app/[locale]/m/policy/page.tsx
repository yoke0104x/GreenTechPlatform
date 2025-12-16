"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, ArrowUpDown, ArrowUpAZ, ArrowDownAZ, Clock, ChevronUp, RotateCcw } from 'lucide-react'
import { LanguageSwitcher } from '@/components/common/language-switcher'
import Link from 'next/link'
import { Menu } from 'lucide-react'
import { useLoadingOverlay } from '@/components/common/loading-overlay'
import { getPolicyList, getPolicyTags, type PolicyLevel, type PolicyTag, type PolicyListItem } from '@/api/policy'
import { useFilterData, transformFilterDataForComponents } from '@/hooks/admin/use-filter-data'
import { POLICY_MINISTRY_UNIT_OPTIONS } from '@/lib/types/admin'

const PAGE_SIZE = 10

const LEVEL_OPTIONS: { value: PolicyLevel | ''; labelZh: string; labelEn: string }[] = [
  { value: '', labelZh: '全部政策', labelEn: 'All policies' },
  { value: 'national', labelZh: '中央政策', labelEn: 'Central' },
  { value: 'ministry', labelZh: '部委政策', labelEn: 'Ministry' },
  { value: 'local', labelZh: '地方政策', labelEn: 'Local' },
  { value: 'park', labelZh: '园区政策', labelEn: 'Park' },
]

const LEVEL_COLORS: Record<string, string> = {
  all: '#00b899',
  national: '#3b82f6',
  ministry: '#8b5cf6',
  local: '#f97316',
  park: '#facc15',
}

const PRIORITY_MINISTRY_UNITS = [
  '国家发展和改革委员会',
  '生态环境部',
  '商务部',
  '工业和信息化部',
  '自然资源部',
  '财政部',
  '交通运输部',
  '科学技术部',
] as const

export default function MobilePolicyHomePage() {
  const pathname = usePathname()
  const router = useRouter()
  const locale = pathname.startsWith('/en') ? 'en' : 'zh'
  const { showLoading, hideLoading } = useLoadingOverlay()

  const [keyword, setKeyword] = useState('')
  const [level, setLevel] = useState<PolicyLevel | ''>('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedMinistryUnit, setSelectedMinistryUnit] = useState<string>('')
  const [selectedProvince, setSelectedProvince] = useState<string>('')
  const [selectedZone, setSelectedZone] = useState<string>('')
  const [showAllMinistryUnits, setShowAllMinistryUnits] = useState(false)

  const [tags, setTags] = useState<PolicyTag[]>([])
  const [policies, setPolicies] = useState<PolicyListItem[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loadingList, setLoadingList] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const [currentSort, setCurrentSort] = useState<'publishDateDesc' | 'publishDateAsc' | 'nameAsc' | 'nameDesc'>('publishDateDesc')
  const [levelCounts, setLevelCounts] = useState<Record<string, number>>({
    all: 0,
    national: 0,
    ministry: 0,
    local: 0,
    park: 0,
  })

  const { data: fd, isLoading: fdLoading, loadProvinces, loadDevelopmentZones } = useFilterData()
  const fetchTokenRef = useRef(0)
  const transformed = useMemo(
    () => transformFilterDataForComponents(fd, locale),
    [fd, locale],
  )

  // 自动加载中国省份列表，确保省份筛选有完整选项（与 /m/home 一致）
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

  const fetchLevelCounts = useCallback(async (overrides?: {
    keyword?: string
    level?: PolicyLevel | ''
    tags?: string[]
    ministryUnit?: string
    province?: string
    zone?: string
  }) => {
    try {
      const common = {
        keyword: (overrides?.keyword ?? keyword).trim() || undefined,
        tags: (overrides?.tags ?? selectedTags).length ? (overrides?.tags ?? selectedTags) : undefined,
        ministryUnit: (overrides?.ministryUnit ?? selectedMinistryUnit) || undefined,
        province: (overrides?.province ?? selectedProvince) || undefined,
        developmentZone: (overrides?.zone ?? selectedZone) || undefined,
        page: 1,
        pageSize: 1,
      }
      const levels: (PolicyLevel | '')[] = ['', 'national', 'ministry', 'local', 'park']
      const results = await Promise.all(
        levels.map(async (lv) => {
          const res = await getPolicyList({
            ...common,
            level: lv || undefined,
            ministryUnit: lv === 'ministry' ? common.ministryUnit : undefined,
          })
          const total = res.success && res.data ? res.data.total : 0
          return { key: lv || 'all', total }
        }),
      )
      const nextCounts: Record<string, number> = {}
      results.forEach((r) => {
        nextCounts[r.key] = r.total
      })
      setLevelCounts(nextCounts)
    } catch (error) {
      console.error('获取各级别政策数量失败:', error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, selectedTags, selectedProvince, selectedZone])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await getPolicyTags()
        if (!alive) return
        if (res.success && res.data) {
          setTags(res.data)
        }
      } catch (error) {
        console.error('加载政策标签失败:', error)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const fetchPolicies = async (
    resetPage = true,
    overrides?: {
      keyword?: string
      level?: PolicyLevel | ''
      tags?: string[]
      ministryUnit?: string
      province?: string
      zone?: string
      force?: boolean
    },
  ) => {
    if (loadingList && !overrides?.force) return
    const token = ++fetchTokenRef.current
    const hasOverrides = !!overrides

    const effectiveKeyword =
      hasOverrides && Object.prototype.hasOwnProperty.call(overrides!, 'keyword')
        ? (overrides!.keyword ?? '')
        : keyword
    const effectiveLevel =
      hasOverrides && Object.prototype.hasOwnProperty.call(overrides!, 'level')
        ? (overrides!.level ?? '')
        : level
    const effectiveTags =
      hasOverrides && Object.prototype.hasOwnProperty.call(overrides!, 'tags')
        ? (overrides!.tags ?? [])
        : selectedTags
    const effectiveMinistryUnit =
      hasOverrides && Object.prototype.hasOwnProperty.call(overrides!, 'ministryUnit')
        ? (overrides!.ministryUnit ?? '')
        : selectedMinistryUnit
    const effectiveProvince =
      hasOverrides && Object.prototype.hasOwnProperty.call(overrides!, 'province')
        ? (overrides!.province ?? '')
        : selectedProvince
    const effectiveZone =
      hasOverrides && Object.prototype.hasOwnProperty.call(overrides!, 'zone')
        ? (overrides!.zone ?? '')
        : selectedZone

    const nextPage = resetPage ? 1 : page + 1
    setLoadingList(true)
    showLoading()
    try {
      const res = await getPolicyList({
        keyword: effectiveKeyword.trim() || undefined,
        level: effectiveLevel || undefined,
        tags: effectiveTags.length ? effectiveTags : undefined,
        ministryUnit:
          (effectiveLevel || level) === 'ministry' && effectiveMinistryUnit
            ? effectiveMinistryUnit
            : undefined,
        province: effectiveProvince || undefined,
        developmentZone: effectiveZone || undefined,
        page: nextPage,
        pageSize: PAGE_SIZE,
        sortBy: currentSort as any, // 前端扩展了 nameAsc/nameDesc，后端仅识别部分字段
      })
      if (token !== fetchTokenRef.current) return
      if (res.success && res.data) {
        const data = res.data
        setTotal(data.total)
        setPage(nextPage)
        setPolicies((prev) =>
          resetPage ? data.items : [...prev, ...data.items],
        )
      }
      // 更新各级别数量
      fetchLevelCounts({
        keyword: effectiveKeyword,
        tags: effectiveTags,
        ministryUnit: effectiveMinistryUnit,
        province: effectiveProvince,
        zone: effectiveZone,
      })
    } catch (error) {
      if (token === fetchTokenRef.current) {
        console.error('加载政策列表失败:', error)
      }
    } finally {
      if (token === fetchTokenRef.current) {
        setLoadingList(false)
      }
      hideLoading()
    }
  }

  useEffect(() => {
    fetchPolicies(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSort])

  useEffect(() => {
    fetchLevelCounts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const canLoadMore = policies.length < total

  const handleTagToggle = (id: string) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const handleProvinceChange = async (code: string) => {
    setSelectedProvince(code)
    setSelectedZone('')
    if (!code) return
    const province = (fd?.provinces || []).find((p) => p.code === code)
    if (province?.id) {
      await loadDevelopmentZones(province.id)
    }
  }

  const levelLabel = (value: PolicyLevel | '') => {
    const opt = LEVEL_OPTIONS.find((o) => o.value === value)
    if (!opt) return ''
    return locale === 'en' ? opt.labelEn : opt.labelZh
  }

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
              aria-label={locale === 'en' ? 'Portal' : 'Portal入口'}
            >
              <Menu className="w-4 h-4 text-[#00b899]" />
            </Link>
          </div>
        </div>
      </div>

      {/* Level toggle group */}
      <div className="px-3 mt-3">
        <div className="grid grid-cols-5 gap-2">
          {LEVEL_OPTIONS.map((opt) => {
            const active = level === opt.value
            const key = opt.value || 'all'
            const count = levelCounts[key] ?? 0
            const color = LEVEL_COLORS[key] || '#00b899'
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  const newLevel = opt.value
                  setLevel(newLevel)
                  if (newLevel !== 'ministry') {
                    setSelectedMinistryUnit('')
                  }
                  fetchPolicies(true, {
                    keyword,
                    level: newLevel,
                    tags: selectedTags,
                    ministryUnit: selectedMinistryUnit,
                    province: selectedProvince,
                    zone: selectedZone,
                    force: true,
                  })
                  if (newLevel !== 'ministry') {
                    setShowAllMinistryUnits(false)
                  }
                }}
                className={`relative rounded-lg border pl-3 pr-2 py-1 text-left bg-white transition shadow-sm flex flex-col items-center justify-center min-h-[64px] overflow-hidden ${
                  active
                    ? 'border-2 border-[#00b899] ring-2 ring-[#00b899]/40'
                    : 'border-gray-200'
                }`}
              >
                <span
                  aria-hidden
                  className="absolute top-0 bottom-0 w-[8px] rounded-l-lg"
                  style={{ backgroundColor: color, left: '-1px' }}
                />
                <div className="relative flex items-baseline gap-1 leading-tight">
                  <span className={`text-[16px] font-bold ${active ? 'text-[#00b899]' : 'text-gray-900'}`}>
                    {count}
                  </span>
                  {locale !== 'en' && (
                    <span className="text-[10px] font-normal text-gray-500">项</span>
                  )}
                </div>
                <div className={`relative mt-1.5 truncate text-center w-full ${
                  active
                    ? 'text-[#00b899] text-[12px] font-semibold'
                    : 'text-gray-600 text-[11px]'
                }`}>
                  {locale === 'en' ? opt.labelEn : opt.labelZh}
                </div>
              </button>
            )
          })}
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
              if (e.key === 'Enter') fetchPolicies(true)
            }}
            placeholder={
              locale === 'en'
                ? 'Search by name / doc number'
              : '输入政策名称或发文字号'
            }
            className="flex-1 bg-transparent outline-none text-[14px]"
          />
          <span className="mx-2 h-6 w-px bg-gray-200" />
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className="relative h-9 px-2 rounded-full inline-flex items-center gap-1 text-[12px] text-gray-600 hover:bg-gray-50"
            aria-label={locale === 'en' ? 'Filter' : '筛选'}
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>{locale === 'en' ? 'Filters' : '筛选'}</span>
            {((selectedTags.length ? 1 : 0) +
              (selectedMinistryUnit ? 1 : 0) +
              (selectedProvince ? 1 : 0) +
              (selectedZone ? 1 : 0) +
              (level ? 1 : 0)) > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#00b899] text-white text-[10px] flex items-center justify-center">
                {(selectedTags.length ? 1 : 0) +
                  (selectedMinistryUnit ? 1 : 0) +
                  (selectedProvince ? 1 : 0) +
                  (selectedZone ? 1 : 0) +
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
            {/* Level */}
            <div>
              <div className="text-[13px] text-gray-900 mb-1">
                {locale === 'en' ? 'Level' : '政策级别'}
              </div>
              <div className="flex flex-wrap gap-2">
                {LEVEL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value || 'all'}
                    type="button"
                    onClick={() => {
                      setLevel(opt.value)
                      if (opt.value !== 'ministry') {
                        setSelectedMinistryUnit('')
                        setShowAllMinistryUnits(false)
                      }
                    }}
                    className={`px-3 h-8 rounded-full border text-[12px] ${
                      level === opt.value
                        ? 'bg-[#e6fffa] border-[#00b899] text-[#007f66]'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    {locale === 'en' ? opt.labelEn : opt.labelZh}
                  </button>
                ))}
              </div>
            </div>

            {/* Ministry unit - only when filtering ministry level */}
            {level === 'ministry' && (
              <div>
                <div className="text-[13px] text-gray-900 mb-1">
                  {locale === 'en' ? 'Ministry unit' : '部委单位'}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMinistryUnit('')}
                    className={`px-3 h-8 rounded-full border text-[12px] ${
                      selectedMinistryUnit === ''
                        ? 'bg-[#e6fffa] border-[#00b899] text-[#007f66]'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    {locale === 'en' ? 'All' : '全部'}
                  </button>
                  {POLICY_MINISTRY_UNIT_OPTIONS.filter((opt) => {
                    const isPriority = PRIORITY_MINISTRY_UNITS.includes(opt.value as typeof PRIORITY_MINISTRY_UNITS[number])
                    return showAllMinistryUnits || isPriority || selectedMinistryUnit === opt.value
                  }).map((opt) => {
                    const active = selectedMinistryUnit === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSelectedMinistryUnit(opt.value)}
                        className={`px-3 h-8 rounded-full border text-[12px] ${
                          active
                            ? 'bg-[#eef2ff] border-[#6b6ee2] text-[#4b50d4]'
                            : 'bg-white border-gray-200 text-gray-600'
                        }`}
                      >
                        {locale === 'en' ? opt.label_en : opt.label_zh}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-2">
                  <button
                    type="button"
                    className="text-[12px] text-[#4b50d4]"
                    onClick={() => setShowAllMinistryUnits((v) => !v)}
                  >
                    {showAllMinistryUnits
                      ? locale === 'en'
                        ? 'Collapse'
                        : '收起'
                      : locale === 'en'
                        ? 'More...'
                        : '更多...'}
                  </button>
                </div>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <div className="text-[13px] text-gray-900 mb-1">
                  {locale === 'en' ? 'Tags' : '政策标签'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const active = selectedTags.includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleTagToggle(tag.id)}
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

            {/* Province & development zone - only for all/local/park */}
            {(level === '' || level === 'local' || level === 'park') && (
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <div className="text-[13px] text-gray-900 mb-1">
                    {locale === 'en' ? 'Province' : '省份'}
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
                          setSelectedZone('')
                        }}
                        className={`px-3 h-8 rounded-full border text-[12px] ${
                          selectedProvince === ''
                            ? 'bg-[#e6fffa] border-[#00b899] text-[#007f66]'
                            : 'bg-white border-gray-200 text-gray-600'
                        }`}
                      >
                        {locale === 'en' ? 'All' : '全部'}
                      </button>
                      {(transformed.provinces || []).map((p: any) => (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => handleProvinceChange(p.code || p.value)}
                          className={`px-3 h-8 rounded-full border text-[12px] ${
                            selectedProvince === (p.code || p.value)
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

                <div>
                  <div className="text-[13px] text-gray-900 mb-1">
                    {locale === 'en' ? 'Development Zone' : '经开区 / 园区'}
                  </div>
                  {fdLoading ? (
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-8 w-24 bg-gray-100 rounded-full animate-pulse"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedZone('')}
                        className={`px-3 h-8 rounded-full border text-[12px] ${
                          selectedZone === ''
                            ? 'bg-[#e6fffa] border-[#00b899] text-[#007f66]'
                            : 'bg-white border-gray-200 text-gray-600'
                        }`}
                      >
                        {locale === 'en' ? 'All' : '全部'}
                      </button>
                      {(transformed.developmentZones || []).map((z: any) => (
                        <button
                          key={z.value}
                          type="button"
                          onClick={() => setSelectedZone(z.code || z.value)}
                          className={`px-3 h-8 rounded-full border text-[12px] ${
                            selectedZone === (z.code || z.value)
                              ? 'bg-[#e6fffa] border-[#00b899] text-[#007f66]'
                              : 'bg-white border-gray-200 text-gray-600'
                          }`}
                        >
                          {z.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setFilterOpen(false)}
              className="h-8 px-3 rounded-full text-[12px] border border-gray-200 text-gray-600 bg-white inline-flex items-center gap-1"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              {locale === 'en' ? 'Collapse' : '收起'}
            </button>
            <button
              type="button"
              onClick={() => {
                // 使正在进行的请求失效
                fetchTokenRef.current += 1
                setKeyword('')
                setLevel('')
                setSelectedTags([])
                setSelectedMinistryUnit('')
                setSelectedProvince('')
                setSelectedZone('')
                setPolicies([])
                setTotal(0)
                setPage(1)
                setFilterOpen(false)
                setTimeout(() => {
                  fetchPolicies(true, {
                    keyword: '',
                    level: '',
                    tags: [],
                    ministryUnit: '',
                    province: '',
                    zone: '',
                    force: true,
                  })
                }, 0)
              }}
              className="h-8 px-3 rounded-full text-[12px] border border-gray-200 text-gray-600 bg-white inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {locale === 'en' ? 'Reset' : '重置'}
            </button>
            <button
              type="button"
              onClick={() => {
                fetchPolicies(true)
                setFilterOpen(false)
              }}
              className="h-8 px-4 rounded-full text-[12px] bg-[#00b899] text-white"
            >
              {locale === 'en' ? 'Apply' : '应用筛选'}
            </button>
            </div>
          </div>
        </div>
      )}

      {/* Results header: count + sort (align with /m/home UI) */}
      <div className="px-3 mt-3">
        <div className="flex items-center justify-between">
          <div className="text-[12px] text-gray-700">
            {locale === 'en' ? (
              <>Found{' '}<span className="text-blue-600 font-semibold">{total}</span>{' '}policies</>
            ) : (
              <>搜索到{' '}<span className="text-blue-600 font-semibold">{total}</span>{' '}项政策结果</>
            )}
          </div>
          <div className="relative">
            <button
              className="h-7 rounded-full px-2 border border-gray-200 bg-white text-[11px] text-gray-800 inline-flex items-center gap-1 shadow-sm"
              aria-label={locale==='en'?'Change sort':'切换排序'}
              onClick={()=>setSortOpen(v=>!v)}
            >
              <ArrowUpDown className="w-3 h-3" />
              <span>{locale==='en'?'Sort':'切换排序'}</span>
            </button>
            {sortOpen && (
              <>
                <div className="absolute right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                  <button
                    onClick={()=>{ setCurrentSort('publishDateDesc'); setSortOpen(false); fetchPolicies(true) }}
                    className={`w-full px-3 h-9 text-left text-[12px] hover:bg-gray-50 inline-flex items-center gap-2 ${currentSort==='publishDateDesc'?'text-[#00b899] font-semibold':''}`}
                  >
                    <Clock className="w-4 h-4" />{locale==='en'?'Publish date (newest)':'发布日期（最新）'}
                  </button>
                  <button
                    onClick={()=>{ setCurrentSort('publishDateAsc'); setSortOpen(false); fetchPolicies(true) }}
                    className={`w-full px-3 h-9 text-left text-[12px] hover:bg-gray-50 inline-flex items-center gap-2 ${currentSort==='publishDateAsc'?'text-[#00b899] font-semibold':''}`}
                  >
                    <Clock className="w-4 h-4" />{locale==='en'?'Publish date (oldest)':'发布日期（最早）'}
                  </button>
                  <button
                    onClick={()=>{ setCurrentSort('nameAsc'); setSortOpen(false); fetchPolicies(true) }}
                    className={`w-full px-3 h-9 text-left text-[12px] hover:bg-gray-50 inline-flex items-center gap-2 ${currentSort==='nameAsc'?'text-[#00b899] font-semibold':''}`}
                  >
                    <ArrowUpAZ className="w-4 h-4" />{locale==='en'?'Name A-Z':'名称升序'}
                  </button>
                  <button
                    onClick={()=>{ setCurrentSort('nameDesc'); setSortOpen(false); fetchPolicies(true) }}
                    className={`w-full px-3 h-9 text-left text-[12px] hover:bg-gray-50 inline-flex items-center gap-2 ${currentSort==='nameDesc'?'text-[#00b899] font-semibold':''}`}
                  >
                    <ArrowDownAZ className="w-4 h-4" />{locale==='en'?'Name Z-A':'名称降序'}
                  </button>
                </div>
                <div className="fixed inset-0 z-40" onClick={()=>setSortOpen(false)} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="px-3 mt-4 pb-20 space-y-3">
        {policies.map((p) => {
          const locationChips: string[] = []
          const lvl = levelLabel(p.level)
          if (lvl) locationChips.push(lvl)
          if (p.level === 'ministry' && p.ministryUnit) {
            locationChips.push(p.ministryUnit)
          }
          if (p.province?.name) locationChips.push(p.province.name)
          if (p.developmentZone?.name) locationChips.push(p.developmentZone.name)

          return (
            <article
              key={p.id}
              className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-[15px] font-semibold text-gray-900 leading-snug line-clamp-2">
                    {p.name}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `${locale === 'en' ? '/en' : '/zh'}/m/policy/${p.id}`,
                    )
                  }
                  className="shrink-0 px-2 h-6 rounded-full bg-[#00b899] text-white text-[11px] leading-none flex items-center"
                >
                  {locale === 'en' ? 'Details' : '查看详情'}
                </button>
              </div>

              {p.summary && (
                <p className="mt-2 text-[12px] text-gray-700 leading-relaxed line-clamp-5 break-words">
                  {p.summary}
                </p>
              )}

              <div className="mt-3 flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                  {locationChips.map((text, idx) => (
                    <span
                      key={`${p.id}-loc-${idx}`}
                      className="px-2 h-6 inline-flex items-center rounded-lg bg-[#eef2ff] text-[#4b50d4] text-[11px] shrink-0"
                    >
                      {text}
                    </span>
                  ))}
                  {p.tags &&
                    p.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-2 h-6 inline-flex items-center rounded-lg bg-gray-100 text-gray-700 text-[11px] shrink-0"
                      >
                        {tag.name}
                      </span>
                    ))}
                </div>
                {p.publishDate && (
                  <div className="shrink-0 text-right text-[11px] text-gray-500 whitespace-nowrap">
                    {locale === 'en' ? 'Published' : '发布日期'}：{p.publishDate}
                  </div>
                )}
              </div>
            </article>
          )
        })}

        {!loadingList && policies.length === 0 && (
          <div className="py-16 text-center text-[13px] text-gray-500">
            {locale === 'en'
              ? 'No policy found, adjust your filters and try again.'
              : '暂未找到符合条件的政策，试试调整筛选条件。'}
          </div>
        )}

        {canLoadMore && (
          <div className="pt-2 pb-10 flex justify-center">
            <button
              type="button"
              onClick={() => fetchPolicies(false)}
              disabled={loadingList}
              className={`w-full h-10 rounded-xl text-[14px] border ${
                loadingList
                  ? 'text-gray-400 border-gray-200 bg-gray-100'
                  : 'text-[#00b899] border-[#a7f3d0] bg-[#ecfdf5]'
              }`}
            >
              {loadingList
                ? locale === 'en'
                  ? 'Loading...'
                  : '加载中...'
                : locale === 'en'
                  ? 'Load more'
                  : '加载更多'}
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
