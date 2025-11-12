import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qpeanozckghazlzzhrni.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwZWFub3pja2doYXpsenpocm5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI4NTg1MCwiZXhwIjoyMDY5ODYxODUwfQ.wE2j1kNbMKkQgZSkzLR7z6WFft6v90VfWkSd5SBi2P8'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tertiaryId = searchParams.get('tertiary_category_id')
    if (!tertiaryId) {
      return NextResponse.json({ error: '三级分类ID不能为空' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('admin_quaternary_categories')
      .select('*')
      .eq('tertiary_category_id', tertiaryId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    if (error) {
      console.error('获取四级分类失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data || [])
  } catch (e) {
    console.error('API错误:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name_zh, name_en, slug, sort_order, is_active, tertiary_category_id } = await request.json()
    if (!name_zh || !name_en || !slug || !tertiary_category_id) {
      return NextResponse.json({ error: '名称、标识符和所属三级分类不能为空' }, { status: 400 })
    }

    // 检查父级是否存在
    const { data: parent } = await supabase
      .from('admin_tertiary_categories')
      .select('id')
      .eq('id', tertiary_category_id)
      .single()
    if (!parent) {
      return NextResponse.json({ error: '所属三级分类不存在' }, { status: 400 })
    }

    // slug 唯一性（同一三级分类下）
    const { data: existing } = await supabase
      .from('admin_quaternary_categories')
      .select('id')
      .eq('tertiary_category_id', tertiary_category_id)
      .eq('slug', slug)
      .single()
    if (existing) {
      return NextResponse.json({ error: '该三级分类下已存在相同标识符' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('admin_quaternary_categories')
      .insert({
        name_zh,
        name_en,
        slug,
        sort_order: sort_order || 0,
        is_active: is_active ?? true,
        tertiary_category_id
      })
      .select()
      .single()
    if (error) {
      console.error('创建四级分类失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    console.error('API错误:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

