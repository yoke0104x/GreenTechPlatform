import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 使用service role key创建Supabase客户端
const supabaseUrl = 'https://qpeanozckghazlzzhrni.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwZWFub3pja2doYXpsenpocm5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI4NTg1MCwiZXhwIjoyMDY5ODYxODUwfQ.wE2j1kNbMKkQgZSkzLR7z6WFft6v90VfWkSd5SBi2P8'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// PUT - 更新技术
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const technologyData = await request.json()

    console.log('更新技术数据:', technologyData)

    // 读取现有记录以进行最终值校验
    const { data: existing, error: existErr } = await supabase
      .from('admin_technologies')
      .select('id, subcategory_id')
      .eq('id', id)
      .single()
    if (existErr || !existing) {
      return NextResponse.json({ error: '技术不存在' }, { status: 404 })
    }
    const finalSubcategoryId = technologyData.subcategory_id ?? existing.subcategory_id
    if (!finalSubcategoryId) {
      return NextResponse.json({ error: '技术子分类不能为空' }, { status: 400 })
    }
    
    // 如果没有技术图片且指定了子分类，获取子分类的默认技术图片
    let finalImageUrl = technologyData.image_url
    if (!finalImageUrl && technologyData.subcategory_id) {
      try {
        const { data: subcategory } = await supabase
          .from('admin_subcategories')
          .select('default_tech_image_url')
          .eq('id', technologyData.subcategory_id)
          .single()
        
        if (subcategory?.default_tech_image_url) {
          finalImageUrl = subcategory.default_tech_image_url
          console.log('使用子分类默认技术图片:', finalImageUrl)
        }
      } catch (error) {
        console.warn('获取子分类默认图片失败:', error)
      }
    }
    
    // 准备要更新的数据，只包含数据库表中存在的字段
    const updateData = {
      name_zh: technologyData.name_zh,
      name_en: technologyData.name_en,
      description_zh: technologyData.description_zh,
      description_en: technologyData.description_en,
      website_url: technologyData.website_url,
      image_url: finalImageUrl,
      tech_source: technologyData.tech_source,
      acquisition_method: technologyData.acquisition_method, // 添加技术获取方式字段
      category_id: technologyData.category_id,
      subcategory_id: technologyData.subcategory_id,
      tertiary_category_id: technologyData.tertiary_category_id,
      quaternary_category_id: technologyData.quaternary_category_id,
      custom_label: technologyData.custom_label,
      featured_weight: technologyData.featured_weight,
      attachment_urls: technologyData.attachment_urls,
      attachments: technologyData.attachments,
      is_active: technologyData.is_active,
      
      // 企业关联字段
      company_id: technologyData.company_id,
      company_name_zh: technologyData.company_name_zh,
      company_name_en: technologyData.company_name_en,
      company_logo_url: technologyData.company_logo_url,
      company_country_id: technologyData.company_country_id,
      company_province_id: technologyData.company_province_id,
      company_development_zone_id: technologyData.company_development_zone_id
    }
    
    // 过滤掉undefined值，但保留null（用于清空字段）
    const filteredData = Object.fromEntries(
      Object.entries(updateData).filter(([, value]) => value !== undefined)
    )
    
    console.log('准备更新的数据:', filteredData)

    const { data, error } = await supabase
      .from('admin_technologies')
      .update(filteredData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('更新技术失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API错误:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - 删除技术
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    const { error } = await supabase.from('admin_technologies').delete().eq('id', id)

    if (error) {
      console.error('删除技术失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Technology deleted successfully' }, { status: 200 })
  } catch (error) {
    console.error('API错误:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
