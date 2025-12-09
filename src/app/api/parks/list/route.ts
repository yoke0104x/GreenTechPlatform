import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// 园区列表与筛选接口
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      console.error('supabaseAdmin is not available')
      return NextResponse.json({ error: '服务配置错误' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)

    const keyword = searchParams.get('keyword')?.trim() || ''
    const level = searchParams.get('level')?.trim() || ''
    const provinceParam = searchParams.get('province')?.trim() || ''
    const developmentZoneParam = searchParams.get('developmentZone')?.trim() || ''
    const tagIdsParam = searchParams.get('tags') || ''
    const sortBy = searchParams.get('sortBy') || 'updatedAtDesc'

    let page = parseInt(searchParams.get('page') || '1', 10)
    let pageSize = parseInt(searchParams.get('pageSize') || '10', 10)

    if (Number.isNaN(page) || page < 1) page = 1
    if (Number.isNaN(pageSize) || pageSize < 1) pageSize = 10
    pageSize = Math.min(pageSize, 50)

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const tagIds = tagIdsParam
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    console.log('📥 园区列表参数:', {
      keyword,
      level,
      provinceParam,
      developmentZoneParam,
      tagIdsCount: tagIds.length,
      sortBy,
      page,
      pageSize,
    })

    let query = supabaseAdmin
      .from('parks')
      .select('*', { count: 'exact' })
      .eq('is_active', true)

    if (keyword) {
      query = query.or(
        `name_zh.ilike.%${keyword}%,name_en.ilike.%${keyword}%,brief_zh.ilike.%${keyword}%,brief_en.ilike.%${keyword}%`,
      )
    }

    if (level) {
      query = query.eq('level', level)
    }

    // 省份筛选：支持传 code 或 UUID
    if (provinceParam) {
      let provinceId: string | null = null
      if (provinceParam.includes('-') && provinceParam.length > 30) {
        provinceId = provinceParam
      } else {
        const { data, error } = await supabaseAdmin
          .from('admin_provinces')
          .select('id')
          .eq('code', provinceParam)
          .single()
        if (!error && data) {
          provinceId = data.id as string
        } else {
          console.warn('未找到省份:', provinceParam, error)
        }
      }
      if (provinceId) {
        query = query.eq('province_id', provinceId)
      }
    }

    // 经开区筛选：支持传 code 或 UUID，对应 admin_development_zones
    if (developmentZoneParam) {
      let zoneId: string | null = null
      if (developmentZoneParam.includes('-') && developmentZoneParam.length > 30) {
        zoneId = developmentZoneParam
      } else {
        const { data, error } = await supabaseAdmin
          .from('admin_development_zones')
          .select('id')
          .eq('code', developmentZoneParam)
          .single()
        if (!error && data) {
          zoneId = data.id as string
        } else {
          console.warn('未找到经开区:', developmentZoneParam, error)
        }
      }
      if (zoneId) {
        query = query.eq('development_zone_id', zoneId)
      }
    }

    // 如果存在标签筛选，通过 park_tag_relations 预先筛出符合条件的 park_id
    if (tagIds.length > 0) {
      const { data: relationRows, error: relationError } = await supabaseAdmin
        .from('park_tag_relations')
        .select('park_id, tag_id')
        .in('tag_id', tagIds)

      if (relationError) {
        console.error('查询园区标签关联失败:', relationError)
        return NextResponse.json(
          { error: '标签筛选失败: ' + relationError.message },
          { status: 500 },
        )
      }

      const parkIds = Array.from(
        new Set((relationRows || []).map((r: any) => r.park_id).filter(Boolean)),
      ) as string[]

      if (parkIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            items: [],
            total: 0,
            page,
            pageSize,
            totalPages: 0,
          },
        })
      }

      query = query.in('id', parkIds)
    }

    let orderField = 'updated_at'
    let orderAscending = false
    switch (sortBy) {
      case 'nameAsc':
        orderField = 'name_zh'
        orderAscending = true
        break
      case 'nameDesc':
        orderField = 'name_zh'
        orderAscending = false
        break
      case 'updatedAtAsc':
        orderField = 'updated_at'
        orderAscending = true
        break
      case 'updatedAtDesc':
      default:
        orderField = 'updated_at'
        orderAscending = false
    }

    const { data: parks, error, count } = await query
      .order(orderField, { ascending: orderAscending })
      .order('id', { ascending: true })
      .range(from, to)

    if (error) {
      console.error('查询园区列表失败:', error)
      return NextResponse.json(
        { error: '查询失败: ' + error.message },
        { status: 500 },
      )
    }

    const parkList = parks || []
    const total = count || 0

    console.log(`🎯 园区查询完成: 总数 ${total}, 当前返回 ${parkList.length} 条`)

    if (parkList.length === 0) {
      const emptyResponse = NextResponse.json({
        success: true,
        data: {
          items: [],
          total,
          page,
          pageSize,
          totalPages: 0,
        },
      })
      emptyResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      emptyResponse.headers.set('Pragma', 'no-cache')
      emptyResponse.headers.set('Expires', '0')
      return emptyResponse
    }

    const provinceIds = Array.from(
      new Set(parkList.map((p: any) => p.province_id).filter(Boolean)),
    ) as string[]
    const zoneIds = Array.from(
      new Set(parkList.map((p: any) => p.development_zone_id).filter(Boolean)),
    ) as string[]

    const [provincesData, zonesData, tagRelationsRows] = await Promise.all([
      provinceIds.length > 0
        ? supabaseAdmin
            .from('admin_provinces')
            .select('id, name_zh, name_en, code')
            .in('id', provinceIds)
        : Promise.resolve({ data: [] } as any),
      zoneIds.length > 0
        ? supabaseAdmin
            .from('admin_development_zones')
            .select('id, name_zh, name_en, code')
            .in('id', zoneIds)
        : Promise.resolve({ data: [] } as any),
      supabaseAdmin
        .from('park_tag_relations')
        .select('park_id, tag_id')
        .in(
          'park_id',
          parkList.map((p: any) => p.id as string),
        ),
    ])

    const provincesMap = new Map(
      (provincesData.data || []).map((p: any) => [p.id, p]),
    )
    const zonesMap = new Map(
      (zonesData.data || []).map((z: any) => [z.id, z]),
    )

    const tagIdsForParks = Array.from(
      new Set((tagRelationsRows.data || []).map((r: any) => r.tag_id).filter(Boolean)),
    ) as string[]
    const { data: tagRows, error: tagError } = tagIdsForParks.length
      ? await supabaseAdmin
          .from('park_tags')
          .select('id, name, code')
          .in('id', tagIdsForParks)
      : { data: [], error: null as any }

    if (tagError) {
      console.error('查询园区标签失败:', tagError)
      return NextResponse.json(
        { error: '查询园区标签失败: ' + tagError.message },
        { status: 500 },
      )
    }

    const tagsMap = new Map(
      (tagRows || []).map((t: any) => [t.id, t]),
    )
    const tagsByParkId = new Map<string, string[]>()
    ;(tagRelationsRows.data || []).forEach((row: any) => {
      const list = tagsByParkId.get(row.park_id) || []
      list.push(row.tag_id)
      tagsByParkId.set(row.park_id, list)
    })

    const items = parkList.map((p: any) => {
      const province = p.province_id ? (provincesMap.get(p.province_id) as any) : null
      const zone = p.development_zone_id
        ? (zonesMap.get(p.development_zone_id) as any)
        : null

      const tagIdList = tagsByParkId.get(p.id) || []
      const tags = tagIdList
        .map((id) => tagsMap.get(id))
        .filter(Boolean)
        .map((t: any) => ({
          id: t.id,
          name: t.name,
          code: t.code,
        }))

      return {
        id: p.id,
        name: p.name_zh,
        nameEn: p.name_en,
        level: p.level,
        levelCode: p.level_code,
        logoUrl: p.logo_url,
        brief: p.brief_zh || p.brief_en,
        updatedAt: p.updated_at,
        province: province
          ? {
              id: province.id,
              name: province.name_zh,
              nameEn: province.name_en,
              code: province.code,
            }
          : null,
        developmentZone: zone
          ? {
              id: zone.id,
              name: zone.name_zh,
              nameEn: zone.name_en,
              code: zone.code,
            }
          : null,
        tags,
      }
    })

    const totalPages = Math.ceil(total / pageSize)

    const response = NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages,
      },
    })

    const hasFilters =
      !!keyword || !!level || !!provinceParam || !!developmentZoneParam || tagIds.length > 0

    if (hasFilters) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
    } else {
      response.headers.set(
        'Cache-Control',
        'public, max-age=60, stale-while-revalidate=120',
      )
    }

    return response
  } catch (error) {
    console.error('园区列表API错误:', error)
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

