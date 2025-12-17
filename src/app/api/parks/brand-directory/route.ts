import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

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
  level: string | null
  logo_url: string | null
  province: ProvinceRow | null
}

interface HonorRow {
  id: string
  park_id: string
  title: string
  type: string | null
  approved_at: string | null
  year: number | null
  park: ParkRow | null
}

interface TagRow {
  title: string
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: '服务配置错误' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title')?.trim() || ''

    const { data: tagRows, error: tagError } = await supabaseAdmin
      .from('park_brand_honors')
      .select('title')
      .eq('is_active', true)
      .order('title', { ascending: true })

    if (tagError) {
      console.error('获取品牌名录标签失败:', tagError)
      return NextResponse.json({ success: false, error: tagError.message }, { status: 500 })
    }

    const tags = Array.from(new Set((tagRows as TagRow[] | null | undefined)?.map((r) => r.title).filter(Boolean) || [])).sort((a, b) =>
      a.localeCompare(b, 'zh-Hans-CN'),
    )

    let query = supabaseAdmin
      .from('park_brand_honors')
      .select(
        `
        id,
        park_id,
        title,
        type,
        approved_at,
        year,
        park:parks(
          id,
          name_zh,
          name_en,
          level,
          logo_url,
          province:admin_provinces(id, name_zh, name_en, code)
        )
      `,
      )
      .eq('is_active', true)

    if (title) {
      query = query.eq('title', title)
    }

    const { data, error } = await query
      .order('sort_order', { ascending: true, nullsFirst: true })
      .order('approved_at', { ascending: false, nullsFirst: false })
      .order('year', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('获取品牌名录失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const rows = (data || []) as unknown as HonorRow[]

    const groups = new Map<string, HonorRow[]>()
    for (const r of rows) {
      const key = r.title
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(r)
    }

    const items = Array.from(groups.entries()).map(([groupTitle, list]) => ({
      title: groupTitle,
      entries: list.map((r) => ({
        id: r.id,
        approvedAt: r.approved_at,
        year: r.year,
        type: r.type,
        park: r.park
          ? {
              id: r.park.id,
              nameZh: r.park.name_zh,
              nameEn: r.park.name_en,
              level: r.park.level,
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
      })),
    }))

    return NextResponse.json({
      success: true,
      data: {
        tags,
        items,
      },
    })
  } catch (e) {
    console.error('品牌名录 GET API 错误:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
