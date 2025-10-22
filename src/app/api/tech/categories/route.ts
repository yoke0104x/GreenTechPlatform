import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Fallback 分类数据
const fallbackCategories = [
  {
    id: 'energy-saving',
    name: '节能',
    nameEn: 'ENERGY SAVING',
    icon: 'default',
    count: 0,
    color: '#3B82F6'
  },
  {
    id: 'clean-energy',
    name: '清洁能源',
    nameEn: 'CLEAN ENERGY',
    icon: 'default',
    count: 0,
    color: '#10B981'
  },
  {
    id: 'clean-production',
    name: '清洁生产',
    nameEn: 'CLEAN PRODUCTION',
    icon: 'default',
    count: 0,
    color: '#F59E0B'
  },
  {
    id: 'new-energy-vehicle',
    name: '新能源汽车',
    nameEn: 'NEW ENERGY VEHICLE',
    icon: 'default',
    count: 0,
    color: '#EF4444'
  }
];

// GET - 获取产品分类
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 开始获取产品分类...');
    
    // 检查管理员客户端是否可用
    const db = supabaseAdmin;
    if (!db) {
      console.warn('⚠️ supabaseAdmin 不可用，使用fallback数据');
      return NextResponse.json({
        success: true,
        data: fallbackCategories
      });
    }

    try {
      console.log('📊 从数据库获取分类数据...');

      // 获取所有启用的分类（与管理后台保持一致的查询逻辑）
      const { data: categories, error } = await db
        .from('admin_categories')
        .select('id, name_zh, name_en, slug, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('❌ 获取分类失败:', error);
        console.warn('🔄 数据库查询失败，返回空分类列表');
        return NextResponse.json({
          success: true,
          data: []
        });
      }

      console.log(`✅ 找到 ${categories?.length} 个启用的分类`);

      // 英文名称映射表
      const englishNameMap: { [key: string]: string } = {
        'energy-saving': 'ENERGY SAVING',
        'clean-energy': 'CLEAN ENERGY', 
        'clean-production': 'CLEAN PRODUCTION',
        'new-energy-vehicle': 'NEW ENERGY VEHICLE'
      };

      // 为每个分类统计对应的技术数量（仅统计启用且已发布的技术）
      const categoriesWithCount = await Promise.all(
        (categories || []).map(async (category: any) => {
          const categorySlug = category.slug || String(category.id);
          
          // 使用 head + count 提高性能，仅返回计数
          const { count: techCount, error: countError } = await db
            .from('admin_technologies')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true)
            .eq('review_status', 'published')
            .eq('category_id', category.id);

          if (countError) {
            console.warn(`⚠️ 统计分类(${categorySlug})技术数量失败:`, countError);
          }

          return {
            id: categorySlug, // 前端按slug识别分类
            name: category.name_zh || category.name_en || '未命名分类',
            nameEn: category.name_en || englishNameMap[categorySlug] || 'UNNAMED CATEGORY',
            icon: 'default',
            count: techCount || 0,
            color: '#3B82F6'
          };
        })
      );

      // 过滤掉没有任何技术的分类（例如误创建后删除的空分类）
      const filteredCategories = categoriesWithCount.filter(category => {
        if (category.count > 0) {
          return true;
        }

        console.log('🧹 跳过没有技术数据的分类:', {
          id: category.id,
          name: category.name,
          count: category.count
        });

        return false;
      });

      const categoriesToReturn = filteredCategories.length > 0 ? filteredCategories : categoriesWithCount;

      console.log('✅ 返回分类数据:', categoriesToReturn);

      const response = NextResponse.json({
        success: true,
        data: categoriesToReturn
      });

      // 添加缓存控制头，确保数据实时性
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');

      return response;
      
    } catch (dbError) {
      console.error('❌ 数据库查询失败:', dbError);
      console.warn('🔄 数据库连接异常，返回空分类列表');
      return NextResponse.json({
        success: true,
        data: []
      });
    }

  } catch (error) {
    console.error('❌ 获取分类API错误:', error);
    console.warn('🔄 最终fallback: 返回空分类列表');
    
    // 最终fallback，确保API始终返回数据但避免显示过期数据
    return NextResponse.json({
      success: true,
      data: []
    });
  }
}
