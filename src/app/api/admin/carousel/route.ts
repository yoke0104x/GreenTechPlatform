import { NextRequest, NextResponse } from 'next/server'
import { 
  getCarouselImagesPaginated,
  createCarouselImage
} from '@/lib/supabase/admin-carousel'
import { CreateCarouselImageData } from '@/lib/types/admin'
import { checkAdminAuth } from '@/lib/admin-auth'

// GET - 获取轮播图列表（分页）
export async function GET(request: NextRequest) {
  // 检查管理员权限
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '10')
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'sort_order'
    const sortOrder = (searchParams.get('sortOrder') || 'asc') as 'asc' | 'desc'
    const scene = searchParams.get('scene') || undefined

    console.log('📷 管理员获取轮播图列表:', { page, pageSize, search, sortBy, sortOrder, scene })

    const result = await getCarouselImagesPaginated({
      page,
      pageSize,
      search,
      sortBy,
      sortOrder,
      scene
    })

    console.log('📷 轮播图列表获取成功:', result.data.length)

    return NextResponse.json(result)
  } catch (error) {
    console.error('获取轮播图列表失败:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '获取轮播图列表失败' 
    }, { status: 500 })
  }
}

// POST - 创建新轮播图
export async function POST(request: NextRequest) {
  // 检查管理员权限
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 401 })
  }

  try {
    const body = await request.json()
    console.log('📷 创建轮播图请求数据:', body)

    // 验证必填字段
    if (!body.image_url) {
      return NextResponse.json({ 
        error: '图片地址不能为空' 
      }, { status: 400 })
    }

    const carouselData: CreateCarouselImageData = {
      title_zh: body.title_zh || undefined,
      title_en: body.title_en || undefined,
      description_zh: body.description_zh || undefined,
      description_en: body.description_en || undefined,
      image_url: body.image_url,
      link_url: body.link_url || undefined,
      sort_order: body.sort_order || 0,
      is_active: body.is_active !== undefined ? body.is_active : true,
      scene: body.scene || undefined
    }

    console.log('📷 准备创建轮播图:', carouselData)

    const result = await createCarouselImage(carouselData)

    console.log('📷 轮播图创建成功:', result.id)

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('创建轮播图失败:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : '创建轮播图失败' 
    }, { status: 500 })
  }
}
