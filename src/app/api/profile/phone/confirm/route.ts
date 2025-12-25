import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequestUser } from '@/app/api/_utils/auth'
import { fetchCustomUserById, requireServiceSupabase } from '@/app/api/profile/_utils'
import { formatPhoneNumber } from '@/lib/custom-auth'

const MAX_ATTEMPTS = 5

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
  const codeRaw = body?.code
  const countryCode = (body?.countryCode as string | undefined) || '+86'
  if (typeof phoneRaw !== 'string' || !phoneRaw.trim()) {
    return NextResponse.json({ success: false, error: '手机号码不能为空' }, { status: 400 })
  }
  if (typeof codeRaw !== 'string' || !/^\d{6}$/.test(codeRaw.trim())) {
    return NextResponse.json({ success: false, error: '请输入6位验证码' }, { status: 400 })
  }

  let phoneData
  try {
    phoneData = formatPhoneNumber(phoneRaw, countryCode)
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '手机号码格式不正确' },
      { status: 400 }
    )
  }
  const code = codeRaw.trim()

  try {
    const now = new Date().toISOString()
    const { data: record, error: recordError } = await supabase
      .from('sms_verification_codes')
      .select('*')
      .eq('phone', phoneData.phone)
      .eq('country_code', countryCode)
      .eq('purpose', 'bind_phone')
      .eq('used', false)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recordError || !record) {
      return NextResponse.json({ success: false, error: '验证码不存在或已过期' }, { status: 400 })
    }

    if ((record.attempts ?? 0) >= MAX_ATTEMPTS) {
      await supabase.from('sms_verification_codes').update({ used: true }).eq('id', record.id)
      return NextResponse.json({ success: false, error: '验证码尝试次数过多，请重新获取' }, { status: 400 })
    }

    if (record.code !== code) {
      const nextAttempts = (record.attempts ?? 0) + 1
      await supabase.from('sms_verification_codes').update({ attempts: nextAttempts }).eq('id', record.id)
      const attemptsLeft = Math.max(0, MAX_ATTEMPTS - nextAttempts)
      return NextResponse.json({ success: false, error: '验证码错误', attemptsLeft }, { status: 400 })
    }

    await supabase.from('sms_verification_codes').update({ used: true }).eq('id', record.id)

    if (authUser.authType === 'custom') {
      // 冲突检查
      const { data: conflict } = await supabase
        .from('custom_users')
        .select('id')
        .eq('phone', phoneData.phone)
        .eq('country_code', countryCode)
        .neq('id', authUser.id)
        .maybeSingle()
      if (conflict) {
        return NextResponse.json({ success: false, error: '该手机号已被绑定' }, { status: 409 })
      }

      const { data: existing } = await supabase
        .from('custom_users')
        .select('user_metadata')
        .eq('id', authUser.id)
        .single()
      const merged = {
        ...(existing?.user_metadata || {}),
        phone_verified: true,
        phone_with_country_code: phoneData.phoneWithCountryCode,
      }

      const { error: updateError } = await supabase
        .from('custom_users')
        .update({ phone: phoneData.phone, country_code: countryCode, user_metadata: merged })
        .eq('id', authUser.id)

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
      }

      const customUser = await fetchCustomUserById(supabase, authUser.id)
      return NextResponse.json({ success: true, data: { authType: 'custom', user: customUser } })
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      phone: phoneData.phoneWithCountryCode,
      phone_confirm: true,
    })

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: { authType: 'supabase' } })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '操作失败' },
      { status: 500 }
    )
  }
}

