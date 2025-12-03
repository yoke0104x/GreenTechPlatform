import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    if (!supabaseAdmin) {
      console.error('supabaseAdmin not configured')
      return NextResponse.json({ error: '服务配置错误' }, { status: 500 })
    }

    const { id } = params

    const { data, error } = await supabaseAdmin
      .from('policy')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('获取政策详情失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: '政策不存在' }, { status: 404 })
    }

    const { data: tagRows } = await supabaseAdmin
      .from('policy_policy_tag')
      .select('tag_id')
      .eq('policy_id', id)

    const tagIds =
      tagRows?.map((r: any) => r.tag_id as string).filter(Boolean) || []

    return NextResponse.json({
      ...data,
      tagIds,
    })
  } catch (error) {
    console.error('政策详情API错误:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

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

    const {
      name,
      level,
      summary,
      status,
      dataSource,
      issuer,
      docNumber,
      publishDate,
      effectiveDate,
      sourceUrl,
      regionId,
      parkId,
      tags,
    } = body || {}

    const updatePayload: Record<string, any> = {
      name,
      level,
      summary: summary ?? null,
      status,
      data_source: dataSource ?? 'admin',
      issuer: issuer ?? null,
      doc_number: docNumber ?? null,
      publish_date: publishDate ?? null,
      effective_date: effectiveDate ?? null,
      source_url: sourceUrl ?? null,
      region_id: regionId ?? null,
      park_id: parkId ?? null,
      modified_at: new Date().toISOString(),
    }

    Object.keys(updatePayload).forEach((key) => {
      if (updatePayload[key] === undefined) {
        delete updatePayload[key]
      }
    })

    const { data, error } = await supabaseAdmin
      .from('policy')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      console.error('更新政策失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (Array.isArray(tags)) {
      await supabaseAdmin
        .from('policy_policy_tag')
        .delete()
        .eq('policy_id', id)

      const rows = tags.map((tagId: string) => ({
        policy_id: id,
        tag_id: tagId,
      }))
      const { error: tagError } = await supabaseAdmin
        .from('policy_policy_tag')
        .insert(rows)

      if (tagError) {
        console.error('更新政策标签关联失败:', tagError)
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('更新政策API错误:', error)
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
      .from('policy')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('删除政策失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('删除政策API错误:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}

