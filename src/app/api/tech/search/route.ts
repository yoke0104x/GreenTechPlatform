import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// 强制动态渲染，禁用所有缓存
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - 搜索技术产品
export async function GET(request: NextRequest) {
  try {
    // 检查管理员客户端是否可用
    if (!supabaseAdmin) {
      console.error('supabaseAdmin is not available');
      return NextResponse.json(
        { error: '服务配置错误' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const category = searchParams.get('category') || null;
    const subCategory = searchParams.get('subCategory') || null;
    const country = searchParams.get('country') || null;
    const province = searchParams.get('province') || null;
    const developmentZone = searchParams.get('developmentZone') || null;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const sortBy = searchParams.get('sortBy') || 'updateTime';

    console.log('🔍 技术搜索API调用时间:', new Date().toISOString());
    console.log('📥 接收到的原始参数:', { keyword, category, subCategory, country, province, developmentZone, page, pageSize, sortBy });
    console.log('📊 联合筛选条件检查：', {
      hasKeyword: !!keyword,
      hasCategory: !!category,
      hasSubCategory: !!subCategory,
      hasCountry: !!country,
      hasProvince: !!province,
      hasDevelopmentZone: !!developmentZone
    });
    
    // 验证筛选条件的完整性
    if (province && !country) {
      console.warn('⚠️ 检测到省份筛选但没有国家筛选，这可能导致结果不准确');
    }
    if (developmentZone && !province) {
      console.warn('⚠️ 检测到经开区筛选但没有省份筛选，这可能导致结果不准确');
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // 构建基础查询
    let query = supabaseAdmin
      .from('admin_technologies')
      .select('*', { count: 'exact' })
      .eq('is_active', true) // 只显示启用的技术
      .eq('review_status', 'published'); // 只显示已发布的技术

    // 存储所有需要解析的筛选条件
    const filterConditions = {
      keyword: !!keyword,
      category: !!category, 
      subCategory: !!subCategory,
      country: !!country,
      province: !!province,
      developmentZone: !!developmentZone
    };

    console.log('🎯 开始应用联合筛选条件:', filterConditions);

    // 关键词搜索
    if (keyword) {
      query = query.or(`name_zh.ilike.%${keyword}%,name_en.ilike.%${keyword}%,description_zh.ilike.%${keyword}%`);
      console.log('✅ 已应用关键词筛选:', keyword);
    }

    // 分类筛选 - 优化查询逻辑
    if (category) {
      console.log('🔍 开始查找分类:', category);
      let categoryId = null;
      
      // 优化：先判断是否为UUID格式，减少不必要的查询
      if (category.includes('-') && category.length > 30) {
        // 直接使用UUID
        categoryId = category;
        console.log('✅ 使用UUID作为分类ID:', categoryId);
      } else {
        // 通过slug查找ID
        const { data: slugData, error: slugError } = await supabaseAdmin
          .from('admin_categories')
          .select('id')
          .eq('slug', category)
          .single();
        
        if (!slugError && slugData) {
          categoryId = slugData.id;
          console.log('✅ 通过slug找到分类ID:', category, '->', categoryId);
        } else {
          console.log('❌ 未找到分类:', category);
        }
      }
      
      if (categoryId) {
        query = query.eq('category_id', categoryId);
        console.log('✅ 已应用分类筛选条件');
      }
    }

    // 子分类筛选 - 优化查询逻辑
    if (subCategory) {
      console.log('🔍 开始查找子分类:', subCategory);
      let subCategoryId = null;
      
      // 优化：先判断是否为UUID格式
      if (subCategory.includes('-') && subCategory.length > 30) {
        subCategoryId = subCategory;
        console.log('✅ 使用UUID作为子分类ID:', subCategoryId);
      } else {
        // 通过slug查找ID
        const { data, error } = await supabaseAdmin
          .from('admin_subcategories')
          .select('id')
          .eq('slug', subCategory)
          .single();
        
        if (!error && data) {
          subCategoryId = data.id;
          console.log('✅ 通过slug找到子分类ID:', subCategory, '->', subCategoryId);
        } else {
          console.log('❌ 未找到子分类:', subCategory);
        }
      }
      
      if (subCategoryId) {
        query = query.eq('subcategory_id', subCategoryId);
        console.log('✅ 已应用子分类筛选条件');
      }
    }

    // 国别筛选 - 优化查询逻辑
    if (country) {
      console.log('🔍 开始查找国家:', country);
      let countryId = null;
      
      // 优化：先判断是否为UUID格式
      if (country.includes('-') && country.length > 30) {
        countryId = country;
        console.log('✅ 使用UUID作为国家ID:', countryId);
      } else {
        // 通过code查找ID
        const { data, error } = await supabaseAdmin
          .from('admin_countries')
          .select('id')
          .eq('code', country)
          .single();
        
        if (!error && data) {
          countryId = data.id;
          console.log('✅ 通过code找到国家ID:', country, '->', countryId);
        } else {
          console.log('❌ 未找到国家:', country);
        }
      }
      
      if (countryId) {
        query = query.eq('company_country_id', countryId);
        console.log('✅ 已应用国家筛选条件');
      }
    }

    // 省份筛选 - 优化查询逻辑
    if (province) {
      console.log('🔍 开始查找省份:', province);
      let provinceId = null;
      
      // 优化：先判断是否为UUID格式
      if (province.includes('-') && province.length > 30) {
        provinceId = province;
        console.log('✅ 使用UUID作为省份ID:', provinceId);
      } else {
        // 通过code查找ID
        const { data, error } = await supabaseAdmin
          .from('admin_provinces')
          .select('id')
          .eq('code', province)
          .single();
        
        if (!error && data) {
          provinceId = data.id;
          console.log('✅ 通过code找到省份ID:', province, '->', provinceId);
        } else {
          console.log('❌ 未找到省份:', province);
        }
      }
      
      if (provinceId) {
        query = query.eq('company_province_id', provinceId);
        console.log('✅ 已应用省份筛选条件');
      }
    }

    // 经开区筛选 - 优化查询逻辑
    if (developmentZone) {
      console.log('🔍 开始查找经开区:', developmentZone);
      let zoneId = null;
      
      // 优化：先判断是否为UUID格式
      if (developmentZone.includes('-') && developmentZone.length > 30) {
        zoneId = developmentZone;
        console.log('✅ 使用UUID作为经开区ID:', zoneId);
      } else {
        // 通过code查找ID
        const { data, error } = await supabaseAdmin
          .from('admin_development_zones')
          .select('id')
          .eq('code', developmentZone)
          .single();
        
        if (!error && data) {
          zoneId = data.id;
          console.log('✅ 通过code找到经开区ID:', developmentZone, '->', zoneId);
        } else {
          console.log('❌ 未找到经开区:', developmentZone);
        }
      }
      
      if (zoneId) {
        query = query.eq('company_development_zone_id', zoneId);
        console.log('✅ 已应用经开区筛选条件');
      }
    }

    // 排序
    let orderField = 'updated_at';
    let orderAscending = false;

    switch (sortBy) {
      case 'updateTime':
        orderField = 'updated_at';
        orderAscending = false;
        break;
      case 'nameAsc':
        orderField = 'name_zh';
        orderAscending = true;
        break;
      case 'nameDesc':
        orderField = 'name_zh';
        orderAscending = false;
        break;
    }

    // 执行联合查询
    console.log('🎯 开始执行联合查询，应用的筛选条件总数:', Object.values(filterConditions).filter(Boolean).length);
    
    const { data: technologies, error, count } = await query
      .order('featured_weight', { ascending: false })
      // Primary order by selected field, then tie-break by id for stable pagination
      .order(orderField, { ascending: orderAscending })
      .order('id', { ascending: true })
      .range(from, to);

    if (error) {
      console.error('搜索技术失败:', error);
      return NextResponse.json(
        { error: '搜索失败: ' + error.message },
        { status: 500 }
      );
    }

    console.log(`🎯 联合查询完成: 找到 ${count} 个技术，返回 ${technologies?.length} 个`);
    console.log('📊 筛选效果:', {
      appliedFilters: Object.values(filterConditions).filter(Boolean).length,
      totalResults: count,
      returnedResults: technologies?.length
    });
    
    // 详细日志：显示前几个技术的关键信息
    if (technologies && technologies.length > 0) {
      console.log('🔍 返回的技术列表（前3个）:');
      technologies.slice(0, 3).forEach((tech, index) => {
        console.log(`  ${index + 1}. ${tech.name_zh} (ID: ${tech.id}, 状态: ${tech.review_status}, 更新时间: ${tech.updated_at})`);
      });
    }

    // 性能优化：批量获取关联数据
    const categoryIds = Array.from(new Set(technologies?.map(tech => tech.category_id).filter(Boolean)));
    const subcategoryIds = Array.from(new Set(technologies?.map(tech => tech.subcategory_id).filter(Boolean)));
    const countryIds = Array.from(new Set(technologies?.map(tech => tech.company_country_id).filter(Boolean)));
    const developmentZoneIds = Array.from(new Set(technologies?.map(tech => tech.company_development_zone_id).filter(Boolean)));

    console.log('🔄 批量查询关联数据:', {
      categories: categoryIds.length,
      subcategories: subcategoryIds.length,
      countries: countryIds.length,
      developmentZones: developmentZoneIds.length
    });

    // 并行查询所有关联数据，优化查询性能
    const [categoriesData, subcategoriesData, countriesData, developmentZonesData] = await Promise.all([
      categoryIds.length > 0 ? supabaseAdmin.from('admin_categories').select('id, name_zh, name_en').in('id', categoryIds) : { data: [] },
      subcategoryIds.length > 0 ? supabaseAdmin.from('admin_subcategories').select('id, name_zh, name_en').in('id', subcategoryIds) : { data: [] },
      countryIds.length > 0 ? supabaseAdmin.from('admin_countries').select('id, name_zh, name_en, logo_url').in('id', countryIds) : { data: [] },
      developmentZoneIds.length > 0 ? supabaseAdmin.from('admin_development_zones').select('id, name_zh, name_en').in('id', developmentZoneIds) : { data: [] }
    ]);
    
    console.log('✅ 关联数据查询完成');

    // 创建查找映射
    const categoriesMap = new Map((categoriesData.data || []).map((item: any) => [item.id, item]));
    const subcategoriesMap = new Map((subcategoriesData.data || []).map((item: any) => [item.id, item]));
    const countriesMap = new Map((countriesData.data || []).map((item: any) => [item.id, item]));
    const developmentZonesMap = new Map((developmentZonesData.data || []).map((item: any) => [item.id, item]));

    // 数据转换，使用数据库中的企业信息
    const products = technologies?.map(tech => {
      // 处理附件信息，支持新旧格式
      let attachmentUrls: string[] = [];
      let attachmentNames: string[] = [];

      if (tech.attachments && Array.isArray(tech.attachments)) {
        // 新格式：attachments 数组包含 { url, filename, size, type } 对象
        attachmentUrls = tech.attachments.map((att: any) => att.url);
        attachmentNames = tech.attachments.map((att: any) => att.filename);
      } else if (tech.attachment_urls && Array.isArray(tech.attachment_urls)) {
        // 旧格式：attachment_urls 字符串数组
        attachmentUrls = tech.attachment_urls;
        attachmentNames = tech.attachment_urls.map((url: string) => {
          // 从URL中提取或生成友好的文件名
          const urlPath = url.split('/').pop() || '';
          const parts = urlPath.split('.');
          if (parts.length > 1) {
            const ext = parts.pop();
            return `技术资料.${ext}`;
          }
          return '技术资料';
        });
      } else {
        // 兼容性：检查是否在attachment_urls字段中保存了完整附件信息
        attachmentUrls = [];
        attachmentNames = [];
      }

      return {
        id: tech.id,
        companyName: tech.company_name_zh || '未知企业',
        companyNameEn: tech.company_name_en || tech.company_name_zh || 'Unknown Company',
        companyLogo: tech.company_logo_url || '',
        companyLogoUrl: tech.company_logo_url || '',
        solutionTitle: tech.name_zh || tech.name_en || '未知技术',
        solutionTitleEn: tech.name_en || tech.name_zh || 'Unknown Technology',
        solutionImage: tech.image_url || '',
        solutionThumbnail: tech.image_url || '',
        solutionDescription: tech.description_zh || tech.description_en || '',
        solutionDescriptionEn: tech.description_en || tech.description_zh || '',
        shortDescription: (tech.description_zh || tech.description_en || '').slice(0, 100) + '...',
        shortDescriptionEn: (tech.description_en || tech.description_zh || '').slice(0, 100) + '...',
        fullDescription: tech.description_zh || tech.description_en || '',
        fullDescriptionEn: tech.description_en || tech.description_zh || '',
        attachmentUrls, // 附件URL数组
        attachmentNames, // 附件原始文件名数组
        // 新增标签字段 - 从映射中获取
        categoryName: categoriesMap.get(tech.category_id)?.name_zh || '',
        categoryNameEn: categoriesMap.get(tech.category_id)?.name_en || '',
        subCategoryName: subcategoriesMap.get(tech.subcategory_id)?.name_zh || '',
        subCategoryNameEn: subcategoriesMap.get(tech.subcategory_id)?.name_en || '',
        countryName: countriesMap.get(tech.company_country_id)?.name_zh || '',
        countryNameEn: countriesMap.get(tech.company_country_id)?.name_en || '',
        countryFlagUrl: countriesMap.get(tech.company_country_id)?.logo_url || '',
        developmentZoneName: developmentZonesMap.get(tech.company_development_zone_id)?.name_zh || '',
        developmentZoneNameEn: developmentZonesMap.get(tech.company_development_zone_id)?.name_en || '',
        custom_label: tech.custom_label || '', // 应用场景标签
        featuredWeight: tech.featured_weight ?? 0,
        // 原有字段保持兼容性
        category: category || '',
        subCategory: '',
        country: tech.company_country_id || '',
        province: tech.company_province_id || '',
        developmentZone: tech.company_development_zone_id || '',
        hasContact: true,
        updateTime: tech.updated_at || tech.created_at
      };
    }) || [];

    const result = {
      products,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
      categories: [],
      stats: {
        companyCount: 0,
        technologyCount: count || 0,
        totalResults: count || 0
      }
    };

    const response = NextResponse.json({
      success: true,
      data: result
    });
    
    // 性能优化：如果没有筛选条件，允许短期缓存
    const hasFilters = Object.values(filterConditions).some(Boolean);
    if (hasFilters || keyword) {
      // 有筛选条件时，禁用缓存确保数据实时性
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    } else {
      // 无筛选条件时，允许短期缓存提高性能
      response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    }
    
    return response;

  } catch (error) {
    console.error('技术搜索API错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误: ' + (error instanceof Error ? error.message : '未知错误') },
      { status: 500 }
    );
  }
}
