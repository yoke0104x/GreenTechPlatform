import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qpeanozckghazlzzhrni.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwZWFub3pja2doYXpsenpocm5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI4NTg1MCwiZXhwIjoyMDY5ODYxODUwfQ.wE2j1kNbMKkQgZSkzLR7z6WFft6v90VfWkSd5SBi2P8'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const subcategoryId = searchParams.get('subcategory_id')
    if (!subcategoryId) {
      return NextResponse.json({ error: '子分类ID不能为空' }, { status: 400 })
    }
    const { data, error } = await supabase
      .from('admin_tertiary_categories')
      .select('*')
      .eq('subcategory_id', subcategoryId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
    if (error) {
      console.error('获取三级分类失败:', error)
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
    const { name_zh, name_en, slug, sort_order, is_active, subcategory_id } = await request.json()
    if (!name_zh || !name_en || !slug || !subcategory_id) {
      return NextResponse.json({ error: '名称、标识符和所属子分类不能为空' }, { status: 400 })
    }

    // 检查父级是否存在
    const { data: parent } = await supabase
      .from('admin_subcategories')
      .select('id')
      .eq('id', subcategory_id)
      .single()
    if (!parent) {
      return NextResponse.json({ error: '所属子分类不存在' }, { status: 400 })
    }

    // slug 唯一性（同一子分类下）
    const { data: existing } = await supabase
      .from('admin_tertiary_categories')
      .select('id')
      .eq('subcategory_id', subcategory_id)
      .eq('slug', slug)
      .single()
    if (existing) {
      return NextResponse.json({ error: '该子分类下已存在相同标识符' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('admin_tertiary_categories')
      .insert({
        name_zh,
        name_en,
        slug,
        sort_order: sort_order || 0,
        is_active: is_active ?? true,
        subcategory_id
      })
      .select()
      .single()
    if (error) {
      console.error('创建三级分类失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    console.error('API错误:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

