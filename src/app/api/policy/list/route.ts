import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// 政策列表与筛选接口
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
    const level = searchParams.get('level') as 'national' | 'ministry' | 'local' | 'park' | null
    const tagsParam = searchParams.get('tags') || ''
    const ministryUnitParam = searchParams.get('ministryUnit') || null
    const provinceParam = searchParams.get('province') || null
    const developmentZoneParam = searchParams.get('developmentZone') || null
    const publishDateFrom = searchParams.get('publishDateFrom') || null
    const publishDateTo = searchParams.get('publishDateTo') || null
    const sortBy = searchParams.get('sortBy') || 'publishDateDesc'

    let page = parseInt(searchParams.get('page') || '1', 10)
    let pageSize = parseInt(searchParams.get('pageSize') || '20', 10)

    if (Number.isNaN(page) || page < 1) page = 1
    if (Number.isNaN(pageSize) || pageSize < 1) pageSize = 20
    pageSize = Math.min(pageSize, 50)

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    const tagIds = tagsParam
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    console.log('📥 政策列表参数:', {
      keyword,
      level,
      tagIdsCount: tagIds.length,
      ministryUnitParam,
      provinceParam,
      developmentZoneParam,
      publishDateFrom,
      publishDateTo,
      sortBy,
      page,
      pageSize,
    })

    let query = supabaseAdmin
      .from('policy')
      .select('*', { count: 'exact' })
      .eq('status', 'active')

    if (keyword) {
      query = query.or(
        `name.ilike.%${keyword}%,doc_number.ilike.%${keyword}%,summary.ilike.%${keyword}%`,
      )
    }

    if (level && ['national', 'ministry', 'local', 'park'].includes(level)) {
      query = query.eq('level', level)
    }

    // 部委单位筛选：仅针对部委政策
    if (ministryUnitParam) {
      query = query.eq('ministry_unit', ministryUnitParam)
      // 如果未显式指定 level，这里不强制写死 level = 'ministry'，
      // 但当前前端约定仅在部委政策筛选场景下传入该参数。
    }

    // 解析省份 -> admin_provinces.id -> policy.region_id
    if (provinceParam) {
      console.log('🔍 开始解析省份参数:', provinceParam)
      let provinceId: string | null = null

      if (provinceParam.includes('-') && provinceParam.length > 30) {
        provinceId = provinceParam
        console.log('✅ 使用UUID作为省份ID:', provinceId)
      } else {
        const { data, error } = await supabaseAdmin
          .from('admin_provinces')
          .select('id')
          .eq('code', provinceParam)
          .single()

        if (!error && data) {
          provinceId = data.id as string
          console.log('✅ 通过code找到省份ID:', provinceParam, '->', provinceId)
        } else {
          console.log('❌ 未找到省份:', provinceParam, error)
        }
      }

      if (provinceId) {
        query = query.eq('region_id', provinceId)
      }
    }

    // 解析经开区 -> admin_development_zones.id
    // 新语义：policy.park_id 优先指向 parks.id（园区），其中国家级经开区园区通过 parks.development_zone_id 关联 admin_development_zones
    // 兼容旧数据：若未找到任何关联园区，则仍使用 zoneId 直接与 policy.park_id 比较
    if (developmentZoneParam) {
      console.log('🔍 开始解析经开区参数:', developmentZoneParam)
      let zoneId: string | null = null

      if (developmentZoneParam.includes('-') && developmentZoneParam.length > 30) {
        zoneId = developmentZoneParam
        console.log('✅ 使用UUID作为经开区ID:', zoneId)
      } else {
        const { data, error } = await supabaseAdmin
          .from('admin_development_zones')
          .select('id')
          .eq('code', developmentZoneParam)
          .single()

        if (!error && data) {
          zoneId = data.id as string
          console.log('✅ 通过code找到经开区ID:', developmentZoneParam, '->', zoneId)
        } else {
          console.log('❌ 未找到经开区:', developmentZoneParam, error)
        }
      }

      if (zoneId) {
        // 先查出该经开区下的园区（parks），按新语义通过园区ID过滤政策
        const { data: parkRows, error: parkError } = await supabaseAdmin
          .from('parks')
          .select('id')
          .eq('development_zone_id', zoneId)
          .eq('is_active', true)

        if (parkError) {
          console.error('按照经开区查询园区失败:', parkError)
          return NextResponse.json(
            { error: '经开区筛选失败: ' + parkError.message },
            { status: 500 },
          )
        }

        const parkIds = (parkRows || [])
          .map((p: any) => p.id as string)
          .filter(Boolean)

        if (parkIds.length > 0) {
          query = query.in('park_id', parkIds)
        } else {
          // 兼容旧数据：policy.park_id 仍然直接存储经开区ID
          query = query.eq('park_id', zoneId)
        }
      }
    }

    if (publishDateFrom) {
      query = query.gte('publish_date', publishDateFrom)
    }
    if (publishDateTo) {
      query = query.lte('publish_date', publishDateTo)
    }

    // 标签筛选：通过 policy_policy_tag 过滤出包含任一标签的政策
    if (tagIds.length > 0) {
      const { data: policyTagRows, error: tagError } = await supabaseAdmin
        .from('policy_policy_tag')
        .select('policy_id')
        .in('tag_id', tagIds)

      if (tagError) {
        console.error('查询政策标签关联失败:', tagError)
        return NextResponse.json(
          { error: '标签筛选失败: ' + tagError.message },
          { status: 500 },
        )
      }

      const policyIds = Array.from(
        new Set((policyTagRows || []).map((row: any) => row.policy_id).filter(Boolean)),
      ) as string[]

      if (policyIds.length === 0) {
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

      query = query.in('id', policyIds)
    }

    let orderField = 'publish_date'
    let orderAscending = false

    switch (sortBy) {
      case 'publishDateAsc':
        orderField = 'publish_date'
        orderAscending = true
        break
      case 'publishDateDesc':
      default:
        orderField = 'publish_date'
        orderAscending = false
        break
    }

    const { data: policies, error, count } = await query
      .order(orderField, { ascending: orderAscending })
      .order('id', { ascending: true })
      .range(from, to)

    if (error) {
      console.error('查询政策列表失败:', error)
      return NextResponse.json(
        { error: '查询失败: ' + error.message },
        { status: 500 },
      )
    }

    const policyList = policies || []
    const total = count || 0

    console.log(`🎯 政策查询完成: 总数 ${total}, 当前返回 ${policyList.length} 条`)

    if (policyList.length === 0) {
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

    const policyIds = policyList.map((p: any) => p.id as string)
    const provinceIds = Array.from(
      new Set(policyList.map((p: any) => p.region_id).filter(Boolean)),
    ) as string[]
    const parkIds = Array.from(
      new Set(policyList.map((p: any) => p.park_id).filter(Boolean)),
    ) as string[]

    const { data: policyTagRowsData, error: policyTagError } = await supabaseAdmin
      .from('policy_policy_tag')
      .select('policy_id, tag_id')
      .in('policy_id', policyIds)

    if (policyTagError) {
      console.error('查询政策-标签关联失败:', policyTagError)
      return NextResponse.json(
        { error: '查询政策标签失败: ' + policyTagError.message },
        { status: 500 },
      )
    }

    const allTagIds = Array.from(
      new Set((policyTagRowsData || []).map((r: any) => r.tag_id).filter(Boolean)),
    ) as string[]

    const [tagRows, provincesData, parksData] = await Promise.all([
      allTagIds.length > 0
        ? supabaseAdmin
            .from('policy_tag')
            .select('id, name, status')
            .in('id', allTagIds)
        : Promise.resolve({ data: [] } as any),
      provinceIds.length > 0
        ? supabaseAdmin
            .from('admin_provinces')
            .select('id, name_zh, name_en, code')
            .in('id', provinceIds)
        : Promise.resolve({ data: [] } as any),
      parkIds.length > 0
        ? supabaseAdmin
            .from('parks')
            .select('id, name_zh, name_en, development_zone_id')
            .in('id', parkIds)
        : Promise.resolve({ data: [] } as any),
    ])

    const parksMap = new Map(
      (parksData.data || []).map((p: any) => [p.id, p]),
    )

    const zoneIdsFromParks = Array.from(
      new Set(
        (parksData.data || [])
          .map((p: any) => p.development_zone_id)
          .filter(Boolean),
      ),
    ) as string[]

    // 兼容旧数据：policy.park_id 直接为经开区ID 的情况
    const legacyZoneIds = Array.from(
      new Set(
        policyList
          .map((p: any) => p.park_id as string | null)
          .filter((id) => id && !parksMap.has(id)),
      ),
    ) as string[]

    const allZoneIds = Array.from(
      new Set([...zoneIdsFromParks, ...legacyZoneIds]),
    ) as string[]

    const zonesData =
      allZoneIds.length > 0
        ? await supabaseAdmin
            .from('admin_development_zones')
            .select('id, name_zh, name_en, code')
            .in('id', allZoneIds)
        : ({ data: [] } as any)

    const tagsByPolicyId = new Map<string, string[]>()
    ;(policyTagRowsData || []).forEach((row: any) => {
      const list = tagsByPolicyId.get(row.policy_id) || []
      list.push(row.tag_id)
      tagsByPolicyId.set(row.policy_id, list)
    })

    const tagsMap = new Map(
      (tagRows.data || []).map((t: any) => [t.id, t]),
    )
    const provincesMap = new Map(
      (provincesData.data || []).map((p: any) => [p.id, p]),
    )
    const zonesMap = new Map(
      (zonesData.data || []).map((z: any) => [z.id, z]),
    )

    const items = policyList.map((p: any) => {
      const policyTagIds = tagsByPolicyId.get(p.id) || []
      const tags = policyTagIds
        .map((id) => tagsMap.get(id))
        .filter(Boolean)
        .map((t: any) => ({ id: t.id, name: t.name }))

      const province = p.region_id
        ? (provincesMap.get(p.region_id) as any)
        : null

      const parkRow = p.park_id
        ? (parksMap.get(p.park_id) as any)
        : null

      const zoneIdFromPark =
        parkRow && parkRow.development_zone_id
          ? (parkRow.development_zone_id as string)
          : null

      const zone =
        zoneIdFromPark && zonesMap.get(zoneIdFromPark)
          ? (zonesMap.get(zoneIdFromPark) as any)
          : // 兼容旧数据：park_id 直接为经开区 ID
            p.park_id && zonesMap.get(p.park_id)
            ? (zonesMap.get(p.park_id) as any)
            : null

      return {
        id: p.id,
        name: p.name,
        level: p.level,
        ministryUnit: p.ministry_unit,
        issuer: p.issuer,
        docNumber: p.doc_number,
        publishDate: p.publish_date,
        effectiveDate: p.effective_date,
        summary: p.summary,
        sourceUrl: p.source_url,
        tags,
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
      !!keyword ||
      !!level ||
      tagIds.length > 0 ||
      !!provinceParam ||
      !!developmentZoneParam ||
      !!publishDateFrom ||
      !!publishDateTo

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
  } catch (err) {
    console.error('政策列表API错误:', err)
    return NextResponse.json(
      {
        error:
          '服务器内部错误: ' +
          (err instanceof Error ? err.message : '未知错误'),
      },
      { status: 500 },
    )
  }
}
