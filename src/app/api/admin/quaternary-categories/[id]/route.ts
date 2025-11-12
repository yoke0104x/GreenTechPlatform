import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qpeanozckghazlzzhrni.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwZWFub3pja2doYXpsenpocm5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI4NTg1MCwiZXhwIjoyMDY5ODYxODUwfQ.wE2j1kNbMKkQgZSkzLR7z6WFft6v90VfWkSd5SBi2P8'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const payload = await request.json()

    const updateData = {
      name_zh: payload.name_zh,
      name_en: payload.name_en,
      slug: payload.slug,
      sort_order: payload.sort_order,
      is_active: payload.is_active,
      tertiary_category_id: payload.tertiary_category_id
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
