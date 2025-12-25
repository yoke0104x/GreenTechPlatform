import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequestUser } from '@/app/api/_utils/auth'
import { fetchCustomUserById, requireServiceSupabase } from '@/app/api/profile/_utils'

export async function POST(request: NextRequest) {
  const authUser = await authenticateRequestUser(request)
  if (!authUser) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
  }

  const supabaseOrResponse = requireServiceSupabase()
  if (supabaseOrResponse instanceof NextResponse) return supabaseOrResponse
  const supabase = supabaseOrResponse

  const body = await request.json().catch(() => null)
  const avatarUrlRaw = body?.avatarUrl
  if (typeof avatarUrlRaw !== 'string') {
    return NextResponse.json({ success: false, error: 'avatarUrl 必须是字符串' }, { status: 400 })
  }
  const avatarUrl = avatarUrlRaw.trim()

  try {
    if (authUser.authType === 'custom') {
      const { error: updateError } = await supabase
        .from('custom_users')
        .update({ avatar_url: avatarUrl ? avatarUrl : null })
        .eq('id', authUser.id)

      if (updateError) {
        return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
      }

      const customUser = await fetchCustomUserById(supabase, authUser.id)
      return NextResponse.json({
        success: true,
        data: { authType: 'custom', user: customUser },
      })
    }

    const { data: existing, error: getError } = await supabase.auth.admin.getUserById(authUser.id)
    if (getError || !existing?.user) {
      return NextResponse.json({ success: false, error: getError?.message || '获取用户失败' }, { status: 500 })
    }

    const existingMeta = (existing.user.user_metadata || {}) as Record<string, unknown>
    const nextMeta = { ...existingMeta, avatar_url: avatarUrl || null }

    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      user_metadata: nextMeta,
    })
    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: { authType: 'supabase' },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '操作失败' },
      { status: 500 }
    )
  }
}

