// 通用输入校验工具（邮箱、手机号）

// 简单邮箱校验：username@domain.tld
export function isValidEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const clean = String(email).trim()
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(clean)
}

// 手机号校验：根据国家代码选择规则
// - 中国(+86): 必须以1开头的11位手机号 /^1[3-9]\d{9}$/
// - 美国/加拿大(+1): 10位数字 /^\d{10}$/
// - 其他: 允许6-15位数字（可包含前导+与空格去除后校验）
export function isValidPhone(phone: string | null | undefined, countryCode: string = '+86'): boolean {
  if (!phone) return false
  const digits = String(phone).replace(/[^\d]/g, '')
  switch (countryCode) {
    case '+86':
      return /^1[3-9]\d{9}$/.test(digits)
    case '+1':
      return /^\d{10}$/.test(digits)
    default:
      return /^\d{6,15}$/.test(digits)
  }
}

// 生成本地化错误提示
export function emailError(locale: 'en' | 'zh') {
  return locale === 'en' ? 'Please enter a valid email address' : '请输入有效的邮箱地址'
}

export function phoneError(locale: 'en' | 'zh') {
  return locale === 'en' ? 'Please enter a valid phone number' : '请输入有效的手机号码'
}

// ============== 技术附件校验 ==============
const ALLOWED_ATTACHMENT_EXTS = [
  '.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg'
]

const ALLOWED_ATTACHMENT_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg'
]

export function isAllowedTechAttachmentMeta(
  filename: string | null | undefined,
  mimeType?: string | null
): boolean {
  const mimeOk = mimeType ? ALLOWED_ATTACHMENT_MIME.includes(mimeType) : false
  if (mimeOk) return true
  const name = (filename || '').toLowerCase()
  return ALLOWED_ATTACHMENT_EXTS.some(ext => name.endsWith(ext))
}

export function isAllowedTechAttachment(file: File): boolean {
  return isAllowedTechAttachmentMeta(file.name, file.type)
}

export function allowedAttachmentHint(locale: 'en' | 'zh') {
  const list = 'pdf, doc, docx, ppt, pptx, xls, xlsx, png, jpg, jpeg'
  return locale === 'en'
    ? `Allowed file types: ${list}`
    : `允许的文件类型：${list}`
}
