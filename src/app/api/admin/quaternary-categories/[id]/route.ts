import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qpeanozckghazlzzhrni.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwZWFub3pja2doYXpsenpocm5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI4NTg1MCwiZXhwIjoyMDY5ODYxODUwfQ.wE2j1kNbMKkQgZSkzLR7z6WFft6v90VfWkSd5SBi2P8'
const supabase = createClient(supabaseUrl, supabaseServiceKey)
const CODE_REGEX = /^[0-9*]{4}$/

type MappingPayload = { code: string; name: string }

function normalizeMappings(input: any): MappingPayload[] {
  if (!Array.isArray(input)) return []
  return input
    .map(item => ({
      code: typeof item?.code === 'string' ? item.code.trim() : '',
      name: typeof item?.name === 'string' ? item.name.trim() : '',
    }))
    .filter(item => item.code || item.name)
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const payload = await request.json()

    let mappings: MappingPayload[] | undefined
    if (payload.national_economy_mappings !== undefined) {
      mappings = normalizeMappings(payload.national_economy_mappings)
      if (!mappings.length) {
        return NextResponse.json({ error: '国民经济行业映射至少需要一条数据' }, { status: 400 })
      }
      for (const mapping of mappings) {
        if (!mapping.code || !CODE_REGEX.test(mapping.code)) {
          return NextResponse.json({ error: '国民经济行业代码需为4位数字或以*补足的4位字符' }, { status: 400 })
        }
        if (!mapping.name) {
          return NextResponse.json({ error: '国民经济行业名称不能为空' }, { status: 400 })
        }
      }
    } else if (payload.national_economy_code !== undefined || payload.national_economy_name !== undefined) {
      const code = typeof payload.national_economy_code === 'string' ? payload.national_economy_code.trim() : ''
      const name = typeof payload.national_economy_name === 'string' ? payload.national_economy_name.trim() : ''
      if (!code || !CODE_REGEX.test(code)) {
        return NextResponse.json({ error: '国民经济行业代码需为4位数字或以*补足的4位字符' }, { status: 400 })
      }
      if (!name) {
        return NextResponse.json({ error: '国民经济行业名称不能为空' }, { status: 400 })
      }
      mappings = [{ code, name }]
    }

    const updateData = {
      name_zh: payload.name_zh,
      name_en: payload.name_en,
      slug: payload.slug,
      sort_order: payload.sort_order,
      is_active: payload.is_active,
      tertiary_category_id: payload.tertiary_category_id,
      national_economy_code: mappings?.[0]?.code ?? payload.national_economy_code,
      national_economy_name: mappings?.[0]?.name ?? payload.national_economy_name,
      national_economy_mappings: mappings
    }
    const filtered = Object.fromEntries(Object.entries(updateData).filter(([, v]) => v !== undefined))

    const { data, error } = await supabase
      .from('admin_quaternary_categories')
      .update(filtered)
      .eq('id', id)
      .select()
      .single()
    if (error) {
      console.error('更新四级分类失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data)
  } catch (e) {
    console.error('API错误:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
	try {
		const { id } = params

		// 检查是否仍有技术关联该四级分类
		const { count: techCount, error: techError } = await supabase
			.from('admin_technologies')
			.select('id', { count: 'exact', head: true })
			.eq('quaternary_category_id', id)

		if (techError) {
			console.error('检查四级分类关联技术失败:', techError)
			return NextResponse.json({ error: techError.message }, { status: 500 })
		}

		if ((techCount ?? 0) > 0) {
			return NextResponse.json({ error: `仍有 ${techCount} 条技术关联此四级分类，请先解除关联后再删除。` }, { status: 400 })
		}

		const { error } = await supabase
			.from('admin_quaternary_categories')
			.delete()
			.eq('id', id)
		if (error) {
			console.error('删除四级分类失败:', error)
			const message =
				error.code === '23503'
					? '仍有技术或下级数据关联此四级分类，请先解除关联后再删除。'
					: error.message
			return NextResponse.json({ error: message }, { status: error.code === '23503' ? 400 : 500 })
		}
		return NextResponse.json({ success: true })
	} catch (e) {
		console.error('API错误:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
