import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 强制动态渲染，避免缓存
export const dynamic = 'force-dynamic'

// 使用service role key创建Supabase客户端
const supabaseUrl = 'https://qpeanozckghazlzzhrni.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwZWFub3pja2doYXpsenpocm5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI4NTg1MCwiZXhwIjoyMDY5ODYxODUwfQ.wE2j1kNbMKkQgZSkzLR7z6WFft6v90VfWkSd5SBi2P8'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Logo生成函数
function generateLogoServer(companyName: string, size: number = 256): Buffer {
  // 获取企业名称的前四个字符
  const firstFourChars = getFirstFourChars(companyName);
  
  // 计算字符位置 - 严格按照eo.jpg的布局
  const centerX = size / 2;
  const centerY = size / 2;
  const fontSize = Math.floor(size / 3.5); // 更大的字体，参考图片中文字占比很大
  const spacing = fontSize * 1.3; // 适中的间距，给文字留出呼吸空间
  
  // 创建SVG - 严格参考eo.jpg的亮绿色背景和布局
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#00b899" rx="8" ry="8"/>
      <text x="${centerX - spacing/2}" y="${centerY - spacing/2}" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${firstFourChars[0] || ''}</text>
      <text x="${centerX + spacing/2}" y="${centerY - spacing/2}" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${firstFourChars[1] || ''}</text>
      <text x="${centerX - spacing/2}" y="${centerY + spacing/2}" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${firstFourChars[2] || ''}</text>
      <text x="${centerX + spacing/2}" y="${centerY + spacing/2}" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${firstFourChars[3] || ''}</text>
    </svg>
  `;
  
  return Buffer.from(svg);
}

function getFirstFourChars(companyName: string): string[] {
  // 移除常见的企业后缀
  const cleanName = companyName
    .replace(/(有限公司|股份有限公司|有限责任公司|集团|公司|科技|技术)$/g, '')
    .replace(/\s+/g, ''); // 移除空格

  // 如果清理后的名称长度>=4，取前4个字符
  if (cleanName.length >= 4) {
    return cleanName.slice(0, 4).split('');
  }
  
  // 如果清理后的名称不足4个字符，补充原名称的字符
  const remainingChars = companyName.replace(/\s+/g, '').slice(cleanName.length);
  const result = cleanName.split('');
  
  for (let i = 0; i < remainingChars.length && result.length < 4; i++) {
    const char = remainingChars[i];
    // 避免重复添加已有的字符
    if (!result.includes(char)) {
      result.push(char);
    }
  }
  
  // 如果仍然不足4个字符，用第一个字符填充
  while (result.length < 4 && result.length > 0) {
    result.push(result[0]);
  }
  
  return result.slice(0, 4);
}

// GET - 获取所有技术或按条件筛选
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const userId = searchParams.get('userId')
    const reviewStatus = searchParams.get('reviewStatus')
    // 筛选参数
    const categoryId = searchParams.get('categoryId')
    const subcategoryId = searchParams.get('subcategoryId')
    const tertiaryCategoryId = searchParams.get('tertiaryCategoryId')
    const quaternaryCategoryId = searchParams.get('quaternaryCategoryId')
    const countryId = searchParams.get('countryId')
    const provinceId = searchParams.get('provinceId')
    const developmentZoneId = searchParams.get('developmentZoneId')
    const sceneLabel = searchParams.get('sceneLabel')

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase.from('admin_technologies').select(
      `
      *,
      category:category_id(name_zh, name_en, slug),
      subcategory:subcategory_id(name_zh, name_en, slug)
    `,
      { count: 'exact' }
    )

    if (search) {
      query = query.or(
        `name_zh.ilike.%${search}%,name_en.ilike.%${search}%,description_zh.ilike.%${search}%`
      )
    }

    // 如果提供了用户ID，则只返回该用户创建的技术
    if (userId) {
      query = query.eq('created_by', userId)
    }

    // 根据审核状态筛选
    if (reviewStatus) {
      query = query.eq('review_status', reviewStatus)
    } else {
      // 如果没有指定审核状态，默认显示已发布的技术
      query = query.eq('review_status', 'published')
    }

    // 应用筛选条件
    if (categoryId) {
      query = query.eq('category_id', categoryId)
    }
    if (subcategoryId) {
      query = query.eq('subcategory_id', subcategoryId)
    }
    if (tertiaryCategoryId) {
      query = query.eq('tertiary_category_id', tertiaryCategoryId)
    }
    if (quaternaryCategoryId) {
      query = query.eq('quaternary_category_id', quaternaryCategoryId)
    }
    if (countryId) {
      query = query.eq('company_country_id', countryId)
    }
    if (provinceId) {
      query = query.eq('company_province_id', provinceId)
    }
    if (developmentZoneId) {
      query = query.eq('company_development_zone_id', developmentZoneId)
    }
    if (sceneLabel) {
      query = query.eq('custom_label', sceneLabel)
    }

    const { data, error, count } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to)

    if (error) {
      console.error('获取技术失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 手动查询相关的企业位置信息
    const enrichedData = await Promise.all(
      (data || []).map(async (tech) => {
        let company_country = null
        let company_province = null
        let company_development_zone = null
        let tertiary_category = null
        let quaternary_category = null

        // 查询国家信息
        if (tech.company_country_id) {
          const { data: countryData } = await supabase
            .from('admin_countries')
            .select('id, name_zh, name_en, logo_url')
            .eq('id', tech.company_country_id)
            .single()
          company_country = countryData
        }

        // 查询省份信息
        if (tech.company_province_id) {
          const { data: provinceData } = await supabase
            .from('admin_provinces')
            .select('id, name_zh, name_en, code')
            .eq('id', tech.company_province_id)
            .single()
          company_province = provinceData
        }

        // 查询经开区信息
        if (tech.company_development_zone_id) {
          const { data: zoneData } = await supabase
            .from('admin_development_zones')
            .select('id, name_zh, name_en, code')
            .eq('id', tech.company_development_zone_id)
            .single()
          company_development_zone = zoneData
        }

        // 查询三级/四级分类信息
        if (tech.tertiary_category_id) {
          const { data: t3 } = await supabase
            .from('admin_tertiary_categories')
            .select('id, name_zh, name_en, slug, subcategory_id')
            .eq('id', tech.tertiary_category_id)
            .single()
          tertiary_category = t3
        }
        if (tech.quaternary_category_id) {
          const { data: t4 } = await supabase
            .from('admin_quaternary_categories')
            .select('id, name_zh, name_en, slug, tertiary_category_id, national_economy_code, national_economy_name, national_economy_mappings')
            .eq('id', tech.quaternary_category_id)
            .single()
          quaternary_category = t4
        }

        return {
          ...tech,
          company_country,
          company_province,
          company_development_zone,
          tertiary_category,
          quaternary_category
        }
      })
    )

    return NextResponse.json({
      data: enrichedData,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    })
  } catch (error) {
    console.error('API错误:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - 创建新技术
export async function POST(request: NextRequest) {
  try {
    const technologyData = await request.json()
    
    console.log('接收到的技术数据:', technologyData)

    // 校验：子分类必填
    if (!technologyData?.subcategory_id) {
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
    
    // 处理企业创建逻辑
    let finalCompanyId = technologyData.company_id
    let finalCompanyLogoUrl = technologyData.company_logo_url // 用于技术记录的企业logo URL
    
    // 如果没有选择现有企业但提供了企业名称，则创建新企业
    if (!finalCompanyId && technologyData.company_name_zh) {
      try {
        console.log('创建新企业:', technologyData.company_name_zh)
        
        // 检查企业名称是否已存在
        const { data: existingCompany } = await supabase
          .from('admin_companies')
          .select('id, logo_url')
          .eq('name_zh', technologyData.company_name_zh)
          .single()
        
        if (existingCompany) {
          console.log('企业已存在，使用现有企业ID:', existingCompany.id)
          finalCompanyId = existingCompany.id
          finalCompanyLogoUrl = existingCompany.logo_url || technologyData.company_logo_url
        } else {
          // 如果没有提供logo但有企业名称，在后端自动生成logo
          let finalLogoUrl = technologyData.company_logo_url
          if (!finalLogoUrl && technologyData.company_name_zh) {
            try {
              console.log('后端自动生成企业logo:', technologyData.company_name_zh)
              
              // 直接调用logo生成逻辑（避免HTTP调用的复杂性）
              const logoBuffer = generateLogoServer(technologyData.company_name_zh, 256)
              
              // 生成文件名
              const timestamp = Date.now()
              const fileName = `company-logos/generated-${timestamp}.svg`
              
              // 上传到Supabase Storage
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('images')
                .upload(fileName, logoBuffer, {
                  contentType: 'image/svg+xml',
                  upsert: false
                })
              
              if (!uploadError && uploadData) {
                // 获取公开URL
                const { data: urlData } = supabase.storage
                  .from('images')
                  .getPublicUrl(fileName)
                
                finalLogoUrl = urlData.publicUrl
                console.log('✅ 后端自动生成企业logo成功:', finalLogoUrl)
              } else {
                console.error('❌ 后端logo上传失败:', uploadError)
              }
            } catch (logoError) {
              console.error('❌ 后端生成企业logo失败:', logoError)
            }
          }
          
          // 创建新企业记录
          const companyInsertData = {
            name_zh: technologyData.company_name_zh,
            name_en: technologyData.company_name_en || null,
            logo_url: finalLogoUrl || null,
            country_id: technologyData.company_country_id || null,
            province_id: technologyData.company_province_id || null,
            development_zone_id: technologyData.company_development_zone_id || null,
            company_type: 'private_company', // 默认为私营企业
            is_active: true
          }
          
          // 过滤掉空值
          const filteredCompanyData = Object.fromEntries(
            Object.entries(companyInsertData).filter(([, value]) => value !== null && value !== undefined && value !== '')
          )
          
          console.log('准备创建企业数据:', filteredCompanyData)
          
          const { data: newCompany, error: companyError } = await supabase
            .from('admin_companies')
            .insert(filteredCompanyData)
            .select()
            .single()
          
          if (companyError) {
            console.error('创建企业失败:', companyError)
            throw new Error(`创建企业失败: ${companyError.message}`)
          }
          
          finalCompanyId = newCompany.id
          finalCompanyLogoUrl = finalLogoUrl // 使用生成的logo URL
          console.log('新企业创建成功，ID:', finalCompanyId, 'Logo URL:', finalCompanyLogoUrl)
        }
      } catch (error) {
        console.error('处理企业信息时出错:', error)
        // 如果企业创建失败，不影响技术创建，但记录错误
        console.warn('企业创建失败，技术将不关联企业')
      }
    }
    
    // 准备要插入数据库的数据，只包含数据库表中存在的字段
    const insertData = {
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
      featured_weight: technologyData.featured_weight ?? 0,
      attachment_urls: technologyData.attachment_urls,
      attachments: technologyData.attachments,
      is_active: technologyData.is_active,
      
      // 企业关联字段
      company_id: finalCompanyId || technologyData.company_id, // 使用新创建的企业ID或原有ID
      company_name_zh: technologyData.company_name_zh,
      company_name_en: technologyData.company_name_en,
      company_logo_url: finalCompanyLogoUrl, // 使用正确的企业logo URL
      company_country_id: technologyData.company_country_id,
      company_province_id: technologyData.company_province_id,
      company_development_zone_id: technologyData.company_development_zone_id,

      // 审核状态和创建者字段
      review_status: technologyData.review_status || 'published', // 管理员创建的技术默认为已发布
      ...(technologyData.created_by && { created_by: technologyData.created_by })
    }
    
    // 过滤掉undefined和null值
    const filteredData = Object.fromEntries(
      Object.entries(insertData).filter(([, value]) => value !== undefined && value !== null && value !== '')
    )
    
    console.log('准备插入的数据:', filteredData)
    
    const { data, error } = await supabase
      .from('admin_technologies')
      .insert(filteredData)
      .select()
      .single()

    if (error) {
      console.error('创建技术失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 构建响应数据，包含企业创建信息
    const responseData = {
      ...data,
      // 添加企业创建信息
      company_created: finalCompanyId && finalCompanyId !== technologyData.company_id,
      company_id_used: finalCompanyId
    }

    console.log('技术创建成功:', responseData)
    return NextResponse.json(responseData, { status: 201 })
  } catch (error) {
    console.error('API错误:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 
