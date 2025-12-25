import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequestUser } from '@/app/api/_utils/auth'
import { requireServiceSupabase } from '@/app/api/profile/_utils'
import { formatPhoneNumber } from '@/lib/custom-auth'
import { createTencentSMSService, generateVerificationCode, TencentSMSService } from '@/lib/tencent-sms'

export async function POST(request: NextRequest) {
  const authUser = await authenticateRequestUser(request)
  if (!authUser) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
  }

  const supabaseOrResponse = requireServiceSupabase()
  if (supabaseOrResponse instanceof NextResponse) return supabaseOrResponse
  const supabase = supabaseOrResponse

  const body = await request.json().catch(() => null)
  const phoneRaw = body?.phone
  const countryCode = (body?.countryCode as string | undefined) || '+86'
  if (typeof phoneRaw !== 'string' || !phoneRaw.trim()) {
    return NextResponse.json({ success: false, error: '手机号码不能为空' }, { status: 400 })
  }

  let phoneData
  try {
    phoneData = formatPhoneNumber(phoneRaw, countryCode)
    if (!TencentSMSService.validatePhoneNumber(phoneData.phone, countryCode)) {
      return NextResponse.json({ success: false, error: '手机号码格式不正确' }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '手机号码格式不正确' },
      { status: 400 }
    )
  }

  try {
    // 60秒冷却（bind_phone）
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const { data: recent } = await supabase
      .from('sms_verification_codes')
      .select('id, created_at')
      .eq('phone', phoneData.phone)
      .eq('country_code', countryCode)
      .eq('purpose', 'bind_phone')
      .gte('created_at', oneMinuteAgo)
      .order('created_at', { ascending: false })
      .limit(1)

    if (recent && recent.length > 0) {
      return NextResponse.json({ success: false, error: '发送过于频繁，请稍后再试' }, { status: 429 })
    }

    const code = generateVerificationCode()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    const { data: inserted, error: insertError } = await supabase.from('sms_verification_codes').insert({
      phone: phoneData.phone,
      country_code: countryCode,
      code,
      purpose: 'bind_phone',
      expires_at: expiresAt,
      attempts: 0,
      used: false,
    }).select('id').single()
    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
    }

    const smsService = createTencentSMSService()
    if (!smsService) {
      // 开发环境允许返回 debugCode（验证码已写入DB）
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          data: {
            message: `开发环境：验证码已生成，请查看控制台日志。验证码：${code}`,
            expiresIn: 300,
            debugCode: code,
          },
        })
      }
      if (inserted?.id) {
        await supabase.from('sms_verification_codes').delete().eq('id', inserted.id)
      }
      return NextResponse.json({ success: false, error: '短信服务暂时不可用，请稍后重试' }, { status: 503 })
    }

    const sendResult = await smsService.sendVerificationCode(phoneData.phone, code, countryCode)
    if (!sendResult.success) {
      if (inserted?.id) {
        await supabase.from('sms_verification_codes').delete().eq('id', inserted.id)
      }
      return NextResponse.json({ success: false, error: sendResult.message || '发送验证码失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        message: sendResult.message || '验证码已发送',
        expiresIn: 300,
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '发送失败' },
      { status: 500 }
    )
  }
}
