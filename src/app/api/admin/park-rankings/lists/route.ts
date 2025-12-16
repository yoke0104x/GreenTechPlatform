import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: '服务配置错误' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')?.trim() || ''
    const kind = searchParams.get('kind')?.trim() || ''
    const parkLevel = searchParams.get('parkLevel')?.trim() || ''
    const search = searchParams.get('search')?.trim() || ''

    let query = supabaseAdmin
      .from('park_rank_lists')
      .select('*')
      .order('updated_at', { ascending: false })

    if (id) query = query.eq('id', id)
    if (kind) query = query.eq('kind', kind)
    if (parkLevel) query = query.eq('park_level', parkLevel)
    if (search) query = query.ilike('title_zh', `%${search}%`)

    const { data, error } = id ? await query.maybeSingle() : await query

    if (error) {
      console.error('获取榜单列表失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || (id ? null : []) })
  } catch (e) {
    console.error('榜单列表 GET API 错误:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: '服务配置错误' }, { status: 500 })
    }
    const body = await request.json()
    const { title_zh, title_en, park_level, kind, is_active } = body || {}

    if (!title_zh || typeof title_zh !== 'string') {
      return NextResponse.json({ success: false, error: 'title_zh 为必填项' }, { status: 400 })
    }
    if (!park_level || typeof park_level !== 'string') {
      return NextResponse.json({ success: false, error: 'park_level 为必填项' }, { status: 400 })
    }
    if (!kind || typeof kind !== 'string') {
      return NextResponse.json({ success: false, error: 'kind 为必填项' }, { status: 400 })
    }

    const payload: {
      title_zh: string
      title_en: string | null
      park_level: string
      kind: string
      is_active: boolean
    } = {
      title_zh: title_zh.trim(),
      title_en: typeof title_en === 'string' ? title_en.trim() || null : null,
      park_level,
      kind,
      is_active: typeof is_active === 'boolean' ? is_active : true,
    }

    const { data, error } = await supabaseAdmin
      .from('park_rank_lists')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      console.error('创建榜单失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (e) {
    console.error('榜单列表 POST API 错误:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: '服务配置错误' }, { status: 500 })
    }
    const body = await request.json()
    const { id, title_zh, title_en, park_level, kind, is_active } = body || {}

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'id 为必填项' }, { status: 400 })
    }

    const payload: {
      updated_at: string
      title_zh?: string
      title_en?: string | null
      park_level?: string
      kind?: string
      is_active?: boolean
    } = {
      updated_at: new Date().toISOString(),
    }

    if (typeof title_zh === 'string') payload.title_zh = title_zh.trim()
    if (typeof title_en === 'string' || title_en === null) {
      payload.title_en = typeof title_en === 'string' ? title_en.trim() || null : null
    }
    if (typeof park_level === 'string') payload.park_level = park_level
    if (typeof kind === 'string') payload.kind = kind
    if (typeof is_active === 'boolean') payload.is_active = is_active

    const { data, error } = await supabaseAdmin
      .from('park_rank_lists')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('更新榜单失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (e) {
    console.error('榜单列表 PUT API 错误:', e)
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
      return NextResponse.json({ success: false, error: '缺少要删除的榜单ID' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('park_rank_lists').delete().eq('id', id)

    if (error) {
      console.error('删除榜单失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('榜单列表 DELETE API 错误:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
