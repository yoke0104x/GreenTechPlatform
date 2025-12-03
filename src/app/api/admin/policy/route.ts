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
    let page = parseInt(searchParams.get('page') || '1', 10)
    let pageSize = parseInt(searchParams.get('pageSize') || '10', 10)
    const search = searchParams.get('search')?.trim() || ''
    const level = searchParams.get('level') || ''
    const status = searchParams.get('status') || ''
    const sortBy = searchParams.get('sortBy') || 'publish_date'
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as
      | 'asc'
      | 'desc'

    if (Number.isNaN(page) || page < 1) page = 1
    if (Number.isNaN(pageSize) || pageSize < 1) pageSize = 10
    pageSize = Math.min(pageSize, 50)

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabaseAdmin
      .from('policy')
      .select('*', { count: 'exact' })

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,issuer.ilike.%${search}%,doc_number.ilike.%${search}%`,
      )
    }

    if (level) {
      query = query.eq('level', level)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to)

    if (error) {
      console.error('获取政策列表失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const total = count ?? 0

    const list = data || []

    // 补充标签信息
    const policyIds = list.map((p: any) => p.id).filter(Boolean) as string[]
    let tagsByPolicyId = new Map<string, { id: string; name: string }[]>()
    if (policyIds.length && supabaseAdmin) {
      const { data: rels } = await supabaseAdmin
        .from('policy_policy_tag')
        .select('policy_id, tag:tag_id(id, name)')
        .in('policy_id', policyIds)

      tagsByPolicyId = new Map()
      ;(rels || []).forEach((row: any) => {
        const arr = tagsByPolicyId.get(row.policy_id) || []
        if (row.tag?.id && row.tag?.name) {
          arr.push({ id: row.tag.id, name: row.tag.name })
        }
        tagsByPolicyId.set(row.policy_id, arr)
      })
    }

    const enriched = list.map((item: any) => ({
      ...item,
      tags: tagsByPolicyId.get(item.id) || [],
    }))

    return NextResponse.json({
      data: enriched,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    })
  } catch (error) {
    console.error('政策管理列表API错误:', error)
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

    const {
      name,
      level,
      summary,
      status = 'active',
      dataSource,
      issuer,
      ministryUnit,
      docNumber,
      publishDate,
      effectiveDate,
      sourceUrl,
      regionId,
      parkId,
      tags,
    } = body || {}

    if (!name || !level) {
      return NextResponse.json(
        { error: '政策名称和级别为必填项' },
        { status: 400 },
      )
    }

    const now = new Date().toISOString()

    const { data: inserted, error } = await supabaseAdmin
      .from('policy')
      .insert({
        name,
        level,
        summary: summary ?? null,
        status,
        data_source: dataSource ?? 'admin',
        issuer: issuer ?? null,
        ministry_unit: ministryUnit ?? null,
        doc_number: docNumber ?? null,
        publish_date: publishDate ?? null,
        effective_date: effectiveDate ?? null,
        source_url: sourceUrl ?? null,
        region_id: regionId ?? null,
        park_id: parkId ?? null,
        uploaded_at: now,
        modified_at: now,
      })
      .select('*')
      .single()

    if (error) {
      console.error('创建政策失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const policyId = inserted.id as string

    if (Array.isArray(tags) && tags.length > 0) {
      const rows = tags.map((tagId: string) => ({
        policy_id: policyId,
        tag_id: tagId,
      }))
      const { error: tagError } = await supabaseAdmin
        .from('policy_policy_tag')
        .insert(rows)

      if (tagError) {
        console.error('创建政策标签关联失败:', tagError)
      }
    }

    return NextResponse.json(inserted, { status: 201 })
  } catch (error) {
    console.error('创建政策API错误:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
