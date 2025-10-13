import { safeFetch, handleApiResponse } from '@/lib/safe-fetch';

/**
 * 附件信息接口
 */
export interface FileAttachment {
  url: string
  filename: string
  size: number
  type: string
}

interface SignedUploadPayload {
  signedUrl: string
  url: string
  path: string
  maxSize?: number
  contentType?: string
}

const DEFAULT_CONTENT_TYPE = 'application/octet-stream'

const isAdminUploadContext = () => {
  if (typeof window === 'undefined') return false
  return window.location.pathname.startsWith('/admin')
}

async function requestSignedUpload(
  file: File,
  bucket: string,
  folder: string
): Promise<SignedUploadPayload> {
  const adminContext = isAdminUploadContext()
  const targetUrl = adminContext ? '/api/admin/upload/sign' : '/api/upload/sign'

  const response = await safeFetch(targetUrl, {
    method: 'POST',
    useAuth: !adminContext,
    body: JSON.stringify({
      bucket,
      folder,
      filename: file.name,
      contentType: file.type || DEFAULT_CONTENT_TYPE,
      size: file.size,
    }),
  })

  const result = await handleApiResponse(response)
  const payload = (result?.data ?? result) as SignedUploadPayload | null

  if (!payload?.signedUrl || !payload.url) {
    throw new Error('上传失败：未返回签名URL或文件URL')
  }

  if (typeof payload.maxSize === 'number' && file.size > payload.maxSize) {
    throw new Error('文件大小超过允许的最大限制')
  }

  return payload
}

async function executeSignedUpload(file: File, payload: SignedUploadPayload): Promise<void> {
  const uploadResponse = await fetch(payload.signedUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type || payload.contentType || DEFAULT_CONTENT_TYPE,
      'x-upsert': 'false',
    },
    body: file,
  })

  if (!uploadResponse.ok) {
    let message = `上传失败，状态码: ${uploadResponse.status}`
    try {
      const text = await uploadResponse.text()
      if (text) {
        message = `${message}，信息: ${text}`
      }
    } catch (error) {
      console.warn('读取签名上传失败响应时出错:', error)
    }
    throw new Error(message)
  }
}

/**
 * 上传文件到 Supabase Storage
 * @param file 要上传的文件
 * @param bucket 存储桶名称
 * @param folder 文件夹路径
 * @returns 上传成功后的公共URL
 */
export async function uploadFileToSupabase(
  file: File,
  bucket: string = 'images',
  folder: string = 'uploads'
): Promise<string> {
  console.log(`开始上传文件到存储桶 '${bucket}', 文件夹 '${folder}'`)
  console.log(`文件信息: ${file.name}, 大小: ${file.size}字节, 类型: ${file.type}`)

  try {
    const payload = await requestSignedUpload(file, bucket, folder)
    await executeSignedUpload(file, payload)
    return payload.url
  } catch (error) {
    console.error('上传过程中发生错误:', error)
    if (error instanceof Error) throw error
    throw new Error('上传失败，请重试')
  }
}

/**
 * 删除文件从 Supabase Storage
 * @param url 文件的公共URL
 * @param bucket 存储桶名称
 */
export async function deleteFileFromSupabase(
  url: string,
  bucket: string = 'images'
): Promise<void> {
  try {
    const isAdminPage = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
    const deleteUrl = isAdminPage ? '/api/admin/upload/delete' : '/api/upload/delete'

    const response = await safeFetch(deleteUrl, {
      method: 'POST',
      useAuth: !isAdminPage,
      body: JSON.stringify({ url, bucket }),
    })

    await handleApiResponse(response)
  } catch (error) {
    console.error('删除文件失败:', error)
    if (error instanceof Error) throw error
    throw new Error('删除文件失败，请重试')
  }
}

/**
 * 上传用户头像
 */
export async function uploadUserAvatar(file: File): Promise<string> {
  return uploadFileToSupabase(file, 'images', 'avatars');
}

/**
 * 上传企业Logo
 */
export async function uploadCompanyLogo(file: File): Promise<string> {
  return uploadFileToSupabase(file, 'images', 'company-logos');
}

/**
 * 上传轮播图
 */
export async function uploadCarouselImage(file: File): Promise<string> {
  return uploadFileToSupabase(file, 'images', 'carousel');
}

/**
 * 上传技术图片
 */
export async function uploadTechnologyImage(file: File): Promise<string> {
  return uploadFileToSupabase(file, 'images', 'technologies');
}

/**
 * 上传附件并返回完整附件信息
 * @param file 要上传的文件
 * @param bucket 存储桶名称
 * @param folder 文件夹路径
 * @returns 包含原始文件名的附件信息
 */
export async function uploadFileWithInfo(
  file: File,
  bucket: string = 'images',
  folder: string = 'uploads'
): Promise<FileAttachment> {
  console.log(`开始上传文件到存储桶 '${bucket}', 文件夹 '${folder}'`)
  console.log(`文件信息: ${file.name}, 大小: ${file.size}字节, 类型: ${file.type}`)

  try {
    const payload = await requestSignedUpload(file, bucket, folder)
    await executeSignedUpload(file, payload)

    return {
      url: payload.url,
      filename: file.name,
      size: file.size,
      type: file.type,
    }
  } catch (error) {
    console.error('上传过程中发生错误:', error)
    if (error instanceof Error) throw error
    throw new Error('上传失败，请重试')
  }
}

/**
 * 批量上传附件
 * @param files 要上传的文件数组
 * @param bucket 存储桶名称
 * @param folder 文件夹路径
 * @returns 附件信息数组
 */
export async function uploadMultipleFilesWithInfo(
  files: File[],
  bucket: string = 'images',
  folder: string = 'uploads'
): Promise<FileAttachment[]> {
  const uploadPromises = files.map(file => uploadFileWithInfo(file, bucket, folder));
  return Promise.all(uploadPromises);
}
