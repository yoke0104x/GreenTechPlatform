import { NextRequest, NextResponse } from 'next/server'
import { getCarouselImages } from '@/lib/supabase/admin-carousel'

// 强制动态渲染
export const dynamic = 'force-dynamic';

// GET - 获取活跃的轮播图（公开接口）
export async function GET(request: NextRequest) {
  try {
    console.log('📷 获取公开轮播图数据...')
    const { searchParams } = new URL(request.url)
    const scene = searchParams.get('scene') || undefined
    const images = await getCarouselImages(scene)
    
    console.log('📷 轮播图数据获取成功:', images.length)
    
    return NextResponse.json({
      success: true,
      data: images
    })
  } catch (error) {
    console.error('获取轮播图失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '获取轮播图失败'
    }, { status: 500 })
  }
}
