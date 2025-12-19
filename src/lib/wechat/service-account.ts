import { sanitizeHeaderValue } from '@/lib/header-utils'

interface TokenCache {
  token: string
  expiresAt: number
}

const globalAny = globalThis as any

function getAppCredentials() {
  const appId = sanitizeHeaderValue(process.env.WECHAT_APP_ID || '')
  const secret = sanitizeHeaderValue(process.env.WECHAT_APP_SECRET || '')
  if (!appId || !secret) {
    throw new Error('WECHAT_APP_ID 或 WECHAT_APP_SECRET 未配置')
  }
  return { appId, secret }
}

async function fetchAccessToken(): Promise<TokenCache> {
  const { appId, secret } = getAppCredentials()
  const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(secret)}`
  const res = await fetch(url)
  const data = await res.json() as { access_token?: string; expires_in?: number; errcode?: number; errmsg?: string }
  if (!res.ok || !data.access_token) {
    throw new Error(`获取微信服务号 access_token 失败: ${data.errcode || res.status} ${data.errmsg || ''}`)
  }
  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 7000
  return {
    token: data.access_token,
    expiresAt: Date.now() + (expiresIn - 300) * 1000, // 提前5分钟刷新
  }
}

async function getAccessToken(): Promise<string> {
  if (!globalAny.__wechatServiceToken) {
    globalAny.__wechatServiceToken = await fetchAccessToken()
    return globalAny.__wechatServiceToken.token
  }
  const cache = globalAny.__wechatServiceToken as TokenCache
  if (!cache.token || Date.now() >= cache.expiresAt) {
    globalAny.__wechatServiceToken = await fetchAccessToken()
    return globalAny.__wechatServiceToken.token
  }
  return cache.token
}

export interface SendServiceMessageOptions {
  openId: string
  content: string
}

export interface SendServiceSubscribeMessageOptions {
  openId: string
  title: string
  content: string
  platform?: string
  url?: string
  scene?: number
}

function getSubscribeConfig() {
  const templateId = sanitizeHeaderValue(process.env.WECHAT_SUBSCRIBE_TEMPLATE_ID || '')
  const titleKey = sanitizeHeaderValue(process.env.WECHAT_SUBSCRIBE_TITLE_KEY || '')
  const contentKey = sanitizeHeaderValue(process.env.WECHAT_SUBSCRIBE_CONTENT_KEY || '')
  const platformKey = sanitizeHeaderValue(process.env.WECHAT_SUBSCRIBE_PLATFORM_KEY || '')
  const timeKey = sanitizeHeaderValue(process.env.WECHAT_SUBSCRIBE_TIME_KEY || '')
  return { templateId, titleKey, contentKey, platformKey, timeKey }
}

export function isWeChatSubscribeConfigured() {
  const { templateId, titleKey, contentKey } = getSubscribeConfig()
  return Boolean(templateId && titleKey && contentKey)
}

export async function sendWeChatServiceSubscribeMessage(opts: SendServiceSubscribeMessageOptions) {
  if (!opts.openId) {
    throw new Error('缺少 openId，无法发送微信订阅通知')
  }

  const { templateId, titleKey, contentKey, platformKey, timeKey } = getSubscribeConfig()
  if (!templateId || !titleKey || !contentKey) {
    throw new Error('WECHAT_SUBSCRIBE_TEMPLATE_ID / WECHAT_SUBSCRIBE_TITLE_KEY / WECHAT_SUBSCRIBE_CONTENT_KEY 未完整配置')
  }

  const token = await getAccessToken()
  const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/bizsend?access_token=${encodeURIComponent(token)}`

  const data: Record<string, { value: string }> = {
    [titleKey]: { value: opts.title },
    [contentKey]: { value: opts.content },
  }

  if (platformKey && opts.platform) {
    data[platformKey] = { value: opts.platform }
  }
  if (timeKey) {
    data[timeKey] = { value: new Date().toLocaleString('zh-CN', { hour12: false }) }
  }

  const body: Record<string, unknown> = {
    touser: opts.openId,
    template_id: templateId,
    data,
  }
  if (opts.url) body.url = opts.url
  if (typeof opts.scene === 'number') body.scene = opts.scene

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const out = await res.json() as { errcode?: number; errmsg?: string }
  if (!res.ok || (out.errcode && out.errcode !== 0)) {
    const err = `发送微信订阅通知失败: ${out.errcode ?? res.status} ${out.errmsg ?? ''}`
    throw new Error(err.trim())
  }
  return true
}

export async function sendWeChatServiceTextMessage({ openId, content }: SendServiceMessageOptions) {
  if (!openId) {
    throw new Error('缺少 openId，无法发送微信消息')
  }
  const token = await getAccessToken()
  const url = `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${encodeURIComponent(token)}`
  const body = {
    touser: openId,
    msgtype: 'text',
    text: {
      content,
    },
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = await res.json() as { errcode?: number; errmsg?: string }
  if (!res.ok || (data.errcode && data.errcode !== 0)) {
    const err = `发送微信消息失败: ${data.errcode ?? res.status} ${data.errmsg ?? ''}`
    throw new Error(err.trim())
  }
  return true
}
