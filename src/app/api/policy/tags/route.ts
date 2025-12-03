import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(_request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      console.error('supabaseAdmin is not available')
      return NextResponse.json({ error: '服务配置错误' }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin
      .from('policy_tag')
      .select('id, code, name, status, sort_order')
      .eq('status', 'active')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('查询政策标签失败:', error)
      return NextResponse.json(
        { error: '查询标签失败: ' + error.message },
        { status: 500 },
      )
    }

    const items = (data || []).map((t: any) => ({
      id: t.id,
      code: t.code,
      name: t.name,
    }))

    return NextResponse.json({
      success: true,
      data: items,
    })
  } catch (err) {
    console.error('政策标签列表API错误:', err)
    return NextResponse.json(
      {
        error:
          '服务器内部错误: ' +
          (err instanceof Error ? err.message : '未知错误'),
      },
      { status: 500 },
    )
  }
}

