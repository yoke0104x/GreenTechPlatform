import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequestUser, serviceSupabase } from '../../_utils/auth'

interface ParkFavoriteRow {
  id: string
  user_id: string | null
  custom_user_id?: string | null
  park_id: string
  created_at: string
  park?: any | null
}

function getAdminClient() {
  if (serviceSupabase) {
    return serviceSupabase
  }
  throw new Error('Supabase service role client is not configured')
}

function normalizeFavoriteRow(raw: any): ParkFavoriteRow {
  const parkField = raw?.park
  let park: any | null = null

  if (Array.isArray(parkField)) {
    const first = parkField[0]
    park = first || null
  } else if (parkField && typeof parkField === 'object') {
    park = parkField
  }

  return {
    id: String(raw?.id ?? ''),
    user_id: raw?.user_id ? String(raw.user_id) : null,
    custom_user_id: raw?.custom_user_id ? String(raw.custom_user_id) : null,
    park_id: String(raw?.park_id ?? ''),
    created_at: String(raw?.created_at ?? ''),
    park,
  }
}

function mapFavorite(row: ParkFavoriteRow) {
  return {
    favoriteId: row.id,
    userId: row.user_id || row.custom_user_id || '',
    parkId: row.park_id,
    favoritedAt: row.created_at,
    park: row.park
      ? {
          id: row.park.id,
          name_zh: row.park.name_zh,
          name_en: row.park.name_en,
          level: row.park.level,
          level_code: row.park.level_code,
          logo_url: row.park.logo_url,
          brief_zh: row.park.brief_zh,
          brief_en: row.park.brief_en,
        }
      : null,
  }
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequestUser(request)
    if (!user) {
      return NextResponse.json({ error: '未登录用户无法查看园区收藏' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const parkId = searchParams.get('parkId')
    const userIdParam = searchParams.get('userId')

    const targetUserId = userIdParam ?? user.id
    if (targetUserId !== user.id) {
      return NextResponse.json({ error: '无权限访问其它用户收藏' }, { status: 403 })
    }

    const adminClient = getAdminClient()
    const userColumn = user.authType === 'custom' ? 'custom_user_id' : 'user_id'

    if (parkId) {
      const { data, error } = await adminClient
        .from('park_favorites')
        .select('id, user_id, custom_user_id, park_id, created_at')
        .eq(userColumn, targetUserId)
        .eq('park_id', parkId)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') {
        console.error('检查园区收藏状态失败:', error)
        return NextResponse.json({ error: '检查收藏状态失败' }, { status: 500 })
      }

      if (!data) {
        return NextResponse.json({ isFavorited: false, favoriteId: null })
      }

      return NextResponse.json({
        isFavorited: true,
        favoriteId: data.id,
        favoritedAt: data.created_at,
        parkId: data.park_id,
      })
    }

    const { data, error } = await adminClient
      .from('park_favorites')
      .select(
        `
        id,
        user_id,
        custom_user_id,
        park_id,
        created_at,
        park:parks(
          id,
          name_zh,
          name_en,
          level,
          level_code,
          logo_url,
          brief_zh,
          brief_en
        )
      `,
      )
      .eq(userColumn, targetUserId)
      .order('created_at', { ascending: false })

    let rows: ParkFavoriteRow[] = (data || []).map(normalizeFavoriteRow)

    if (error) {
      console.error('获取园区收藏列表失败 (尝试降级):', error)
      const { data: fallbackRows, error: fallbackError } = await adminClient
        .from('park_favorites')
        .select('id, user_id, custom_user_id, park_id, created_at')
        .eq(userColumn, targetUserId)
        .order('created_at', { ascending: false })

      if (fallbackError) {
        console.error('获取园区收藏列表降级失败:', fallbackError)
        return NextResponse.json({ error: '获取园区收藏列表失败' }, { status: 500 })
      }

      rows = (fallbackRows || []).map(normalizeFavoriteRow)
    }

    const favorites = rows.map(mapFavorite)
    return NextResponse.json({ favorites })
  } catch (error) {
    console.error('园区收藏 GET 异常:', error)
    return NextResponse.json({ error: '获取园区收藏信息失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequestUser(request)
    if (!user) {
      return NextResponse.json({ error: '未登录用户无法收藏园区' }, { status: 401 })
    }

    const { parkId } = await request.json().catch(() => ({ parkId: null }))
    if (!parkId || typeof parkId !== 'string') {
      return NextResponse.json({ error: '缺少园区ID' }, { status: 400 })
    }

    const adminClient = getAdminClient()
    const userColumn = user.authType === 'custom' ? 'custom_user_id' : 'user_id'

    const { data: existing, error: existingError } = await adminClient
      .from('park_favorites')
      .select('id, user_id, custom_user_id, park_id, created_at')
      .eq(userColumn, user.id)
      .eq('park_id', parkId)
      .maybeSingle()

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('查询园区收藏状态失败:', existingError)
      return NextResponse.json({ error: '收藏失败' }, { status: 500 })
    }

    let favoriteRow = existing

    if (!favoriteRow) {
      const payload: Record<string, string> = { park_id: parkId }
      payload[userColumn] = user.id

      const { data: inserted, error: insertError } = await adminClient
        .from('park_favorites')
        .insert(payload)
        .select('id, user_id, custom_user_id, park_id, created_at')
        .single()

      if (insertError) {
        console.error('园区收藏失败:', insertError)
        return NextResponse.json({ error: '收藏失败' }, { status: 500 })
      }

      favoriteRow = inserted
    }

    const { data: detailed, error: detailError } = await adminClient
      .from('park_favorites')
      .select(
        `
        id,
        user_id,
        custom_user_id,
        park_id,
        created_at,
        park:parks(
          id,
          name_zh,
          name_en,
          level,
          level_code,
          logo_url,
          brief_zh,
          brief_en
        )
      `,
      )
      .eq('id', favoriteRow.id)
      .maybeSingle()

    if (!detailError && detailed) {
      const normalized = normalizeFavoriteRow(detailed)
      return NextResponse.json(
        { favorite: mapFavorite(normalized) },
        { status: existing ? 200 : 201 },
      )
    }

    if (detailError) {
      console.error('获取园区收藏详情失败:', detailError)
    }

    const normalizedFallback = normalizeFavoriteRow(favoriteRow!)
    return NextResponse.json(
      { favorite: mapFavorite(normalizedFallback) },
      { status: existing ? 200 : 201 },
    )
  } catch (error) {
    console.error('园区收藏 POST 异常:', error)
    return NextResponse.json({ error: '收藏失败' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticateRequestUser(request)
    if (!user) {
      return NextResponse.json({ error: '未登录用户无法取消园区收藏' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    let parkId = searchParams.get('parkId')

    if (!parkId) {
      const body = await request.json().catch(() => null)
      if (body && typeof body.parkId === 'string') {
        parkId = body.parkId
      }
    }

    if (!parkId) {
      return NextResponse.json({ error: '缺少园区ID' }, { status: 400 })
    }

    const adminClient = getAdminClient()
    const userColumn = user.authType === 'custom' ? 'custom_user_id' : 'user_id'

    const { error } = await adminClient
      .from('park_favorites')
      .delete()
      .eq(userColumn, user.id)
      .eq('park_id', parkId)

    if (error) {
      console.error('取消园区收藏失败:', error)
      return NextResponse.json({ error: '取消收藏失败' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('园区收藏 DELETE 异常:', error)
    return NextResponse.json({ error: '取消收藏失败' }, { status: 500 })
  }
}

