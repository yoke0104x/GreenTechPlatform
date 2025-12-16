import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { PARK_BRAND_HONOR_TYPE_OPTIONS } from '@/lib/types/admin'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = new Set<string>(PARK_BRAND_HONOR_TYPE_OPTIONS.map((o) => o.value))

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: '服务配置错误' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')?.trim() || ''
    const search = searchParams.get('search')?.trim() || ''

    let query = supabaseAdmin
      .from('park_brand_lists')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('updated_at', { ascending: false })

    if (id) query = query.eq('id', id)
    if (search) query = query.ilike('title', `%${search}%`)

    const { data, error } = id ? await query.maybeSingle() : await query

    if (error) {
      console.error('获取品牌名录类别失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: data || (id ? null : []) })
  } catch (e) {
    console.error('品牌名录类别 GET API 错误:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: '服务配置错误' }, { status: 500 })
    }

    const body = await request.json()
    const { title, type, sort_order, is_active } = body || {}

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ success: false, error: 'title 为必填项' }, { status: 400 })
    }
    if (!type || typeof type !== 'string' || !ALLOWED_TYPES.has(type.trim())) {
      return NextResponse.json({ success: false, error: 'type 为必填项，且必须为系统预置类型' }, { status: 400 })
    }

    const payload: {
      title: string
      type: string
      sort_order: number
      is_active: boolean
    } = {
      title: title.trim(),
      type: type.trim(),
      sort_order: typeof sort_order === 'number' && Number.isFinite(sort_order) ? sort_order : 0,
      is_active: typeof is_active === 'boolean' ? is_active : true,
    }

    const { data, error } = await supabaseAdmin
      .from('park_brand_lists')
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      console.error('创建品牌名录类别失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (e) {
    console.error('品牌名录类别 POST API 错误:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: '服务配置错误' }, { status: 500 })
    }

    const body = await request.json()
    const { id, title, type, sort_order, is_active } = body || {}

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'id 为必填项' }, { status: 400 })
    }

    const { data: before, error: beforeErr } = await supabaseAdmin
      .from('park_brand_lists')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (beforeErr) {
      console.error('读取品牌名录类别失败:', beforeErr)
      return NextResponse.json({ success: false, error: beforeErr.message }, { status: 500 })
    }

    if (!before) {
      return NextResponse.json({ success: false, error: '品牌名录类别不存在' }, { status: 404 })
    }

    const payload: {
      updated_at: string
      title?: string
      type?: string
      sort_order?: number
      is_active?: boolean
    } = {
      updated_at: new Date().toISOString(),
    }

    if (typeof title === 'string') payload.title = title.trim()
    if (typeof type === 'string') {
      const t = type.trim()
      if (!t || !ALLOWED_TYPES.has(t)) {
        return NextResponse.json({ success: false, error: 'type 必须为系统预置类型' }, { status: 400 })
      }
      payload.type = t
    }
    if (typeof sort_order === 'number' && Number.isFinite(sort_order)) payload.sort_order = sort_order
    if (typeof is_active === 'boolean') payload.is_active = is_active

    const { data: updated, error } = await supabaseAdmin
      .from('park_brand_lists')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('更新品牌名录类别失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    // 同步关联条目：如果修改了 title，则同步更新 park_brand_honors.title
    const newTitle = updated?.title as string | undefined
    if (newTitle && before.title !== newTitle) {
      const { error: syncErr } = await supabaseAdmin
        .from('park_brand_honors')
        .update({ title: newTitle, updated_at: new Date().toISOString() })
        .eq('title', before.title)

      if (syncErr) {
        console.error('同步更新 park_brand_honors.title 失败:', syncErr)
        return NextResponse.json(
          { success: false, error: `类别已更新，但同步条目失败：${syncErr.message}` },
          { status: 500 },
        )
      }
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (e) {
    console.error('品牌名录类别 PUT API 错误:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: '服务配置错误' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')?.trim()
    if (!id) {
      return NextResponse.json({ success: false, error: '缺少要删除的类别ID' }, { status: 400 })
    }

    const { data: list, error: getErr } = await supabaseAdmin
      .from('park_brand_lists')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (getErr) {
      console.error('读取品牌名录类别失败:', getErr)
      return NextResponse.json({ success: false, error: getErr.message }, { status: 500 })
    }
    if (!list) {
      return NextResponse.json({ success: true })
    }

    // 先删除该类别下所有条目（与榜单删除逻辑一致）
    const { error: delHonorsErr } = await supabaseAdmin
      .from('park_brand_honors')
      .delete()
      .eq('title', list.title)

    if (delHonorsErr) {
      console.error('删除品牌名录条目失败:', delHonorsErr)
      return NextResponse.json({ success: false, error: delHonorsErr.message }, { status: 500 })
    }

    const { error } = await supabaseAdmin.from('park_brand_lists').delete().eq('id', id)
    if (error) {
      console.error('删除品牌名录类别失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('品牌名录类别 DELETE API 错误:', e)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
