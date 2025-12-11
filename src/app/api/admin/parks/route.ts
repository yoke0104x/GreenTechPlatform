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

// GET - 获取园区列表（分页）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    let page = parseInt(searchParams.get('page') || '1', 10)
    let pageSize = parseInt(searchParams.get('pageSize') || '10', 10)
    const search = searchParams.get('search')?.trim() || ''
    const sortByParam = searchParams.get('sortBy') || 'updated_at'
    const sortOrderParam = searchParams.get('sortOrder') || 'desc'
    const level = searchParams.get('level')?.trim() || ''
    const provinceId = searchParams.get('provinceId')?.trim() || ''
    const developmentZoneId =
      searchParams.get('developmentZoneId')?.trim() || ''

    if (Number.isNaN(page) || page < 1) page = 1
    if (Number.isNaN(pageSize) || pageSize < 1) pageSize = 10
    pageSize = Math.min(pageSize, 50)

    const allowedSortFields = ['name_zh', 'updated_at', 'created_at', 'level', 'sort_rank']
    const sortBy = allowedSortFields.includes(sortByParam)
      ? sortByParam
      : 'updated_at'
    const sortOrder =
      sortOrderParam === 'asc' || sortOrderParam === 'desc'
        ? sortOrderParam
        : 'desc'

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('parks')
      .select(
        `
        *,
        province:admin_provinces(id, name_zh, name_en, code),
        development_zone:admin_development_zones(id, name_zh, name_en, code)
      `,
        { count: 'exact' },
      )
      .eq('is_active', true)

    if (search) {
      query = query.or(
        `name_zh.ilike.%${search}%,name_en.ilike.%${search}%,brief_zh.ilike.%${search}%,brief_en.ilike.%${search}%`,
      )
    }

    if (level) {
      query = query.eq('level', level)
    }

    if (provinceId) {
      query = query.eq('province_id', provinceId)
    }

    if (developmentZoneId) {
      query = query.eq('development_zone_id', developmentZoneId)
    }

    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    const { data, error, count } = await query.range(from, to)

    if (error) {
      console.error('获取园区列表失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let total = count ?? 0
    if (total === 0) {
      try {
        let countQuery = supabase
          .from('parks')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true)

        if (search) {
          countQuery = countQuery.or(
            `name_zh.ilike.%${search}%,name_en.ilike.%${search}%,brief_zh.ilike.%${search}%,brief_en.ilike.%${search}%`,
          )
        }
        if (level) countQuery = countQuery.eq('level', level)
        if (provinceId)
          countQuery = countQuery.eq('province_id', provinceId)
        if (developmentZoneId) {
          countQuery = countQuery.eq('development_zone_id', developmentZoneId)
        }

        const { count: fallbackCount, error: countError } =
          await countQuery
        if (!countError && typeof fallbackCount === 'number') {
          total = fallbackCount
        }
      } catch (e) {
        console.warn('园区总数统计兜底失败:', e)
      }
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('园区管理列表API错误:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// POST - 创建新园区（基础信息）
export async function POST(request: NextRequest) {
  try {
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
      address,
      website_url,
      wechat_official_account,
      leading_industries,
      leading_companies,
      alias,
      climate,
      region_desc,
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

    // 国家级经开区园区必须绑定经开区
    if (level === '国家级经济技术开发区' && !development_zone_id) {
      return NextResponse.json(
        { error: '国家级经济技术开发区必须选择对应经开区' },
        { status: 400 },
      )
    }

    const insertPayload: Record<string, any> = {
      name_zh,
      name_en: name_en || null,
      logo_url: logo_url || null,
      level: level || null,
      level_code: level_code || null,
      province_id: province_id || null,
      development_zone_id: development_zone_id || null,
      city: city || null,
      address: address || null,
      website_url: website_url || null,
      wechat_official_account: wechat_official_account || null,
      leading_industries: leading_industries || null,
      leading_companies: leading_companies || null,
      alias: alias || null,
      climate: climate || null,
      region_desc: region_desc || null,
      license_plate_code: license_plate_code || null,
      phone_area_code: phone_area_code || null,
      postal_code: postal_code || null,
      brief_zh: brief_zh || null,
      brief_en: brief_en || null,
      is_active: is_active ?? true,
      sort_rank: typeof sort_rank === 'number' ? sort_rank : null,
    }

    const { data, error } = await supabase
      .from('parks')
      .insert(insertPayload)
      .select(
        `
        *,
        province:admin_provinces(id, name_zh, name_en, code),
        development_zone:admin_development_zones(id, name_zh, name_en, code)
      `,
      )
      .single()

    if (error) {
      console.error('创建园区失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('创建园区API错误:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
