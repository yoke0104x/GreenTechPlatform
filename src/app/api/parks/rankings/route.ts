import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type RankingKind = 'ranking' | 'brand'

interface RankListRow {
  id: string
  title_zh: string
  title_en: string | null
  park_level: string
  kind: RankingKind
}

interface RankYearRow {
  id: string
  list_id: string
  year: number
  is_latest: boolean
}

interface ProvinceRow {
  id: string
  name_zh: string
  name_en: string | null
  code: string | null
}

interface ParkRow {
  id: string
  name_zh: string
  name_en: string | null
  logo_url: string | null
  province: ProvinceRow | null
}

interface EntryRow {
  rank: number
  park_id: string | null
  park: ParkRow | null
}

const ALLOWED_KINDS: RankingKind[] = ['ranking', 'brand']
const ALLOWED_LEVELS = ['国家级经济技术开发区', '国家级高新技术产业开发区'] as const

function parseYearParam(raw: string | null): { mode: 'latest' } | { mode: 'year'; year: number } {
  if (!raw) return { mode: 'latest' }
  const v = raw.trim()
  if (!v || v === 'latest') return { mode: 'latest' }
  const parsed = Number(v.replace(/[^\d]/g, ''))
  if (!Number.isNaN(parsed) && parsed >= 1900 && parsed <= 2100) {
    return { mode: 'year', year: parsed }
  }
  return { mode: 'latest' }
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: '服务配置错误' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const parkLevel = (searchParams.get('parkLevel') || '').trim()
    const kindParam = (searchParams.get('kind') || 'ranking').trim()
    const kind = (ALLOWED_KINDS.includes(kindParam as RankingKind) ? kindParam : 'ranking') as RankingKind
    const yearParam = parseYearParam(searchParams.get('year'))

    const validParkLevel = parkLevel && (ALLOWED_LEVELS as readonly string[]).includes(parkLevel)
      ? parkLevel
      : ''

    let listQuery = supabaseAdmin
      .from('park_rank_lists')
      .select('id, title_zh, title_en, park_level, kind')
      .eq('is_active', true)
      .eq('kind', kind)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })

    if (validParkLevel) {
      listQuery = listQuery.eq('park_level', validParkLevel)
    }

    const { data: lists, error: listError } = await listQuery
    if (listError) {
      console.error('查询榜单列表失败:', listError)
      return NextResponse.json({ success: false, error: listError.message }, { status: 500 })
    }

    const listRows = (lists || []) as RankListRow[]
    if (listRows.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          kind,
          parkLevel: validParkLevel || null,
          selectedYear: null,
          yearOptions: [],
          items: [],
        },
      })
    }

    const listIds = listRows.map((l) => l.id)

    const { data: yearRows, error: yearError } = await supabaseAdmin
      .from('park_rank_years')
      .select('id, list_id, year, is_latest')
      .in('list_id', listIds)
      .eq('is_active', true)
      .eq('is_published', true)

    if (yearError) {
      console.error('查询榜单年度失败:', yearError)
      return NextResponse.json({ success: false, error: yearError.message }, { status: 500 })
    }

    const typedYearRows = (yearRows || []) as RankYearRow[]
    const years = Array.from(new Set(typedYearRows.map((y) => y.year))).sort((a, b) => b - a)

    const latestCandidates = typedYearRows.filter((y) => y.is_latest).map((y) => y.year)

    const latestYear = latestCandidates.length ? Math.max(...latestCandidates) : years[0]
    const selectedYear =
      yearParam.mode === 'year' && years.includes(yearParam.year) ? yearParam.year : latestYear

    const yearOptions = years.map((y) => ({
      year: y,
      isLatest: y === latestYear,
    }))

    const listToYearId = new Map<string, string>()
    const listToPrevYearId = new Map<string, string>()
    for (const row of typedYearRows) {
      if (row.year === selectedYear) {
        listToYearId.set(row.list_id, row.id)
      }
      if (row.year < selectedYear) {
        const prev = listToPrevYearId.get(row.list_id)
        if (!prev) {
          listToPrevYearId.set(row.list_id, row.id)
        } else {
          const prevYear = typedYearRows.find((y) => y.id === prev)?.year ?? -Infinity
          if (row.year > prevYear) {
            listToPrevYearId.set(row.list_id, row.id)
          }
        }
      }
    }

    const entriesByListId = await Promise.all(
      listRows.map(async (l) => {
        const yearId = listToYearId.get(l.id)
        if (!yearId) {
          return { listId: l.id, entries: [] as EntryRow[], prevMap: new Map<string, number>() }
        }

        let prevMap = new Map<string, number>()
        const prevYearId = listToPrevYearId.get(l.id)
        if (prevYearId && supabaseAdmin) {
          const { data: prevRows, error: prevErr } = await supabaseAdmin
            .from('park_rank_entries')
            .select('rank, park_id')
            .eq('year_id', prevYearId)
            .eq('is_active', true)
            .order('rank', { ascending: true })
          if (prevErr) {
            console.warn('查询上一年度榜单条目失败:', { listId: l.id, error: prevErr })
          } else {
            prevMap = new Map((prevRows || []).map((r) => [r.park_id as string, r.rank as number]))
          }
        }

        const { data: entryRows, error: entryError } = await supabaseAdmin!
          .from('park_rank_entries')
          .select(
            `
            rank,
            park_id,
            park:parks(
              id,
              name_zh,
              name_en,
              logo_url,
              province:admin_provinces(id, name_zh, name_en, code)
            )
          `,
          )
          .eq('year_id', yearId)
          .eq('is_active', true)
          .order('rank', { ascending: true })

        if (entryError) {
          console.error('查询榜单条目失败:', { listId: l.id, error: entryError })
          return { listId: l.id, entries: [] as EntryRow[], prevMap }
        }
        return { listId: l.id, entries: (entryRows || []) as EntryRow[], prevMap }
      }),
    )

    const entriesMap = new Map(entriesByListId.map((r) => [r.listId, r.entries]))
    const prevMaps = new Map(entriesByListId.map((r) => [r.listId, r.prevMap]))

    const items = listRows.map((l) => {
      const rawEntries = entriesMap.get(l.id) || []
      const prevMap = prevMaps.get(l.id) as Map<string, number> | undefined
      const entries = rawEntries.map((r) => ({
        rank: r.rank,
        previousRank: r.park_id && prevMap ? prevMap.get(r.park_id) ?? null : null,
        park: r.park
          ? {
              id: r.park.id,
              nameZh: r.park.name_zh,
              nameEn: r.park.name_en,
              logoUrl: r.park.logo_url,
              province: r.park.province
                ? {
                    id: r.park.province.id,
                    nameZh: r.park.province.name_zh,
                    nameEn: r.park.province.name_en,
                    code: r.park.province.code,
                  }
                : null,
            }
          : null,
      }))

      return {
        id: l.id,
        titleZh: l.title_zh,
        titleEn: l.title_en,
        parkLevel: l.park_level,
        kind: l.kind,
        year: selectedYear,
        entries,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        kind,
        parkLevel: validParkLevel || null,
        selectedYear,
        yearOptions,
        items,
      },
    })
  } catch (e) {
    console.error('榜单 GET API 错误:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
