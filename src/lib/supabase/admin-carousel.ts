// 轮播图数据操作层

import { supabase, supabaseAdmin } from '@/lib/supabase'
import { 
  AdminCarouselImage,
  CreateCarouselImageData,
  UpdateCarouselImageData,
  PaginationParams,
  PaginatedResponse
} from '@/lib/types/admin'

/**
 * 获取所有轮播图
 * @param scene 可选场景标识，例如 'home' | 'parks'
 */
export async function getCarouselImages(scene?: string): Promise<AdminCarouselImage[]> {
  let query = supabase
    .from('admin_carousel_images')
    .select('*')
    .eq('is_active', true)

  if (scene) {
    query = query.eq('scene', scene)
  }

  const { data, error } = await query.order('sort_order', { ascending: true })

  if (error) {
    console.error('获取轮播图失败:', error)
    throw new Error(`获取轮播图失败: ${error.message}`)
  }

  return data || []
}

/**
 * 获取分页轮播图列表
 */
export async function getCarouselImagesPaginated(params: PaginationParams = {}): Promise<PaginatedResponse<AdminCarouselImage>> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available')
  }

  const { 
    page = 1, 
    pageSize = 10, 
    search = '', 
    sortBy = 'sort_order', 
    sortOrder = 'asc',
    scene
  } = params

  let query = supabaseAdmin
    .from('admin_carousel_images')
    .select('*', { count: 'exact' })

  if (scene) {
    query = query.eq('scene', scene)
  }

  // 搜索功能
  if (search) {
    query = query.or(`title_zh.ilike.%${search}%,title_en.ilike.%${search}%,description_zh.ilike.%${search}%,description_en.ilike.%${search}%`)
  }

  // 排序
  query = query.order(sortBy, { ascending: sortOrder === 'asc' })

  // 分页
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('获取分页轮播图失败:', error)
    throw new Error(`获取分页轮播图失败: ${error.message}`)
  }

  return {
    data: data || [],
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize)
    }
  }
}

/**
 * 根据ID获取单个轮播图
 */
export async function getCarouselImageById(id: string): Promise<AdminCarouselImage | null> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available')
  }

  const { data, error } = await supabaseAdmin
    .from('admin_carousel_images')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('获取轮播图详情失败:', error)
    throw new Error(`获取轮播图详情失败: ${error.message}`)
  }

  return data
}

/**
 * 创建轮播图
 */
export async function createCarouselImage(data: CreateCarouselImageData): Promise<AdminCarouselImage> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available')
  }

  const { data: result, error } = await supabaseAdmin
    .from('admin_carousel_images')
    .insert(data)
    .select()
    .single()

  if (error) {
    console.error('创建轮播图失败:', error)
    throw new Error(`创建轮播图失败: ${error.message}`)
  }

  return result
}

/**
 * 更新轮播图
 */
export async function updateCarouselImage(id: string, data: UpdateCarouselImageData): Promise<AdminCarouselImage> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available')
  }

  const { data: result, error } = await supabaseAdmin
    .from('admin_carousel_images')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('更新轮播图失败:', error)
    throw new Error(`更新轮播图失败: ${error.message}`)
  }

  return result
}

/**
 * 删除轮播图
 */
export async function deleteCarouselImage(id: string): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available')
  }

  const { error } = await supabaseAdmin
    .from('admin_carousel_images')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('删除轮播图失败:', error)
    throw new Error(`删除轮播图失败: ${error.message}`)
  }
}

/**
 * 软删除轮播图（设置为不活跃）
 */
export async function softDeleteCarouselImage(id: string): Promise<AdminCarouselImage> {
  return updateCarouselImage(id, { is_active: false })
}

/**
 * 批量更新轮播图排序
 */
export async function updateCarouselImagesOrder(updates: { id: string; sort_order: number }[]): Promise<void> {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not available')
  }

  const updatePromises = updates.map(update => 
    supabaseAdmin!
      .from('admin_carousel_images')
      .update({ sort_order: update.sort_order })
      .eq('id', update.id)
  )

  const results = await Promise.all(updatePromises)
  
  const errors = results.filter(result => result.error)
  if (errors.length > 0) {
    console.error('批量更新轮播图排序失败:', errors)
    throw new Error('批量更新轮播图排序失败')
  }
}

/**
 * 获取下一个排序值
 */
export async function getNextSortOrder(): Promise<number> {
  if (!supabaseAdmin) {
    console.error('Supabase admin client not available')
    return 1
  }

  const { data, error } = await supabaseAdmin
    .from('admin_carousel_images')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)

  if (error) {
    console.error('获取排序值失败:', error)
    return 1
  }

  return (data?.[0]?.sort_order || 0) + 1
}
