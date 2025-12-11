import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequestUser, serviceSupabase } from '../../_utils/auth'

interface PolicyFavoriteRow {
  id: string
  user_id: string | null
  custom_user_id?: string | null
  policy_id: string
  created_at: string
  policy?: any | null
}

function getAdminClient() {
  if (serviceSupabase) {
    return serviceSupabase
  }
  throw new Error('Supabase service role client is not configured')
}

function normalizePolicyFavoriteRow(raw: any): PolicyFavoriteRow {
  const policyField = raw?.policy
  let policy: any | null = null

  if (Array.isArray(policyField)) {
    const first = policyField[0]
    policy = first || null
  } else if (policyField && typeof policyField === 'object') {
    policy = policyField
  }

  return {
    id: String(raw?.id ?? ''),
    user_id: raw?.user_id ? String(raw.user_id) : null,
    custom_user_id: raw?.custom_user_id ? String(raw.custom_user_id) : null,
    policy_id: String(raw?.policy_id ?? ''),
    created_at: String(raw?.created_at ?? ''),
    policy,
  }
}

function mapPolicyFavorite(row: PolicyFavoriteRow) {
  return {
    favoriteId: row.id,
    userId: row.user_id || row.custom_user_id || '',
    policyId: row.policy_id,
    favoritedAt: row.created_at,
    policy: row.policy ?? null,
  }
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequestUser(request)
    if (!user) {
      return NextResponse.json({ error: '未登录用户无法查看政策收藏' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const policyId = searchParams.get('policyId')
    const userIdParam = searchParams.get('userId')

    const targetUserId = userIdParam ?? user.id
    if (targetUserId !== user.id) {
      return NextResponse.json({ error: '无权限访问其它用户收藏' }, { status: 403 })
    }

    const adminClient = getAdminClient()
    const userColumn = user.authType === 'custom' ? 'custom_user_id' : 'user_id'

    if (policyId) {
      const { data, error } = await adminClient
        .from('policy_favorites')
        .select('id, user_id, custom_user_id, policy_id, created_at')
        .eq(userColumn, targetUserId)
        .eq('policy_id', policyId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('检查政策收藏状态失败:', error)
        return NextResponse.json({ error: '检查收藏状态失败' }, { status: 500 })
      }

      if (!data) {
        return NextResponse.json({ isFavorited: false, favoriteId: null })
      }

      return NextResponse.json({
        isFavorited: true,
        favoriteId: data.id,
        favoritedAt: data.created_at,
        policyId: data.policy_id,
      })
    }

    const { data, error } = await adminClient
      .from('policy_favorites')
      .select(
        `
        id,
        user_id,
        custom_user_id,
        policy_id,
        created_at,
        policy:policy(
          id,
          level,
          name,
          summary,
          status,
          issuer,
          doc_number,
          publish_date,
          effective_date,
          source_url,
          region_id,
          park_id
        )
      `,
      )
      .eq(userColumn, targetUserId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('获取政策收藏列表失败:', error)
      return NextResponse.json({ error: '获取收藏列表失败' }, { status: 500 })
    }

    const rows: PolicyFavoriteRow[] = (data || []).map(normalizePolicyFavoriteRow)

    // 补充标签、省市/园区信息，与列表接口保持一致
    const policyIds = Array.from(new Set(rows.map((r) => r.policy_id).filter(Boolean))) as string[]
    let tagsMap = new Map<string, string>()
    let provinceMap = new Map<string, any>()
    let zoneMap = new Map<string, any>()

    if (policyIds.length) {
      const { data: policyTagRows } = await adminClient
        .from('policy_policy_tag')
        .select('policy_id, tag_id')
        .in('policy_id', policyIds)

      const tagIds = Array.from(
        new Set((policyTagRows || []).map((r: any) => r.tag_id).filter(Boolean)),
      ) as string[]

      if (tagIds.length) {
        const { data: tagRows } = await adminClient
          .from('policy_tag')
          .select('id, name')
          .in('id', tagIds)

        tagsMap = new Map((tagRows || []).map((t: any) => [t.id, t.name]))
      }

      const provinceIds = Array.from(
        new Set(
          rows
            .map((r) => (r.policy as any)?.region_id)
            .filter(Boolean),
        ),
      ) as string[]

      const parkIds = Array.from(
        new Set(
          rows
            .map((r) => (r.policy as any)?.park_id)
            .filter(Boolean),
        ),
      ) as string[]

      if (provinceIds.length) {
        const { data: provinces } = await adminClient
          .from('admin_provinces')
          .select('id, name_zh, name_en')
          .in('id', provinceIds)
        provinceMap = new Map((provinces || []).map((p: any) => [p.id, p]))
      }

      // 加载园区及其关联的经开区，兼容旧数据
      let parkMap = new Map<string, any>()
      if (parkIds.length) {
        const { data: parks } = await adminClient
          .from('parks')
          .select('id, name_zh, name_en, development_zone_id')
          .in('id', parkIds)
        parkMap = new Map((parks || []).map((p: any) => [p.id, p]))
      }

      const zoneIdsFromParks = Array.from(
        new Set(
          Array.from(parkMap.values())
            .map((p: any) => p.development_zone_id)
            .filter(Boolean),
        ),
      ) as string[]

      const legacyZoneIds = Array.from(
        new Set(
          rows
            .map((r) => (r.policy as any)?.park_id as string | null)
            .filter((id) => id && !parkMap.has(id)),
        ),
      ) as string[]

      const allZoneIds = Array.from(
        new Set([...zoneIdsFromParks, ...legacyZoneIds]),
      ) as string[]

      if (allZoneIds.length) {
        const { data: zones } = await adminClient
          .from('admin_development_zones')
          .select('id, name_zh, name_en')
          .in('id', allZoneIds)
        zoneMap = new Map((zones || []).map((z: any) => [z.id, z]))
      }

      // 将 tags、region、park 挂回 policy（园区经开区信息通过上面的映射还原）
      rows.forEach((row) => {
        const pol: any = row.policy || {}
        const related = (policyTagRows || []).filter((r: any) => r.policy_id === row.policy_id)
        pol.tags = related
          .map((r: any) => ({ id: r.tag_id, name: tagsMap.get(r.tag_id) || '' }))
          .filter((t: any) => t.name)
        if (pol.region_id && provinceMap.get(pol.region_id)) {
          const prov = provinceMap.get(pol.region_id)
          pol.province = { id: prov.id, name: prov.name_zh, nameEn: prov.name_en }
        }
        const parkId = pol.park_id as string | undefined
        const parkRow = parkId ? parkMap.get(parkId) : null
        const zoneIdFromPark =
          parkRow && parkRow.development_zone_id
            ? (parkRow.development_zone_id as string)
            : null
        if (zoneIdFromPark && zoneMap.get(zoneIdFromPark)) {
          const z = zoneMap.get(zoneIdFromPark)
          pol.developmentZone = {
            id: z.id,
            name: z.name_zh,
            nameEn: z.name_en,
          }
        } else if (parkId && zoneMap.get(parkId)) {
          // 兼容旧数据：park_id 直接为经开区 ID
          const z = zoneMap.get(parkId)
          pol.developmentZone = {
            id: z.id,
            name: z.name_zh,
            nameEn: z.name_en,
          }
        }
        row.policy = pol
      })
    }

    const favorites = rows.map(mapPolicyFavorite)
    return NextResponse.json({ favorites })
  } catch (error) {
    console.error('政策收藏接口GET异常:', error)
    return NextResponse.json({ error: '获取收藏信息失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequestUser(request)
    if (!user) {
      return NextResponse.json({ error: '未登录用户无法收藏政策' }, { status: 401 })
    }

    const { policyId } = await request.json().catch(() => ({ policyId: null }))
    if (!policyId || typeof policyId !== 'string') {
      return NextResponse.json({ error: '缺少政策ID' }, { status: 400 })
    }

    const adminClient = getAdminClient()
    const userColumn = user.authType === 'custom' ? 'custom_user_id' : 'user_id'

    const { data: existing, error: existingError } = await adminClient
      .from('policy_favorites')
      .select('id, user_id, custom_user_id, policy_id, created_at')
      .eq(userColumn, user.id)
      .eq('policy_id', policyId)
      .maybeSingle()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('查询政策收藏状态失败:', existingError)
      return NextResponse.json({ error: '收藏失败' }, { status: 500 })
    }

    let favoriteRow = existing

    if (!favoriteRow) {
      const payload: Record<string, string> = { policy_id: policyId }
      payload[userColumn] = user.id

      const { data: inserted, error: insertError } = await adminClient
        .from('policy_favorites')
        .insert(payload)
        .select('id, user_id, custom_user_id, policy_id, created_at')
        .single()

      if (insertError) {
        console.error('收藏政策失败:', insertError)
        return NextResponse.json({ error: '收藏失败' }, { status: 500 })
      }

      favoriteRow = inserted
    }

    const { data: detailed, error: detailError } = await adminClient
      .from('policy_favorites')
      .select(
        `
        id,
        user_id,
        custom_user_id,
        policy_id,
        created_at,
        policy:policy(
          id,
          level,
          name,
          summary,
          status,
          issuer,
          doc_number,
          publish_date,
          effective_date,
          source_url,
          region_id,
          park_id
        )
      `,
      )
      .eq('id', favoriteRow.id)
      .maybeSingle()

    if (!detailError && detailed) {
      const normalized = normalizePolicyFavoriteRow(detailed)
      return NextResponse.json(
        { favorite: mapPolicyFavorite(normalized) },
        { status: existing ? 200 : 201 },
      )
    }

    if (detailError) {
      console.error('获取政策收藏详情失败:', detailError)
    }

    const normalizedFallback = normalizePolicyFavoriteRow(favoriteRow!)
    return NextResponse.json(
      { favorite: mapPolicyFavorite(normalizedFallback) },
      { status: existing ? 200 : 201 },
    )
  } catch (error) {
    console.error('政策收藏接口POST异常:', error)
    return NextResponse.json({ error: '收藏失败' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticateRequestUser(request)
    if (!user) {
      return NextResponse.json({ error: '未登录用户无法取消收藏政策' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    let policyId = searchParams.get('policyId')

    if (!policyId) {
      const body = await request.json().catch(() => null)
      if (body && typeof body.policyId === 'string') {
        policyId = body.policyId
      }
    }

    if (!policyId) {
      return NextResponse.json({ error: '缺少政策ID' }, { status: 400 })
    }

    const adminClient = getAdminClient()
    const userColumn = user.authType === 'custom' ? 'custom_user_id' : 'user_id'

    const { error } = await adminClient
      .from('policy_favorites')
      .delete()
      .eq(userColumn, user.id)
      .eq('policy_id', policyId)

    if (error) {
      console.error('取消政策收藏失败:', error)
      return NextResponse.json({ error: '取消收藏失败' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('政策收藏接口DELETE异常:', error)
    return NextResponse.json({ error: '取消收藏失败' }, { status: 500 })
  }
}
