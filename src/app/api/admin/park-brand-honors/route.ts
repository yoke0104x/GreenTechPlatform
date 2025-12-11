import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    if (!parkId) {
      return NextResponse.json(
        { success: false, error: '缺少园区ID（parkId）' },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('park_brand_honors')
      .select('*')
      .eq('park_id', parkId)
      .eq('is_active', true)
      .order('year', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('获取园区品牌荣誉失败:', error)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: data || [],
    })
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
    const { park_id, year, title, type } = body || {}

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

    const insertPayload: Record<string, any> = {
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

    if (type) {
      insertPayload.type = type
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
    const { id, year, title, type, is_active } = body || {}

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'id 为必填项' },
        { status: 400 },
      )
    }

    const updatePayload: Record<string, any> = {
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

    if (typeof type === 'string' || type === null) {
      updatePayload.type = type
    }

    if (typeof is_active === 'boolean') {
      updatePayload.is_active = is_active
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

