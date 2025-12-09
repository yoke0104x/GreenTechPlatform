import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// 某个园区下的园区政策列表
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    if (!supabaseAdmin) {
      console.error('supabaseAdmin is not available')
      return NextResponse.json({ error: '服务配置错误' }, { status: 500 })
    }

    const parkId = params.id
    if (!parkId) {
      return NextResponse.json({ error: '缺少园区ID' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)

    const keyword = searchParams.get('keyword')?.trim() || ''
    const sortBy = searchParams.get('sortBy') || 'publishDateDesc'

    let page = parseInt(searchParams.get('page') || '1', 10)
    let pageSize = parseInt(searchParams.get('pageSize') || '10', 10)

    if (Number.isNaN(page) || page < 1) page = 1
    if (Number.isNaN(pageSize) || pageSize < 1) pageSize = 10
    pageSize = Math.min(pageSize, 50)

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    console.log('📥 园区政策列表参数:', {
      parkId,
      keyword,
      sortBy,
      page,
      pageSize,
    })

    let query = supabaseAdmin
      .from('policy')
      .select('*', { count: 'exact' })
      .eq('status', 'active')
      .eq('level', 'park')
      .eq('park_id', parkId)

    if (keyword) {
      query = query.or(
        `name.ilike.%${keyword}%,doc_number.ilike.%${keyword}%,summary.ilike.%${keyword}%`,
      )
    }

    let orderField = 'publish_date'
    let orderAscending = false
    switch (sortBy) {
      case 'publishDateAsc':
        orderField = 'publish_date'
        orderAscending = true
        break
      case 'publishDateDesc':
      default:
        orderField = 'publish_date'
        orderAscending = false
    }

    const { data: policies, error, count } = await query
      .order(orderField, { ascending: orderAscending })
      .order('id', { ascending: true })
      .range(from, to)

    if (error) {
      console.error('查询园区政策失败:', error)
      return NextResponse.json(
        { error: '查询园区政策失败: ' + error.message },
        { status: 500 },
      )
    }

    const policyList = policies || []
    const total = count || 0

    if (policyList.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          items: [],
          total,
          page,
          pageSize,
          totalPages: 0,
        },
      })
    }

    const items = policyList.map((p: any) => ({
      id: p.id,
      name: p.name,
      level: p.level,
      issuer: p.issuer,
      docNumber: p.doc_number,
      publishDate: p.publish_date,
      summary: p.summary,
    }))

    const totalPages = Math.ceil(total / pageSize)

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages,
      },
    })
  } catch (error) {
    console.error('园区政策列表API错误:', error)
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

