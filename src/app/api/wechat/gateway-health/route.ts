import { NextRequest, NextResponse } from 'next/server'
import { getWeChatGatewayConfig } from '@/lib/wechat/gateway-client'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  const cfg = getWeChatGatewayConfig()
  if (!cfg) {
    return NextResponse.json({ success: false, error: 'WECHAT_GATEWAY_URL / WECHAT_GATEWAY_SECRET 未配置' }, { status: 400 })
  }

  const url = `${cfg.baseUrl}/healthz`
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000) })
    const text = await res.text()
    return NextResponse.json(
      { success: res.ok, status: res.status, url, body: text.slice(0, 500) },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (e) {
    return NextResponse.json(
      { success: false, url, error: e instanceof Error ? e.message : String(e) },
      { status: 502, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}

