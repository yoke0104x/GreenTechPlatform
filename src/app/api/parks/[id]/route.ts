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

interface DevelopmentZoneRow {
  id: string
  name_zh: string
  name_en: string | null
  code: string | null
}

interface TagRelationRow {
  tag_id: string
}

interface TagRow {
  id: string
  name: string
  code: string
}

interface EconRow {
  year: number
  gdp_billion: number | null
  tax_revenue_billion: number | null
  industrial_output_billion: number | null
  fixed_asset_investment_billion: number | null
  utilized_foreign_capital_billion_usd: number | null
  total_import_export_billion_usd: number | null
  total_import_billion_usd: number | null
  total_export_billion_usd: number | null
  world_top500_count: number | null
}

interface GreenRow {
  year: number
  metrics: Record<string, number | string | null>
}

interface HonorRow {
  id: string
  year: number | null
  title: string
  type: string | null
  approved_at: string | null
  sort_order: number | null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    if (!supabaseAdmin) {
      console.error('supabaseAdmin is not available')
      return NextResponse.json({ error: '服务配置错误' }, { status: 500 })
    }

    const parkId = params.id
    if (!parkId) {
      return NextResponse.json({ error: '缺少园区ID' }, { status: 400 })
    }

    const { data: park, error: parkError } = await supabaseAdmin
      .from('parks')
      .select('*')
      .eq('id', parkId)
      .eq('is_active', true)
      .maybeSingle()

    if (parkError) {
      console.error('查询园区详情失败:', parkError)
      return NextResponse.json(
        { error: '查询园区详情失败: ' + parkError.message },
        { status: 500 },
      )
    }

    if (!park) {
      return NextResponse.json(
        { error: '园区不存在或已下线' },
        { status: 404 },
      )
    }

    const [provinceRow, zoneRow, tagsRelationRows] = await Promise.all([
      park.province_id
        ? supabaseAdmin
            .from('admin_provinces')
            .select('id, name_zh, name_en, code')
            .eq('id', park.province_id)
            .maybeSingle<ProvinceRow>()
        : Promise.resolve({ data: null as ProvinceRow | null }),
      park.development_zone_id
        ? supabaseAdmin
            .from('admin_development_zones')
            .select('id, name_zh, name_en, code')
            .eq('id', park.development_zone_id)
            .maybeSingle<DevelopmentZoneRow>()
        : Promise.resolve({ data: null as DevelopmentZoneRow | null }),
      supabaseAdmin
        .from('park_tag_relations')
        .select('tag_id')
        .eq('park_id', park.id),
    ])

    const tagIds = Array.from(
      new Set((tagsRelationRows.data || []).map((r: TagRelationRow) => r.tag_id).filter(Boolean)),
    ) as string[]

    const { data: tagRows, error: tagError } = tagIds.length
      ? await supabaseAdmin
          .from('park_tags')
          .select('id, name, code')
          .in('id', tagIds)
      : { data: [] as TagRow[], error: null }

    if (tagError) {
      console.error('查询园区标签失败:', tagError)
      return NextResponse.json(
        { error: '查询园区标签失败: ' + tagError.message },
        { status: 500 },
      )
    }

    const { data: econRows } = await supabaseAdmin
      .from('park_economic_stats')
      .select('*')
      .eq('park_id', park.id)
      .order('year', { ascending: false })

    const { data: greenRows } = await supabaseAdmin
      .from('park_green_stats')
      .select('*')
      .eq('park_id', park.id)
      .order('year', { ascending: false })

