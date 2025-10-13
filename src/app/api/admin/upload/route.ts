import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase'

import { isAllowedTechAttachment, allowedAttachmentHint } from '@/lib/validators'

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: '12mb',
  },
}

export async function POST(request: NextRequest) {
  try {
    // 检查管理员权限
    if (!checkAdminAuth(request)) {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase admin client not available' }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const bucket = (formData.get('bucket') as string) || 'images'
    const folder = (formData.get('folder') as string) || 'uploads'

    if (!file) {
      return NextResponse.json({ success: false, error: '没有提供文件' }, { status: 400 })
    }

    console.log('📤 管理员文件上传:', {
      name: file.name,
      size: file.size,
      type: file.type,
      bucket,
      folder
    })

    const isImageFile = file.type ? file.type.startsWith('image/') : false
    const isTechAttachmentFolder = folder.includes('technology-attachments')

    if (!isImageFile) {
      if (isTechAttachmentFolder) {
        const allowed = isAllowedTechAttachment(file)
        if (!allowed) {
          return NextResponse.json(
            {
              success: false,
              error: `不支持的文件类型。${allowedAttachmentHint('zh')}`,
            },
            { status: 400 }
          )
        }
      } else {
        return NextResponse.json({ success: false, error: '只支持图片文件' }, { status: 400 })
      }
    }

    // 验证文件大小 (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({ success: false, error: '文件大小不能超过10MB' }, { status: 400 })
    }

    // 生成唯一文件名
    const fileExt = file.name.split('.').pop()
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

    console.log('📤 生成的文件名:', fileName)

    // 上传文件到 Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    const { data, error } = await supabaseAdmin.storage
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
          success: false,
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
    const { data: publicData } = supabaseAdmin.storage
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
