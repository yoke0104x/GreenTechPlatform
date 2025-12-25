import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequestUser } from '@/app/api/_utils/auth'
import { requireServiceSupabase } from '@/app/api/profile/_utils'
import { sendBindEmailCode } from '@/lib/resend'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  const authUser = await authenticateRequestUser(request)
  if (!authUser) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
  }

  const supabaseOrResponse = requireServiceSupabase()
  if (supabaseOrResponse instanceof NextResponse) return supabaseOrResponse
  const supabase = supabaseOrResponse

  const body = await request.json().catch(() => null)
  const emailRaw = body?.email
  if (typeof emailRaw !== 'string' || !EMAIL_REGEX.test(emailRaw)) {
    return NextResponse.json({ success: false, error: '请输入有效的邮箱地址' }, { status: 400 })
  }
  const email = emailRaw.trim().toLowerCase()

  try {
    // 60秒冷却
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('email_verification_codes')
      .select('id, created_at')
      .eq('email', email)
      .eq('purpose', 'bind_email')
      .gte('created_at', oneMinuteAgo)
      .order('created_at', { ascending: false })
      .limit(1)

    if (recent && recent.length > 0) {
      return NextResponse.json({ success: false, error: '发送过于频繁，请稍后再试' }, { status: 429 })
    }

    const sendResult = await sendBindEmailCode(email)
    if (!sendResult.success || !sendResult.code) {
      return NextResponse.json({ success: false, error: sendResult.error || '发送验证码失败' }, { status: 500 })
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    const { error: insertError } = await supabase.from('email_verification_codes').insert({
      email,
      purpose: 'bind_email',
      code: sendResult.code,
      expires_at: expiresAt,
      attempts: 0,
      used: false,
    })

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { expiresIn: 300 },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '发送失败' },
      { status: 500 }
    )
  }
}