    const { data: honorRows, error: honorError } = await supabaseAdmin
      .from('park_brand_honors')
      .select('id, park_id, year, title, type, approved_at, sort_order')
      .eq('park_id', park.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true, nullsFirst: true })
      .order('approved_at', { ascending: false, nullsFirst: false })
      .order('year', { ascending: false })
      .order('created_at', { ascending: false })

    if (honorError) {
      console.error('查询园区品牌荣誉失败:', honorError)
    }

    const province = provinceRow.data
      ? {
          id: provinceRow.data.id,
          name: provinceRow.data.name_zh,
          nameEn: provinceRow.data.name_en,
          code: provinceRow.data.code,
        }
      : null

    const developmentZone = zoneRow.data
      ? {
          id: zoneRow.data.id,
          name: zoneRow.data.name_zh,
          nameEn: zoneRow.data.name_en,
          code: zoneRow.data.code,
        }
      : null

    const tags = (tagRows || []).map((t: TagRow) => ({
      id: t.id,
      name: t.name,
      code: t.code,
    }))

    const economicStats = (econRows || []).map((row: EconRow) => ({
      year: row.year,
      gdpBillion: row.gdp_billion,
      taxRevenueBillion: row.tax_revenue_billion,
      industrialOutputBillion: row.industrial_output_billion,
      fixedAssetInvestmentBillion: row.fixed_asset_investment_billion,
      utilizedForeignCapitalBillionUsd: row.utilized_foreign_capital_billion_usd,
      totalImportExportBillionUsd: row.total_import_export_billion_usd,
      totalImportBillionUsd: row.total_import_billion_usd,
      totalExportBillionUsd: row.total_export_billion_usd,
      worldTop500Count: row.world_top500_count,
    }))

    const greenStats = (greenRows || []).map((row: GreenRow) => ({
      year: row.year,
      metrics: row.metrics || {},
    }))

    let brandHonors =
      (honorRows || []).map((row: HonorRow) => ({
        id: row.id,
        year: row.year,
        title: row.title,
        type: row.type,
        approvedAt: row.approved_at,
        sortOrder: row.sort_order,
      })) || []

    // 兼容早期直接存储在 parks.brand_honors 数组中的数据
    if (
      (!brandHonors || brandHonors.length === 0) &&
      Array.isArray(park.brand_honors) &&
      park.brand_honors.length > 0
    ) {
      brandHonors = park.brand_honors.map((raw: string, index: number) => {
        if (!raw) {
          return {
            id: `${park.id}-${index}`,
            year: null,
            title: '',
            type: null,
          }
        }
        const match = raw.match(/\b(19|20)\d{2}\b/)
        const year = match ? Number(match[0]) : null
        const title = match
          ? raw.replace(match[0], '').trim().replace(/^[\s\-–—]+/, '')
          : raw.trim()
        return {
          id: `${park.id}-${index}`,
          year: Number.isNaN(year) ? null : year,
          title,
          type: null,
        }
      }).filter((h) => h.title)
    }

    const detail = {
      id: park.id,
      name: park.name_zh,
      nameEn: park.name_en,
      level: park.level,
      levelCode: park.level_code,
      logoUrl: park.logo_url,
      province,
      developmentZone,
      city: park.city,
      address: park.address,
      areaKm2: park.area_km2,
      population: park.population,
      establishedDate: park.established_date,
      websiteUrl: park.website_url,
      wechatOfficialAccount: park.wechat_official_account,
      leadingIndustries: park.leading_industries,
      leadingCompanies: park.leading_companies,
      alias: park.alias,
      dialect: park.dialect,
      climate: park.climate,
      regionDesc: park.region_desc,
      nearbyAirports: park.nearby_airports,
      nearbyRailwayStations: park.nearby_railway_stations,
      famousScenicSpots: park.famous_scenic_spots,
      licensePlateCode: park.license_plate_code,
      phoneAreaCode: park.phone_area_code,
      postalCode: park.postal_code,
      briefZh: park.brief_zh,
      briefEn: park.brief_en,
      brandHonors,
      tags,
      economicStats,
      greenStats,
      updatedAt: park.updated_at,
      createdAt: park.created_at,
    }

    return NextResponse.json({ success: true, data: detail })
  } catch (error) {
    console.error('园区详情API错误:', error)
    return NextResponse.json(
      {
        error:
          '服务器内部错误: ' +
          (error instanceof Error ? error.message : '未知错误'),
      },
      { status: 500 },
    )
  }
}
