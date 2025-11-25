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
      subcategory_id: payload.subcategory_id
    }
    const filtered = Object.fromEntries(Object.entries(updateData).filter(([, v]) => v !== undefined))

    const { data, error } = await supabase
      .from('admin_tertiary_categories')
      .update(filtered)
      .eq('id', id)
      .select()
      .single()
    if (error) {
      console.error('更新三级分类失败:', error)
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
		const { searchParams } = new URL(request.url)
		const force = searchParams.get('force') === 'true'

		// 禁止删除仍被技术或四级分类引用的三级分类
		const [{ count: techCount, error: techError }, { count: fourthCount, error: fourthError }] = await Promise.all([
			supabase
				.from('admin_technologies')
				.select('id', { count: 'exact', head: true })
				.eq('tertiary_category_id', id),
			supabase
				.from('admin_quaternary_categories')
				.select('id', { count: 'exact', head: true })
				.eq('tertiary_category_id', id)
		])

		if (techError || fourthError) {
			console.error('检查三级分类关联失败:', techError || fourthError)
			return NextResponse.json({ error: (techError || fourthError)?.message || '检查失败' }, { status: 500 })
		}

		const hasRefs = (techCount ?? 0) > 0 || (fourthCount ?? 0) > 0

		if (hasRefs && !force) {
			return NextResponse.json({
				error: `仍有 ${techCount ?? 0} 条技术或 ${fourthCount ?? 0} 条四级分类关联此三级分类，请先解除关联后再删除。`
			}, { status: 400 })
		}

		if (hasRefs && force) {
			const { data: quaternaries, error: loadQuaternaryError } = await supabase
				.from('admin_quaternary_categories')
				.select('id')
				.eq('tertiary_category_id', id)
			if (loadQuaternaryError) {
				console.error('强制删除前查询四级分类失败:', loadQuaternaryError)
				return NextResponse.json({ error: loadQuaternaryError.message || '查询四级分类失败' }, { status: 500 })
			}
			const quaternaryIds = (quaternaries || []).map(q => q.id).filter(Boolean)

			if (quaternaryIds.length > 0) {
				const { error: clearQuaternaryTechError } = await supabase
					.from('admin_technologies')
					.update({ quaternary_category_id: null })
					.in('quaternary_category_id', quaternaryIds)
				if (clearQuaternaryTechError) {
					console.error('清理技术四级分类关联失败:', clearQuaternaryTechError)
					return NextResponse.json({ error: clearQuaternaryTechError.message || '清理四级关联失败' }, { status: 500 })
				}

				const { error: deleteQuaternaryError } = await supabase
					.from('admin_quaternary_categories')
					.delete()
					.in('id', quaternaryIds)
				if (deleteQuaternaryError) {
					console.error('删除四级分类失败:', deleteQuaternaryError)
					return NextResponse.json({ error: deleteQuaternaryError.message || '删除四级分类失败' }, { status: 500 })
				}
			}

			const { error: clearTertiaryTechError } = await supabase
				.from('admin_technologies')
				.update({ tertiary_category_id: null })
				.eq('tertiary_category_id', id)
			if (clearTertiaryTechError) {
				console.error('清理技术三级分类关联失败:', clearTertiaryTechError)
				return NextResponse.json({ error: clearTertiaryTechError.message || '清理三级关联失败' }, { status: 500 })
			}
		}

		const { error } = await supabase
			.from('admin_tertiary_categories')
			.delete()
			.eq('id', id)
		if (error) {
			console.error('删除三级分类失败:', error)
			const message =
				error.code === '23503'
					? '仍有技术或四级分类关联此三级分类，请先解除关联或强制删除。'
					: error.message
			return NextResponse.json({ error: message }, { status: error.code === '23503' ? 400 : 500 })
		}
		return NextResponse.json({ success: true })
	} catch (e) {
		console.error('API错误:', e)
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}
