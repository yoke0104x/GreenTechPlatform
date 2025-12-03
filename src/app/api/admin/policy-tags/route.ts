import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      console.error('supabaseAdmin not configured')
      return NextResponse.json({ error: '服务配置错误' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.trim() || ''
    const status = searchParams.get('status') || ''

    let query = supabaseAdmin
      .from('policy_tag')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('获取政策标签失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: data || [],
    })
  } catch (error) {
    console.error('政策标签列表API错误:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      console.error('supabaseAdmin not configured')
      return NextResponse.json({ error: '服务配置错误' }, { status: 500 })
    }

    const body = await request.json()
    const { name, code, status = 'active', sort_order = 0 } = body || {}

    if (!name) {
      return NextResponse.json(
        { error: '标签名称不能为空' },
        { status: 400 },
      )
    }

    const { data, error } = await supabaseAdmin
      .from('policy_tag')
      .insert({
        name,
        code: code ?? null,
        status,
        sort_order,
      })
      .select('*')
      .single()

    if (error) {
      console.error('创建政策标签失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('创建政策标签API错误:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

