import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 使用服务角色密钥来绕过 RLS
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://qpeanozckghazlzzhrni.supabase.co'
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwZWFub3pja2doYXpsenpocm5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI4NTg1MCwiZXhwIjoyMDY5ODYxODUwfQ.wE2j1kNbMKkQgZSkzLR7z6WFft6v90VfWkSd5SBi2P8'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const dynamic = 'force-dynamic'

// GET - 单个园区详情（管理端）
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params
    if (!id) {
      return NextResponse.json({ error: '缺少园区ID' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('parks')
      .select(
        `
        *,
        province:admin_provinces(id, name_zh, name_en, code),
        development_zone:admin_development_zones(id, name_zh, name_en, code)
      `,
      )
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('获取园区详情失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: '园区不存在' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('园区详情API错误:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// PUT - 更新园区基础信息
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params
    if (!id) {
      return NextResponse.json({ error: '缺少园区ID' }, { status: 400 })
    }

    const body = await request.json()

    const {
      name_zh,
      name_en,
      logo_url,
      level,
      level_code,
      province_id,
      development_zone_id,
      city,
      city_en,
      address,
      address_en,
      website_url,
      wechat_official_account,
      leading_industries,
      leading_industries_en,
      leading_companies,
      leading_companies_en,
      alias,
      alias_en,
      dialect,
      dialect_en,
      climate,
      climate_en,
      region_desc,
      region_desc_en,
      nearby_airports,
      nearby_airports_en,
      nearby_railway_stations,
      nearby_railway_stations_en,
      famous_scenic_spots,
      famous_scenic_spots_en,
      license_plate_code,
      phone_area_code,
      postal_code,
      brief_zh,
      brief_en,
      is_active,
      sort_rank,
    } = body || {}

    if (!name_zh || typeof name_zh !== 'string') {
      return NextResponse.json(
        { error: '园区中文名称为必填项' },
        { status: 400 },
      )
    }

    if (level === '国家级经济技术开发区' && !development_zone_id) {
      return NextResponse.json(
        { error: '国家级经济技术开发区必须选择对应经开区' },
        { status: 400 },
      )
    }

    const updatePayload: Record<string, any> = {
      name_zh,
      name_en: name_en ?? null,
      logo_url: logo_url ?? null,
      level: level ?? null,
      level_code: level_code ?? null,
      province_id: province_id ?? null,
      development_zone_id: development_zone_id ?? null,
      city: city ?? null,
      city_en: city_en ?? null,
      address: address ?? null,
      address_en: address_en ?? null,
      website_url: website_url ?? null,
      wechat_official_account: wechat_official_account ?? null,
      leading_industries: leading_industries ?? null,
      leading_industries_en: leading_industries_en ?? null,
      leading_companies: leading_companies ?? null,
      leading_companies_en: leading_companies_en ?? null,
      alias: alias ?? null,
      alias_en: alias_en ?? null,
      dialect: dialect ?? null,
      dialect_en: dialect_en ?? null,
      climate: climate ?? null,
      climate_en: climate_en ?? null,
      region_desc: region_desc ?? null,
      region_desc_en: region_desc_en ?? null,
      nearby_airports: nearby_airports ?? null,
      nearby_airports_en: nearby_airports_en ?? null,
      nearby_railway_stations: nearby_railway_stations ?? null,
      nearby_railway_stations_en: nearby_railway_stations_en ?? null,
      famous_scenic_spots: famous_scenic_spots ?? null,
      famous_scenic_spots_en: famous_scenic_spots_en ?? null,
      license_plate_code: license_plate_code ?? null,
      phone_area_code: phone_area_code ?? null,
      postal_code: postal_code ?? null,
      brief_zh: brief_zh ?? null,
      brief_en: brief_en ?? null,
      is_active: typeof is_active === 'boolean' ? is_active : undefined,
      updated_at: new Date().toISOString(),
      sort_rank:
        typeof sort_rank === 'number' || typeof sort_rank === 'string'
          ? Number(sort_rank)
          : undefined,
    }

    // 去除 undefined 字段，避免无意义更新
    Object.keys(updatePayload).forEach((key) => {
      if (updatePayload[key] === undefined) {
        delete updatePayload[key]
      }
    })

    const { data, error } = await supabase
      .from('parks')
      .update(updatePayload)
      .eq('id', id)
      .select(
        `
        *,
        province:admin_provinces(id, name_zh, name_en, code),
        development_zone:admin_development_zones(id, name_zh, name_en, code)
      `,
      )
      .single()

    if (error) {
      console.error('更新园区失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: '园区不存在' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('更新园区API错误:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// DELETE - 删除园区（国家级经开区时同步禁用对应经开区）
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { id } = params
    if (!id) {
      return NextResponse.json({ error: '缺少园区ID' }, { status: 400 })
    }

    // 先拿到园区及其经开区信息
    const { data: park, error: fetchError } = await supabase
      .from('parks')
      .select('id, level, development_zone_id')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      console.error('查询园区失败:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!park) {
      return NextResponse.json({ error: '园区不存在' }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from('parks')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('删除园区失败:', deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // 如果是国家级经开区园区，同步禁用对应经开区
    if (
      park.level === '国家级经济技术开发区' &&
      park.development_zone_id
    ) {
      const { error: zoneError } = await supabase
        .from('admin_development_zones')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', park.development_zone_id)

      if (zoneError) {
        console.error('同步禁用经开区失败:', zoneError)
        // 不阻断园区删除结果，仅记录日志
      }
    }

    return NextResponse.json({ success: true, message: '园区删除成功' })
  } catch (error) {
    console.error('删除园区API错误:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
