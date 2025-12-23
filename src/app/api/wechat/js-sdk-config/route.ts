import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { sanitizeHeaderValue } from '@/lib/header-utils'
import { getJsSdkConfigViaGateway, getWeChatGatewayConfig } from '@/lib/wechat/gateway-client'

export const dynamic = 'force-dynamic'

type TokenCache = { value: string; expiresAt: number }

const globalAny = globalThis as any

function getAppCredentials() {
  const appId = sanitizeHeaderValue(process.env.WECHAT_APP_ID || '')
  const secret = sanitizeHeaderValue(process.env.WECHAT_APP_SECRET || '')
  if (!appId || !secret) throw new Error('WECHAT_APP_ID 或 WECHAT_APP_SECRET 未配置')
  return { appId, secret }
}

async function fetchAccessToken(): Promise<TokenCache> {
  const { appId, secret } = getAppCredentials()
  const url =
    `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential` +
    `&appid=${encodeURIComponent(appId)}&secret=${encodeURIComponent(secret)}`
  const res = await fetch(url)
  const data = (await res.json()) as { access_token?: string; expires_in?: number; errcode?: number; errmsg?: string }
  if (!res.ok || !data.access_token) {
    throw new Error(`获取微信 access_token 失败: ${data.errcode ?? res.status} ${data.errmsg ?? ''}`.trim())
  }
  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 7000
  return { value: data.access_token, expiresAt: Date.now() + (expiresIn - 300) * 1000 }
}

async function getAccessToken(): Promise<string> {
  if (!globalAny.__wechatAccessTokenCache) {
    globalAny.__wechatAccessTokenCache = await fetchAccessToken()
    return globalAny.__wechatAccessTokenCache.value
  }
  const cache = globalAny.__wechatAccessTokenCache as TokenCache
  if (!cache.value || Date.now() >= cache.expiresAt) {
    globalAny.__wechatAccessTokenCache = await fetchAccessToken()
    return globalAny.__wechatAccessTokenCache.value
  }
  return cache.value
}

async function fetchJsApiTicket(): Promise<TokenCache> {
  const token = await getAccessToken()
  const url = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${encodeURIComponent(token)}&type=jsapi`
  const res = await fetch(url)
  const data = (await res.json()) as { ticket?: string; expires_in?: number; errcode?: number; errmsg?: string }
  if (!res.ok || data.errcode || !data.ticket) {
    throw new Error(`获取微信 jsapi_ticket 失败: ${data.errcode ?? res.status} ${data.errmsg ?? ''}`.trim())
  }
  const expiresIn = typeof data.expires_in === 'number' ? data.expires_in : 7000
  return { value: data.ticket, expiresAt: Date.now() + (expiresIn - 300) * 1000 }
}

async function getJsApiTicket(): Promise<string> {
  if (!globalAny.__wechatJsApiTicketCache) {
    globalAny.__wechatJsApiTicketCache = await fetchJsApiTicket()
    return globalAny.__wechatJsApiTicketCache.value
  }
  const cache = globalAny.__wechatJsApiTicketCache as TokenCache
  if (!cache.value || Date.now() >= cache.expiresAt) {
    globalAny.__wechatJsApiTicketCache = await fetchJsApiTicket()
    return globalAny.__wechatJsApiTicketCache.value
  }
  return cache.value
}

function nonceStr(len = 16) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let out = ''
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

function sha1(input: string) {
  return crypto.createHash('sha1').update(input).digest('hex')
}

export async function GET(request: NextRequest) {
  try {
    const rawUrl = request.nextUrl.searchParams.get('url')
    if (!rawUrl) return NextResponse.json({ success: false, error: '缺少 url 参数' }, { status: 400 })

    // JS-SDK签名 URL 必须是去掉 hash 的完整 URL
    const url = rawUrl.split('#')[0]

    // 优先通过微信云托管/固定IP网关生成签名，避免 Vercel 出口 IP 白名单问题
    if (getWeChatGatewayConfig()) {
      const data = await getJsSdkConfigViaGateway({ url })
      return NextResponse.json({ success: true, data }, { headers: { 'Cache-Control': 'no-store' } })
    }

    const { appId } = getAppCredentials()
    const ticket = await getJsApiTicket()
    const noncestr = nonceStr()
    const timestamp = Math.floor(Date.now() / 1000)

    const plain =
      `jsapi_ticket=${ticket}` +
      `&noncestr=${noncestr}` +
      `&timestamp=${timestamp}` +
      `&url=${url}`
    const signature = sha1(plain)

    return NextResponse.json(
      { success: true, data: { appId, timestamp, nonceStr: noncestr, signature } },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : '生成JS-SDK签名失败' },
      { status: 500 },
    )
  }
}
