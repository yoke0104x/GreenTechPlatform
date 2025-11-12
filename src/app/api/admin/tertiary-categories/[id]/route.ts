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
    const { error } = await supabase
      .from('admin_tertiary_categories')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('删除三级分类失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('API错误:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

