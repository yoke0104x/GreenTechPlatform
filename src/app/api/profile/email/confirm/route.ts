import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequestUser } from '@/app/api/_utils/auth'
import { fetchCustomUserById, requireServiceSupabase } from '@/app/api/profile/_utils'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_ATTEMPTS = 3

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
  const codeRaw = body?.code
  if (typeof emailRaw !== 'string' || !EMAIL_REGEX.test(emailRaw)) {
    return NextResponse.json({ success: false, error: '请输入有效的邮箱地址' }, { status: 400 })
  }
  if (typeof codeRaw !== 'string' || !/^\d{6}$/.test(codeRaw)) {
    return NextResponse.json({ success: false, error: '请输入6位验证码' }, { status: 400 })
  }
  const email = emailRaw.trim().toLowerCase()
  const code = codeRaw.trim()

  try {
    const now = new Date().toISOString()
    const { data: record, error: recordError } = await supabase
      .from('email_verification_codes')
      .select('*')
      .eq('email', email)
      .eq('purpose', 'bind_email')
      .eq('used', false)
      .gt('expires_at', now)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recordError || !record) {
      return NextResponse.json({ success: false, error: '验证码不存在或已过期' }, { status: 400 })
    }

    if ((record.attempts ?? 0) >= MAX_ATTEMPTS) {
      await supabase.from('email_verification_codes').update({ used: true }).eq('id', record.id)
      return NextResponse.json({ success: false, error: '验证码错误次数过多，请重新获取' }, { status: 400 })
    }

    if (record.code !== code) {
      const nextAttempts = (record.attempts ?? 0) + 1
      await supabase.from('email_verification_codes').update({ attempts: nextAttempts }).eq('id', record.id)
      const attemptsLeft = Math.max(0, MAX_ATTEMPTS - nextAttempts)
      return NextResponse.json({ success: false, error: '验证码错误', attemptsLeft }, { status: 400 })
    }

    await supabase.from('email_verification_codes').update({ used: true }).eq('id', record.id)

    if (authUser.authType === 'custom') {
      // 冲突检查
      const { data: conflict } = await supabase
        .from('custom_users')
        .select('id')
        .eq('email', email)
        .neq('id', authUser.id)
        .maybeSingle()
      if (conflict) {
        return NextResponse.json({ success: false, error: '该邮箱已被绑定' }, { status: 409 })
      }

      const { data: existing } = await supabase
        .from('custom_users')
        .select('user_metadata')
        .eq('id', authUser.id)
        .single()

      const merged = { ...(existing?.user_metadata || {}), email_verified: true }
      const { error: updateError } = await supabase
        .from('custom_users')
        .update({ email, user_metadata: merged })
        .eq('id', authUser.id)

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
      }

      const customUser = await fetchCustomUserById(supabase, authUser.id)
      return NextResponse.json({ success: true, data: { authType: 'custom', user: customUser } })
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      email,
      email_confirm: true,
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

