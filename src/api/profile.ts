import { safeFetch, handleApiResponse } from '@/lib/safe-fetch'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  attemptsLeft?: number
}

type ProfileAuthType = 'custom' | 'supabase'

type CustomUser = {
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

function updateLocalCustomUser(user: CustomUser | null | undefined) {
  if (!user) return
  try {
    localStorage.setItem('custom_user', JSON.stringify(user))
  } catch {
    // ignore
  }
}

export const profileApi = {
  async updateAvatar(avatarUrl: string): Promise<ApiResponse<{ authType: ProfileAuthType; user?: CustomUser | null }>> {
    try {
      const res = await safeFetch('/api/profile/avatar', {
        method: 'POST',
        useAuth: true,
        body: JSON.stringify({ avatarUrl }),
      })
      const data = await handleApiResponse(res)
      if (data?.success && data?.data?.authType === 'custom') {
        updateLocalCustomUser(data.data.user)
      }
      return data
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : '更新头像失败' }
    }
  },

  async sendBindEmailCode(email: string): Promise<ApiResponse<{ expiresIn: number }>> {
    try {
      const res = await safeFetch('/api/profile/email/send-code', {
        method: 'POST',
        useAuth: true,
        body: JSON.stringify({ email }),
      })
      return await handleApiResponse(res)
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : '发送验证码失败' }
    }
  },

  async confirmBindEmail(params: { email: string; code: string }): Promise<ApiResponse<{ authType: ProfileAuthType; user?: CustomUser | null }>> {
    try {
      const res = await safeFetch('/api/profile/email/confirm', {
        method: 'POST',
        useAuth: true,
        body: JSON.stringify(params),
      })
      const data = await handleApiResponse(res)
      if (data?.success && data?.data?.authType === 'custom') {
        updateLocalCustomUser(data.data.user)
      }
      return data
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : '绑定邮箱失败' }
    }
  },

  async sendBindPhoneCode(params: { phone: string; countryCode?: string }): Promise<ApiResponse<{ expiresIn: number; message?: string }>> {
    try {
      const res = await safeFetch('/api/profile/phone/send-code', {
        method: 'POST',
        useAuth: true,
        body: JSON.stringify(params),
      })
      return await handleApiResponse(res)
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : '发送验证码失败' }
    }
  },

  async confirmBindPhone(params: { phone: string; code: string; countryCode?: string }): Promise<ApiResponse<{ authType: ProfileAuthType; user?: CustomUser | null }>> {
    try {
      const res = await safeFetch('/api/profile/phone/confirm', {
        method: 'POST',
        useAuth: true,
        body: JSON.stringify(params),
      })
      const data = await handleApiResponse(res)
      if (data?.success && data?.data?.authType === 'custom') {
        updateLocalCustomUser(data.data.user)
      }
      return data
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : '绑定手机号失败' }
    }
  },
}

