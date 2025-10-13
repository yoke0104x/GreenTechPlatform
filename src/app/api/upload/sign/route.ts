import { NextRequest, NextResponse } from 'next/server'

import { authenticateRequestUser, serviceSupabase } from '@/app/api/_utils/auth'
import { allowedAttachmentHint, isAllowedTechAttachmentMeta } from '@/lib/validators'

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024 // 10MB

const sanitizeFolder = (folder: string) => {
  const segments = folder
    .split('/')
    .map(segment => segment.trim())
    .filter(Boolean)

  if (segments.some(segment => segment === '..')) {
    throw new Error('非法的文件夹路径')
  }

  return segments.join('/')
}

const buildStoragePath = (folder: string, filename: string, userId: string) => {
  const fileExt = (() => {
    const parts = filename.split('.')
    if (parts.length <= 1) return ''
    const ext = parts.pop() || ''
    return ext ? `.${ext.toLowerCase()}` : ''
  })()

  const uniqueName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}${fileExt}`
  return folder ? `${folder}/${uniqueName}` : uniqueName
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequestUser(request)

    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    if (!serviceSupabase) {
      return NextResponse.json({ error: '存储服务未配置' }, { status: 500 })
    }

    const body = await request.json().catch(() => null)

    if (!body) {
      return NextResponse.json({ error: '请求体无效' }, { status: 400 })
    }

    const {
      bucket = 'images',
      folder = 'uploads',
      filename = 'file',
      contentType = 'application/octet-stream',
      size = 0
    } = body as {
      bucket?: string
      folder?: string
      filename?: string
      contentType?: string
      size?: number
    }

    if (typeof size === 'number' && size > MAX_UPLOAD_SIZE) {
      return NextResponse.json({ error: '文件大小不能超过10MB' }, { status: 400 })
    }

    let sanitizedFolder = ''
    try {
      sanitizedFolder = sanitizeFolder(folder)
    } catch (error) {
      console.error('❌ 非法的文件夹路径:', { folder, error })
      return NextResponse.json({ error: '非法的文件夹路径' }, { status: 400 })
    }

    const isTechAttachmentFolder = sanitizedFolder.includes('technology-attachments')
    const isImage = contentType?.startsWith('image/') ?? false

    if (!isImage) {
      if (isTechAttachmentFolder) {
        if (!isAllowedTechAttachmentMeta(filename, contentType)) {
          return NextResponse.json(
            {
              error: `不支持的文件类型。${allowedAttachmentHint('zh')}`
            },
            { status: 400 }
          )
        }
      } else {
        return NextResponse.json({ error: '只支持图片文件' }, { status: 400 })
      }
    }

    const storagePath = buildStoragePath(sanitizedFolder, filename, user.id)

    console.log('📤 用户生成签名上传URL:', {
      storagePath,
      bucket,
      contentType,
      size,
      userId: user.id
    })

    const { data, error } = await serviceSupabase.storage
      .from(bucket)
      .createSignedUploadUrl(storagePath, 300)

    if (error || !data?.signedUrl) {
      console.error('❌ 生成签名上传URL失败:', error)
      return NextResponse.json({ error: error?.message || '生成签名上传URL失败' }, { status: 500 })
    }

    const { data: publicData } = serviceSupabase.storage
      .from(bucket)
      .getPublicUrl(storagePath)

    if (!publicData?.publicUrl) {
      return NextResponse.json({ error: '无法生成文件访问URL' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        signedUrl: data.signedUrl,
        path: data.path ?? storagePath,
        url: publicData.publicUrl,
        maxSize: MAX_UPLOAD_SIZE,
        contentType
      }
    })
  } catch (error) {
    console.error('💥 生成用户签名上传URL异常:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : '生成上传凭证失败'
    }, { status: 500 })
  }
}
