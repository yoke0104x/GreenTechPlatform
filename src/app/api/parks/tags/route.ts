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
      .from('park_tags')
      .select('id, code, name, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('查询园区标签失败:', error)
      return NextResponse.json(
        { error: '查询园区标签失败: ' + error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: (data || []).map((t: any) => ({
        id: t.id,
        code: t.code,
        name: t.name,
      })),
    })
  } catch (error) {
    console.error('园区标签API错误:', error)
    return NextResponse.json(
      {
        error:
          '服务器内部错误: ' +
          (error instanceof Error ? error.message : '未知错误'),
      },
      { status: 500 },
    )
  }
}

