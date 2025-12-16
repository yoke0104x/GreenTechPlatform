import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: '服务配置错误' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const yearId = searchParams.get('yearId')?.trim() || ''
    if (!yearId) {
      return NextResponse.json({ success: false, error: '缺少年度ID（yearId）' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('park_rank_entries')
      .select(
        `
        *,
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
      .order('rank', { ascending: true })

    if (error) {
      console.error('获取榜单条目失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (e) {
    console.error('榜单条目 GET API 错误:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: '服务配置错误' }, { status: 500 })
    }
    const body = await request.json()
    const { year_id, park_id, rank, is_active } = body || {}

    if (!year_id || typeof year_id !== 'string') {
      return NextResponse.json({ success: false, error: 'year_id 为必填项' }, { status: 400 })
    }
    if (!park_id || typeof park_id !== 'string') {
      return NextResponse.json({ success: false, error: 'park_id 为必填项' }, { status: 400 })
    }
    const parsedRank = typeof rank === 'number' ? rank : Number(String(rank || '').trim())
    if (Number.isNaN(parsedRank) || parsedRank < 1) {
      return NextResponse.json({ success: false, error: 'rank 为必填项' }, { status: 400 })
    }

    const payload: {
      year_id: string
      park_id: string
      rank: number
      is_active: boolean
    } = {
      year_id,
      park_id,
      rank: parsedRank,
      is_active: typeof is_active === 'boolean' ? is_active : true,
    }

    const { data, error } = await supabaseAdmin
      .from('park_rank_entries')
      .insert(payload)
      .select(
        `
        *,
        park:parks(
          id,
          name_zh,
          name_en,
          logo_url,
          province:admin_provinces(id, name_zh, name_en, code)
        )
      `,
      )
      .single()

    if (error) {
      console.error('创建榜单条目失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (e) {
    console.error('榜单条目 POST API 错误:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: '服务配置错误' }, { status: 500 })
    }
    const body = await request.json()
    const { id, park_id, rank, is_active } = body || {}

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'id 为必填项' }, { status: 400 })
    }

    const payload: {
      updated_at: string
      park_id?: string
      rank?: number
      is_active?: boolean
    } = {
      updated_at: new Date().toISOString(),
    }

    if (typeof park_id === 'string') payload.park_id = park_id
    if (typeof rank !== 'undefined') {
      const parsedRank = typeof rank === 'number' ? rank : Number(String(rank || '').trim())
      if (!Number.isNaN(parsedRank) && parsedRank > 0) payload.rank = parsedRank
    }
    if (typeof is_active === 'boolean') payload.is_active = is_active

    const { data, error } = await supabaseAdmin
      .from('park_rank_entries')
      .update(payload)
      .eq('id', id)
      .select(
        `
        *,
        park:parks(
          id,
          name_zh,
          name_en,
          logo_url,
          province:admin_provinces(id, name_zh, name_en, code)
        )
      `,
      )
      .single()

    if (error) {
      console.error('更新榜单条目失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (e) {
    console.error('榜单条目 PUT API 错误:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: '服务配置错误' }, { status: 500 })
    }
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ success: false, error: '缺少要删除的条目ID' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('park_rank_entries').delete().eq('id', id)
    if (error) {
      console.error('删除榜单条目失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('榜单条目 DELETE API 错误:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
