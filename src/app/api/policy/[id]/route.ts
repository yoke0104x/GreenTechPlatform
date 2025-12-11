import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    if (!supabaseAdmin) {
      console.error('supabaseAdmin is not available')
      return NextResponse.json({ error: '服务配置错误' }, { status: 500 })
    }

    const idRaw = params?.id
    const idClean = idRaw ? decodeURIComponent(idRaw).split(/[?#]/)[0].trim() : ''
    const id = idClean
    if (!id) {
      return NextResponse.json({ error: '缺少政策ID' }, { status: 400 })
    }

    const { data: policyRows, error } = await supabaseAdmin
      .from('policy')
      .select('*')
      .eq('id', id)
      .limit(1)

    if (error) {
      console.error('查询政策详情失败:', error)
      return NextResponse.json(
        { error: '查询失败: ' + error.message },
        { status: 500 },
      )
    }

    const policy = policyRows?.[0] || null

    if (!policy) {
      return NextResponse.json(
        { error: '未找到对应政策' },
        { status: 404 },
      )
    }

    const policyId = policy.id as string
    const provinceId = policy.region_id as string | null
    const parkId = policy.park_id as string | null

    const [
      policyTagRows,
      provincesData,
      parkData,
    ] = await Promise.all([
      supabaseAdmin
        .from('policy_policy_tag')
        .select('tag_id')
        .eq('policy_id', policyId),
      provinceId
        ? supabaseAdmin
            .from('admin_provinces')
            .select('id, name_zh, name_en, code')
            .eq('id', provinceId)
            .single()
        : Promise.resolve({ data: null } as any),
      parkId
        ? supabaseAdmin
            .from('parks')
            .select('id, name_zh, name_en, province_id, development_zone_id')
            .eq('id', parkId)
            .maybeSingle()
        : Promise.resolve({ data: null } as any),
    ])

    // 计算园区对应的经开区（国家级经开区园区），兼容旧数据：policy.park_id 直接为经开区ID
    let zonesData: { data: any | null } = { data: null } as any
    try {
      const zoneIdFromPark =
        parkData.data && parkData.data.development_zone_id
          ? (parkData.data.development_zone_id as string)
          : null

      if (zoneIdFromPark) {
        zonesData = await supabaseAdmin
          .from('admin_development_zones')
          .select('id, name_zh, name_en, code')
          .eq('id', zoneIdFromPark)
          .maybeSingle()
      } else if (parkId) {
        // 兼容旧语义：park_id 直接存储经开区 ID
        zonesData = await supabaseAdmin
          .from('admin_development_zones')
          .select('id, name_zh, name_en, code')
          .eq('id', parkId)
          .maybeSingle()
      }
    } catch (e) {
      console.warn('查询园区经开区信息失败（忽略，不阻断政策详情）:', e)
      zonesData = { data: null } as any
    }

    const tagIds = Array.from(
      new Set((policyTagRows.data || []).map((r: any) => r.tag_id).filter(Boolean)),
    ) as string[]

    const { data: tagRows, error: tagError } = tagIds.length
      ? await supabaseAdmin
          .from('policy_tag')
          .select('id, name, status')
          .in('id', tagIds)
      : { data: [], error: null }

    if (tagError) {
      console.error('查询政策标签失败:', tagError)
      return NextResponse.json(
        { error: '查询标签失败: ' + tagError.message },
        { status: 500 },
      )
    }

    const tags = (tagRows || [])
      .filter((t: any) => t.status === 'active')
      .map((t: any) => ({
        id: t.id,
        name: t.name,
      }))

    const province = provincesData.data
      ? {
          id: provincesData.data.id,
          name: provincesData.data.name_zh,
          nameEn: provincesData.data.name_en,
          code: provincesData.data.code,
        }
      : null

    const developmentZone = zonesData.data
      ? {
          id: zonesData.data.id,
          name: zonesData.data.name_zh,
          nameEn: zonesData.data.name_en,
          code: zonesData.data.code,
        }
      : null

    const result = {
      id: policy.id,
      level: policy.level,
      name: policy.name,
      summary: policy.summary,
      status: policy.status,
      dataSource: policy.data_source,
      ministryUnit: policy.ministry_unit,
      issuer: policy.issuer,
      docNumber: policy.doc_number,
      publishDate: policy.publish_date,
      effectiveDate: policy.effective_date,
      sourceUrl: policy.source_url,
      uploadedAt: policy.uploaded_at,
      modifiedAt: policy.modified_at,
      createdAt: policy.created_at,
      updatedAt: policy.updated_at,
      tags,
      province,
      developmentZone,
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (err) {
    console.error('政策详情API错误:', err)
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
