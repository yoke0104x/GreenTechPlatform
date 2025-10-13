import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequestUser, serviceSupabase } from '@/app/api/_utils/auth'

function getStorageClient() {
  if (serviceSupabase) {
    return serviceSupabase
  }

  throw new Error('Supabase storage client not configured')
}

// POST - 用户上传文件到 Supabase Storage（通过服务端代理）
export async function POST(request: NextRequest) {
  const user = await authenticateRequestUser(request)
  if (!user) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
  }

  const client = (() => {
    try {
      return getStorageClient()
    } catch (error) {
      console.error('Storage client 初始化失败:', error)
      return null
    }
  })()

  if (!client) {
    return NextResponse.json({ success: false, error: '存储服务未配置' }, { status: 500 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bucket = (formData.get('bucket') as string) || 'images'
    const folder = (formData.get('folder') as string) || 'uploads'

    if (!file) {
      return NextResponse.json({ success: false, error: '没有提供文件' }, { status: 400 })
    }

    console.log('📤 用户文件上传:', {
      name: file.name,
      size: file.size,
      type: file.type,
      bucket,
      folder
    })

    // 验证文件类型（统一支持图片与常见文档）
    const allowedTypes = new Set([
      // images
      'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
      // pdf
      'application/pdf',
      // office docs
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // text
      'text/plain'
    ])
    if (!(file.type && (file.type.startsWith('image/') || allowedTypes.has(file.type)))) {
      return NextResponse.json({ success: false, error: '不支持的文件类型' }, { status: 400 })
    }

    // 验证文件大小 (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: '文件大小不能超过10MB' }, { status: 400 })
    }

    // 生成唯一文件名
    const fileExt = file.name.split('.').pop()
    const fileName = `${folder}/${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    
    console.log('📤 生成的文件名:', fileName)

    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // 上传文件到 Supabase Storage
    const { data, error } = await client.storage
      .from(bucket)
      .upload(fileName, fileBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined
      })

    if (error) {
      console.error('❌ Supabase Storage 上传错误:', error)
       
      if (error.message.includes('Bucket not found')) {
        return NextResponse.json({ 
          error: `存储桶 '${bucket}' 不存在` 
        }, { status: 400 })
      }
      
      return NextResponse.json({ 
        success: false,
        error: `上传失败: ${error.message}` 
      }, { status: 500 })
    }

    console.log('✅ 文件上传成功:', data.path)

    // 获取公共URL
    const { data: publicData } = client.storage
      .from(bucket)
      .getPublicUrl(fileName)

    if (!publicData || !publicData.publicUrl) {
      return NextResponse.json({ 
        success: false,
        error: '无法生成文件访问URL' 
      }, { status: 500 })
    }

    console.log('✅ 公共URL生成成功:', publicData.publicUrl)

    return NextResponse.json({
      success: true,
      data: {
        url: publicData.publicUrl,
        filename: file.name,
        size: file.size,
        type: file.type,
        path: data.path,
      }
    })

  } catch (error) {
    console.error('💥 文件上传过程中出现异常:', error)
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : '上传失败，请重试' 
    }, { status: 500 })
  }
}
