import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

async function normalizeListIdByYearId(id: string): Promise<string | null> {
  if (!supabaseAdmin) return null
  const { data, error } = await supabaseAdmin
    .from('park_rank_years')
    .select('list_id')
    .eq('id', id)
    .maybeSingle()
  if (error) return null
  return (data as { list_id: string } | null)?.list_id || null
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: '服务配置错误' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const listId = searchParams.get('listId')?.trim() || ''
    if (!listId) {
      return NextResponse.json({ success: false, error: '缺少榜单ID（listId）' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('park_rank_years')
      .select('*')
      .eq('list_id', listId)
      .order('year', { ascending: false })
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('获取榜单年度失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || [] })
  } catch (e) {
    console.error('榜单年度 GET API 错误:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: '服务配置错误' }, { status: 500 })
    }
    const body = await request.json()
    const { list_id, year, is_latest, is_published, is_active } = body || {}

    if (!list_id || typeof list_id !== 'string') {
      return NextResponse.json({ success: false, error: 'list_id 为必填项' }, { status: 400 })
    }

    const parsedYear = typeof year === 'number' ? year : Number(String(year || '').trim())
    if (Number.isNaN(parsedYear)) {
      return NextResponse.json({ success: false, error: 'year 为必填项' }, { status: 400 })
    }

    const payload: {
      list_id: string
      year: number
      is_latest: boolean
      is_published: boolean
      is_active: boolean
    } = {
      list_id,
      year: parsedYear,
      is_latest: !!is_latest,
      is_published: typeof is_published === 'boolean' ? is_published : true,
      is_active: typeof is_active === 'boolean' ? is_active : true,
    }

    if (payload.is_latest) {
      const { error: resetError } = await supabaseAdmin
        .from('park_rank_years')
        .update({ is_latest: false, updated_at: new Date().toISOString() })
        .eq('list_id', list_id)
      if (resetError) {
        console.error('重置最新年度失败:', resetError)
        return NextResponse.json({ success: false, error: resetError.message }, { status: 500 })
      }
    }

    const { data, error } = await supabaseAdmin
      .from('park_rank_years')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      console.error('创建榜单年度失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (e) {
    console.error('榜单年度 POST API 错误:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: '服务配置错误' }, { status: 500 })
    }
    const body = await request.json()
    const { id, list_id, year, is_latest, is_published, is_active } = body || {}

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'id 为必填项' }, { status: 400 })
    }

    const payload: {
      updated_at: string
      year?: number
      is_latest?: boolean
      is_published?: boolean
      is_active?: boolean
    } = {
      updated_at: new Date().toISOString(),
    }

    if (typeof year !== 'undefined') {
      const parsedYear = typeof year === 'number' ? year : Number(String(year || '').trim())
      if (!Number.isNaN(parsedYear)) payload.year = parsedYear
    }
    if (typeof is_published === 'boolean') payload.is_published = is_published
    if (typeof is_active === 'boolean') payload.is_active = is_active
    if (typeof is_latest === 'boolean') payload.is_latest = is_latest

    const resolvedListId =
      typeof list_id === 'string' && list_id ? list_id : await normalizeListIdByYearId(id)

    if (payload.is_latest === true && resolvedListId) {
      const { error: resetError } = await supabaseAdmin
        .from('park_rank_years')
        .update({ is_latest: false, updated_at: new Date().toISOString() })
        .eq('list_id', resolvedListId)
      if (resetError) {
        console.error('重置最新年度失败:', resetError)
        return NextResponse.json({ success: false, error: resetError.message }, { status: 500 })
      }
    }

    const { data, error } = await supabaseAdmin
      .from('park_rank_years')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('更新榜单年度失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (e) {
    console.error('榜单年度 PUT API 错误:', e)
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
      return NextResponse.json({ success: false, error: '缺少要删除的年度ID' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('park_rank_years').delete().eq('id', id)
    if (error) {
      console.error('删除榜单年度失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('榜单年度 DELETE API 错误:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
