import { NextRequest, NextResponse } from 'next/server'
import { sanitizeHeaderValue } from '@/lib/header-utils'

export const dynamic = 'force-dynamic'

function getRequestOrigin(request: NextRequest) {
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  if (host) return `${proto}://${host}`
  return new URL(request.url).origin
}

function normalizeRedirectUrl(request: NextRequest, rawRedirect: string | null) {
  const origin = getRequestOrigin(request)
  if (!rawRedirect) return `${origin}/zh/m/chat`

  if (rawRedirect.startsWith('/')) return `${origin}${rawRedirect}`

  const url = new URL(rawRedirect)
  const originHost = new URL(origin).host
  if (url.host !== originHost) {
    throw new Error('redirect 必须为本站域名')
  }
  return url.toString()
}

export async function GET(request: NextRequest) {
  try {
    const appId = sanitizeHeaderValue(process.env.WECHAT_APP_ID || '')
    const templateId = sanitizeHeaderValue(process.env.WECHAT_SUBSCRIBE_TEMPLATE_ID || '')

    if (!appId) {
      return NextResponse.json({ success: false, error: 'WECHAT_APP_ID 未配置' }, { status: 500 })
    }
    if (!templateId) {
      return NextResponse.json({ success: false, error: 'WECHAT_SUBSCRIBE_TEMPLATE_ID 未配置' }, { status: 500 })
    }

    const rawRedirect = request.nextUrl.searchParams.get('redirect')
    const redirectUrl = normalizeRedirectUrl(request, rawRedirect)

    const sceneParam = request.nextUrl.searchParams.get('scene')
    const scene = sceneParam && /^\d+$/.test(sceneParam) ? Number(sceneParam) : 1000

    // 公众号订阅通知确认页：用户在该页面完成订阅后，会跳回 redirect_url
    const subscribeConfirmUrl =
      `https://mp.weixin.qq.com/mp/subscribemsg?action=get_confirm` +
      `&appid=${encodeURIComponent(appId)}` +
      `&scene=${encodeURIComponent(String(scene))}` +
      `&template_id=${encodeURIComponent(templateId)}` +
      `&redirect_url=${encodeURIComponent(redirectUrl)}` +
      `#wechat_redirect`

    return NextResponse.json(
      { success: true, data: { url: subscribeConfirmUrl, appId, templateId } },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : '生成订阅通知链接失败' },
      { status: 500 },
    )
  }
}
