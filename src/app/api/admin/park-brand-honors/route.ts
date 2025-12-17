import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PARK_BRAND_HONOR_TYPE_OPTIONS } from '@/lib/types/admin'

type ParkIdRow = { id: string }

const ALLOWED_TYPES = new Set<string>(PARK_BRAND_HONOR_TYPE_OPTIONS.map((o) => o.value))

// 使用 service role key 创建 Supabase 客户端（绕过 RLS，仅供管理端使用）
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://qpeanozckghazlzzhrni.supabase.co'
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwZWFub3pja2doYXpsenpocm5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI4NTg1MCwiZXhwIjoyMDY5ODYxODUwfQ.wE2j1kNbMKkQgZSkzLR7z6WFft6v90VfWkSd5SBi2P8'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export const dynamic = 'force-dynamic'

// GET /api/admin/park-brand-honors?parkId=...
// 获取某个园区的品牌与荣誉列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parkId = searchParams.get('parkId')
    const title = searchParams.get('title')?.trim() || ''
    const type = searchParams.get('type')?.trim() || ''
    const searchPark = searchParams.get('searchPark')?.trim() || ''
    const activeOnlyParam = (searchParams.get('activeOnly') || '').trim()
    const activeOnly = parkId ? true : activeOnlyParam === 'true'

    const pageParam = searchParams.get('page') || ''
    const pageSizeParam = searchParams.get('pageSize') || ''
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1
    const pageSize = pageSizeParam ? Math.min(50, Math.max(1, parseInt(pageSizeParam, 10) || 10)) : 10
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('park_brand_honors')
      .select(
        parkId
          ? '*'
          : `
          *,
          park:parks(
            id,
            name_zh,
            name_en,
            level,
            logo_url,
            province:admin_provinces(id, name_zh, name_en, code)
          )
        `,
        { count: 'exact' },
      )

    if (parkId) {
      query = query.eq('park_id', parkId)
    }

    if (activeOnly) query = query.eq('is_active', true)

    if (title) query = query.ilike('title', `%${title}%`)
    if (type) query = query.eq('type', type)

    if (!parkId) {
      if (searchPark) {
        const { data: parkRows, error: parkError } = await supabase
          .from('parks')
          .select('id')
          .eq('is_active', true)
          .or(`name_zh.ilike.%${searchPark}%,name_en.ilike.%${searchPark}%`)
          .limit(500)
        if (parkError) {
          console.error('查询园区列表（品牌名录筛选）失败:', parkError)
          return NextResponse.json(
            { success: false, error: parkError.message },
            { status: 500 },
          )
        }
        const parkIds = (parkRows as ParkIdRow[] | null | undefined)?.map((r) => r.id).filter(Boolean) || []
        if (parkIds.length === 0) {
          return NextResponse.json({
            success: true,
            data: [],
            pagination: {
              page,
              pageSize,
              total: 0,
              totalPages: 0,
            },
          })
        }
        query = query.in('park_id', parkIds)
      }
    }

    // 排序优先级：sort_order -> approved_at -> year -> created_at
    query = query.order('sort_order', { ascending: true, nullsFirst: true })
    query = query.order('approved_at', { ascending: false, nullsFirst: false })
    query = query.order('year', { ascending: false, nullsFirst: false })
    query = query.order('created_at', { ascending: false })

    const { data, error, count } = parkId ? await query : await query.range(from, to)

    if (error) {
      console.error('获取园区品牌荣誉失败:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json(
      parkId
        ? { success: true, data: data || [] }
        : {
            success: true,
            data: data || [],
            pagination: {
              page,
              pageSize,
              total: count ?? 0,
              totalPages: Math.ceil((count ?? 0) / pageSize),
            },
          },
    )
  } catch (e) {
    console.error('园区品牌荣誉 GET API 错误:', e)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// POST /api/admin/park-brand-honors
// 创建一条品牌荣誉
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { park_id, year, title, type, approved_at } = body || {}

    if (!park_id || typeof park_id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'park_id 为必填项' },
        { status: 400 },
      )
    }
    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { success: false, error: 'title 为必填项' },
        { status: 400 },
      )
    }

    const insertPayload: {
      park_id: string
      title: string
      year?: number | null
      type?: string | null
      approved_at?: string | null
      sort_order?: number | null
    } = {
      park_id,
      title: title.trim(),
    }

    if (typeof year === 'number') {
      insertPayload.year = year
    } else if (typeof year === 'string' && year.trim()) {
      const parsed = Number(year.trim())
      if (!Number.isNaN(parsed)) {
        insertPayload.year = parsed
      }
    }

    if (typeof type === 'string') {
      const t = type.trim()
      if (t) {
        if (!ALLOWED_TYPES.has(t)) {
          return NextResponse.json({ success: false, error: 'type 必须为系统预置类型' }, { status: 400 })
        }
        insertPayload.type = t
      }
    } else if (type === null) {
      insertPayload.type = null
    }

    if (typeof body.sort_order === 'number') {
      insertPayload.sort_order = body.sort_order
    } else if (typeof body.sort_order === 'string' && body.sort_order.trim()) {
      const parsed = Number(body.sort_order.trim())
      if (!Number.isNaN(parsed)) insertPayload.sort_order = parsed
    }

    if (typeof approved_at === 'string') {
      const trimmed = approved_at.trim()
      insertPayload.approved_at = trimmed ? trimmed : null
    } else if (approved_at === null) {
      insertPayload.approved_at = null
    }

    const { data, error } = await supabase
      .from('park_brand_honors')
      .insert(insertPayload)
      .select('*')
      .single()

    if (error) {
      console.error('创建园区品牌荣誉失败:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (e) {
    console.error('园区品牌荣誉 POST API 错误:', e)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// PUT /api/admin/park-brand-honors
// 更新一条品牌荣誉
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, year, title, type, is_active, approved_at } = body || {}

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'id 为必填项' },
        { status: 400 },
      )
    }

    const updatePayload: {
      updated_at: string
      title?: string
      year?: number | null
      type?: string | null
      is_active?: boolean
      approved_at?: string | null
      sort_order?: number | null
    } = {
      updated_at: new Date().toISOString(),
    }

    if (typeof title === 'string') {
      updatePayload.title = title.trim()
    }

    if (typeof year === 'number') {
      updatePayload.year = year
    } else if (typeof year === 'string') {
      const trimmed = year.trim()
      if (trimmed) {
        const parsed = Number(trimmed)
        if (!Number.isNaN(parsed)) {
          updatePayload.year = parsed
        }
      } else {
        updatePayload.year = null
      }
    }

    if (typeof type === 'string') {
      const t = type.trim()
      if (t && !ALLOWED_TYPES.has(t)) {
        return NextResponse.json({ success: false, error: 'type 必须为系统预置类型' }, { status: 400 })
      }
      updatePayload.type = t ? t : null
    } else if (type === null) {
      updatePayload.type = null
    }

    if (typeof is_active === 'boolean') {
      updatePayload.is_active = is_active
    }

    if (typeof approved_at === 'string') {
      const trimmed = approved_at.trim()
      updatePayload.approved_at = trimmed ? trimmed : null
    } else if (approved_at === null) {
      updatePayload.approved_at = null
    }

    if (typeof body.sort_order === 'number') {
      updatePayload.sort_order = body.sort_order
    } else if (typeof body.sort_order === 'string') {
      const trimmed = body.sort_order.trim()
      if (trimmed) {
        const parsed = Number(trimmed)
        if (!Number.isNaN(parsed)) {
          updatePayload.sort_order = parsed
        }
      } else {
        updatePayload.sort_order = null
      }
    }

    const { data, error } = await supabase
      .from('park_brand_honors')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('更新园区品牌荣誉失败:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (e) {
    console.error('园区品牌荣誉 PUT API 错误:', e)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}

// DELETE /api/admin/park-brand-honors
// 删除一条品牌荣誉（硬删除）
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少要删除的荣誉ID' },
        { status: 400 },
      )
    }

    const { error } = await supabase
      .from('park_brand_honors')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('删除园区品牌荣誉失败:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('园区品牌荣誉 DELETE API 错误:', e)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    )
  }
}
