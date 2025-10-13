/**
 * 自定义认证系统工具函数
 * 提供密码哈希、JWT生成验证、用户管理等功能
 */

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// JWT payload 接口
export interface CustomAuthPayload {
  userId: string
  phone: string
  name: string
  role: string
  type: 'custom' // 区分自定义认证
  iat: number
  exp: number
}

// 用户接口
export interface CustomUser {
  id: string
  phone: string
  countryCode: string
  name: string | null
  email: string | null
  role: string
  avatarUrl: string | null
  createdAt: string
  lastLoginAt: string | null
  isActive: boolean
  userMetadata: Record<string, any>
}

// 登录结果接口
export interface CustomAuthResult {
  user: CustomUser
  token: string
  refreshToken?: string
}

/**
 * 密码哈希
 * @param password 明文密码
 * @returns 哈希后的密码
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) {
    throw new Error('密码不能为空')
  }
  
  if (password.length < 6) {
    throw new Error('密码长度不能少于6位')
  }
  
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

/**
 * 验证密码
 * @param password 明文密码
 * @param hash 哈希密码
 * @returns 是否匹配
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return false
  }
  
  try {
    return await bcrypt.compare(password, hash)
  } catch (error) {
    console.error('密码验证错误:', error)
    return false
  }
}

/**
 * 生成JWT token
 * @param payload token载荷
 * @param expiresIn 过期时间，默认7天
 * @returns JWT token
 */
export function generateToken(
  payload: Omit<CustomAuthPayload, 'iat' | 'exp' | 'type'>, 
  expiresIn: string = '7d'
): string {
  const secret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET 或 SUPABASE_JWT_SECRET 环境变量未设置')
  }
  
  const now = Math.floor(Date.now() / 1000)
  const fullPayload: CustomAuthPayload = {
    ...payload,
    type: 'custom',
    iat: now,
    exp: now + getExpirationSeconds(expiresIn)
  }
  
  return jwt.sign(fullPayload, secret)
}

/**
 * 验证JWT token
 * @param token JWT token
 * @returns 解码后的payload
 */
export function verifyToken(token: string): CustomAuthPayload {
  const secret = process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET 或 SUPABASE_JWT_SECRET 环境变量未设置')
  }
  
  try {
    const decoded = jwt.verify(token, secret) as CustomAuthPayload
    
    // 验证token类型
    if (decoded.type !== 'custom') {
      throw new Error('Invalid token type')
    }
    
    return decoded
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token已过期')
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token')
    } else {
      throw error
    }
  }
}

/**
 * 生成refresh token
 * @param userId 用户ID
 * @returns refresh token
 */
export function generateRefreshToken(userId: string): string {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET
  if (!secret) {
    throw new Error('JWT refresh secret 未设置')
  }
  
  const payload = {
    userId,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000)
  }
  
  return jwt.sign(payload, secret, { expiresIn: '30d' })
}

/**
 * 验证refresh token
 * @param token refresh token
 * @returns 用户ID
 */
export function verifyRefreshToken(token: string): string {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || process.env.SUPABASE_JWT_SECRET
  if (!secret) {
    throw new Error('JWT refresh secret 未设置')
  }
  
  try {
    const decoded = jwt.verify(token, secret) as any
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token type')
    }
    
    return decoded.userId
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token已过期')
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token')
    } else {
      throw error
    }
  }
}

/**
 * 格式化手机号
 * @param phone 原始手机号
 * @param countryCode 国家代码
 * @returns 格式化后的手机号对象
 */
export function formatPhoneNumber(phone: string, countryCode: string = '+86') {
  // 清理手机号，移除所有非数字字符
  const cleanPhone = phone.replace(/\D/g, '')
  
  // 移除国家代码前缀（如果存在）
  let phoneWithoutCountry = cleanPhone
  if (countryCode === '+86' && cleanPhone.startsWith('86')) {
    phoneWithoutCountry = cleanPhone.substring(2)
  } else if (countryCode === '+1' && cleanPhone.startsWith('1')) {
    phoneWithoutCountry = cleanPhone.substring(1)
  }
  
  // 验证手机号格式
  if (countryCode === '+86') {
    if (!/^1[3-9]\d{9}$/.test(phoneWithoutCountry)) {
      throw new Error('手机号格式不正确')
    }
  }
  
  return {
    phone: phoneWithoutCountry,
    phoneWithCountryCode: `${countryCode}${phoneWithoutCountry}`,
    countryCode
  }
}

/**
 * 生成安全的随机字符串
 * @param length 长度
 * @returns 随机字符串
 */
export function generateSecureRandom(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 检查账户锁定状态
 * @param loginAttempts 登录尝试次数
 * @param lockedUntil 锁定截止时间
 * @returns 锁定信息
 */
export function checkAccountLock(loginAttempts: number, lockedUntil: string | null) {
  const maxAttempts = 5
  const lockDuration = 30 * 60 * 1000 // 30分钟
  
  // 检查是否仍在锁定期
  if (lockedUntil) {
    const lockTime = new Date(lockedUntil).getTime()
    const now = Date.now()
    
    if (now < lockTime) {
      const remainingTime = Math.ceil((lockTime - now) / 1000 / 60)
      return {
        isLocked: true,
        remainingMinutes: remainingTime,
        message: `账户已锁定，请${remainingTime}分钟后重试`
      }
    }
  }
  
  // 检查是否达到锁定条件
  if (loginAttempts >= maxAttempts) {
    const lockUntil = new Date(Date.now() + lockDuration)
    return {
      shouldLock: true,
      lockUntil: lockUntil.toISOString(),
      message: `登录失败次数过多，账户已锁定30分钟`
    }
  }
  
  return {
    isLocked: false,
    remainingAttempts: maxAttempts - loginAttempts
  }
}

/**
 * 获取过期时间的秒数
 * @param expiresIn 过期时间字符串
 * @returns 秒数
 */
function getExpirationSeconds(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/)
  if (!match) {
    throw new Error('Invalid expiresIn format')
  }
  
  const value = parseInt(match[1])
  const unit = match[2]
  
  switch (unit) {
    case 's': return value
    case 'm': return value * 60
    case 'h': return value * 60 * 60
    case 'd': return value * 60 * 60 * 24
    default: throw new Error('Invalid time unit')
  }
}

/**
 * 验证密码强度
 * @param password 密码
 * @returns 验证结果
 */
export function validatePasswordStrength(password: string) {
  const issues = []
  
  if (password.length < 6) {
    issues.push('密码长度至少6位')
  }
  
  if (password.length > 128) {
    issues.push('密码长度不能超过128位')
  }
  
  if (!/[a-zA-Z]/.test(password)) {
    issues.push('密码应包含字母')
  }
  
  if (!/\d/.test(password)) {
    issues.push('密码应包含数字')
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    strength: calculatePasswordStrength(password)
  }
}

/**
 * 计算密码强度
 * @param password 密码
 * @returns 强度级别 1-5
 */
function calculatePasswordStrength(password: string): number {
  let score = 0
  
  // 长度
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  
  // 字符类型
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z\d]/.test(password)) score++
  
  return Math.min(score, 5)
}
