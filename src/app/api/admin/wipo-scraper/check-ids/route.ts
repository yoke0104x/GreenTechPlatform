import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function findTechIdByEmbeddedWipoId(supabase: any, wipoId: string) {
  // 兼容旧数据：通过英文描述中的“ID: <id>”回填映射
  const { data, error } = await supabase
    .from('admin_technologies')
    .select('id')
    .eq('acquisition_method', 'wipo')
    .ilike('description_en', `%ID: ${wipoId}%`)
    .limit(1)
  if (error) throw error
  return (data || [])[0]?.id || null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const ids = Array.isArray(body?.ids) ? body.ids : []
    const cleaned = Array.from(
      new Set(
        ids
          .map((id: any) => String(id || '').trim())
          .filter(Boolean)
          .map((id: string) => id.replace(/\s+/g, ''))
      )
    )
    if (!cleaned.length) {
      return NextResponse.json({ error: 'ids required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('wipo_technology_ids')
      .select('wipo_id')
      .in('wipo_id', cleaned)

    if (error) throw error

    const existingIds = (data || []).map((row: any) => row.wipo_id)
    const existingSet = new Set(existingIds)
    const missingIds: string[] = []

    // 回填：尝试在旧的技术描述中寻找 WIPO ID，并同步到映射表
    for (const id of cleaned) {
      if (existingSet.has(id)) continue
      const techId = await findTechIdByEmbeddedWipoId(supabase, id)
      if (techId) {
        await supabase.from('wipo_technology_ids').upsert({ wipo_id: id, tech_id: techId }, { onConflict: 'wipo_id' })
        existingSet.add(id)
      } else {
        missingIds.push(id)
      }
    }

    return NextResponse.json({ existingIds: Array.from(existingSet), missingIds })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 500 })
  }
}
