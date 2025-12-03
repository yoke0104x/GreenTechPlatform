import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    if (!supabaseAdmin) {
      console.error('supabaseAdmin not configured')
      return NextResponse.json({ error: '服务配置错误' }, { status: 500 })
    }

    const { id } = params
    const body = await request.json()
    const { name, code, status, sort_order } = body || {}

    const payload: Record<string, any> = {}
    if (name !== undefined) payload.name = name
    if (code !== undefined) payload.code = code
    if (status !== undefined) payload.status = status
    if (sort_order !== undefined) payload.sort_order = sort_order

    const { data, error } = await supabaseAdmin
      .from('policy_tag')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('更新政策标签失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('更新政策标签API错误:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    if (!supabaseAdmin) {
      console.error('supabaseAdmin not configured')
      return NextResponse.json({ error: '服务配置错误' }, { status: 500 })
    }

    const { id } = params

    const { error } = await supabaseAdmin
      .from('policy_tag')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('删除政策标签失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除政策标签API错误:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

