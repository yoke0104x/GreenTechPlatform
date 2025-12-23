import crypto from 'crypto'
import { sanitizeHeaderValue } from '@/lib/header-utils'

export interface WeChatGatewayConfig {
  baseUrl: string
  secret: string
}

export function getWeChatGatewayConfig(): WeChatGatewayConfig | null {
  const baseUrl = sanitizeHeaderValue(process.env.WECHAT_GATEWAY_URL || '')
  const secret = sanitizeHeaderValue(process.env.WECHAT_GATEWAY_SECRET || '')
  if (!baseUrl || !secret) return null
  return { baseUrl: baseUrl.replace(/\/+$/, ''), secret }
}

function signBodyHmac(secret: string, timestamp: string, body: string) {
  const h = crypto.createHmac('sha256', secret)
  h.update(`${timestamp}.${body}`)
  return h.digest('hex')
}

export interface GatewaySubscribeSendPayload {
  openId: string
  templateId: string
  data: Record<string, { value: string }>
  url?: string
  scene?: number
}

export async function sendSubscribeMessageViaGateway(payload: GatewaySubscribeSendPayload) {
  const cfg = getWeChatGatewayConfig()
  if (!cfg) {
    throw new Error('WECHAT_GATEWAY_URL / WECHAT_GATEWAY_SECRET 未配置')
  }

  const endpoint = `${cfg.baseUrl}/wechat/subscribe-send`
  const body = JSON.stringify(payload)
  const ts = String(Math.floor(Date.now() / 1000))
  const sig = signBodyHmac(cfg.secret, ts, body)

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wechat-gateway-ts': ts,
        'x-wechat-gateway-signature': sig,
      },
      body,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`无法连接微信网关: ${endpoint} (${msg})`)
  }

  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get('location') || ''
    throw new Error(`微信网关重定向(${res.status})到: ${loc || '(unknown)'}；请使用可用的 HTTPS 网关域名或修复自定义域名证书`)
  }

  const out = (await res.json().catch(() => null)) as { success?: boolean; error?: string } | null
  if (!res.ok || !out?.success) {
    throw new Error(out?.error || `微信网关发送失败: ${res.status}`)
  }
  return true
}

export interface GatewayJsSdkConfigPayload {
  url: string
}

export interface GatewayJsSdkConfigResponseData {
  appId: string
  timestamp: number
  nonceStr: string
  signature: string
}

export async function getJsSdkConfigViaGateway(payload: GatewayJsSdkConfigPayload) {
  const cfg = getWeChatGatewayConfig()
  if (!cfg) {
    throw new Error('WECHAT_GATEWAY_URL / WECHAT_GATEWAY_SECRET 未配置')
  }

  const endpoint = `${cfg.baseUrl}/wechat/js-sdk-config`
  const body = JSON.stringify(payload)
  const ts = String(Math.floor(Date.now() / 1000))
  const sig = signBodyHmac(cfg.secret, ts, body)

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-wechat-gateway-ts': ts,
        'x-wechat-gateway-signature': sig,
      },
      body,
      cache: 'no-store',
      redirect: 'manual',
      signal: AbortSignal.timeout(10_000),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(`无法连接微信网关: ${endpoint} (${msg})`)
  }

  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get('location') || ''
    throw new Error(`微信网关重定向(${res.status})到: ${loc || '(unknown)'}；请使用可用的 HTTPS 网关域名或修复自定义域名证书`)
  }

  const out = (await res.json().catch(() => null)) as
    | { success?: boolean; error?: string; data?: GatewayJsSdkConfigResponseData }
    | null

  if (!res.ok || !out?.success || !out.data) {
    throw new Error(out?.error || `微信网关签名失败: ${res.status}`)
  }

  return out.data
}
