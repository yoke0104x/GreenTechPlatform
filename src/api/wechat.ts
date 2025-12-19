import { safeFetch, handleApiResponse } from '@/lib/safe-fetch'
import type { CustomAuthResult } from '@/lib/custom-auth'

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface OAuthUrlResponse {
  url: string
  state: string
}

export interface SubscribeUrlResponse {
  url: string
}

export interface WeChatLoginResponse extends CustomAuthResult {
  isNewUser: boolean
}

export const wechatAuthApi = {
  // 获取微信OAuth URL（服务端生成state并写入cookie）
  async getOAuthUrl(redirectUri: string): Promise<ApiResponse<OAuthUrlResponse>> {
    try {
      const url = `/api/wechat/oauth-url?redirect=${encodeURIComponent(redirectUri)}`
      const res = await safeFetch(url, { method: 'GET' })
      const data = await handleApiResponse(res)
      return data
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : '获取微信登录链接失败' }
    }
  },

  // 获取公众号订阅通知确认页 URL（用户在确认页同意后跳回 redirect）
  async getSubscribeUrl(redirectUri: string): Promise<ApiResponse<SubscribeUrlResponse>> {
    try {
      const url = `/api/wechat/subscribe-url?redirect=${encodeURIComponent(redirectUri)}`
      const res = await safeFetch(url, { method: 'GET' })
      const data = await handleApiResponse(res)
      return data
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : '获取订阅通知链接失败' }
    }
  },

  // 使用code换取openid/用户信息，并完成应用内登录
  async loginByCode(params: { code: string; state?: string }): Promise<ApiResponse<WeChatLoginResponse>> {
    try {
      const res = await safeFetch('/api/wechat/callback', {
        method: 'POST',
        body: JSON.stringify(params)
      })
      const data = await handleApiResponse(res)

      if (data.success && data.data) {
        try {
          localStorage.setItem('custom_auth_token', data.data.token)
          if (data.data.refreshToken) localStorage.setItem('custom_refresh_token', data.data.refreshToken)
          localStorage.setItem('custom_user', JSON.stringify(data.data.user))
        } catch {}
      }

      return data
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : '微信登录失败' }
    }
  },

  // 登出（清理自定义认证信息）
  logout(): void {
    try {
      localStorage.removeItem('custom_auth_token')
      localStorage.removeItem('custom_refresh_token')
      localStorage.removeItem('custom_user')
    } catch {}
  }
}
