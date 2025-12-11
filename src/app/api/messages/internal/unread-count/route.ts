import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequestUser, serviceSupabase } from '@/app/api/_utils/auth'

export async function GET(request: NextRequest) {
  const user = await authenticateRequestUser(request)
  if (!user) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
  }

  if (!serviceSupabase) {
    return NextResponse.json({ success: false, error: '服务不可用' }, { status: 500 })
  }

  const toColumn = user.authType === 'custom' ? 'custom_to_user_id' : 'to_user_id'
  const categoriesParam = request.nextUrl.searchParams.get('categories')
  const excludeParam = request.nextUrl.searchParams.get('exclude')
  const includeNull = request.nextUrl.searchParams.get('includeNull') === 'true'
  const allowedCategories = categoriesParam
    ? categoriesParam.split(',').map((c) => decodeURIComponent(c)).filter(Boolean)
    : null
  const excludeCategories = excludeParam
    ? excludeParam.split(',').map((c) => decodeURIComponent(c)).filter(Boolean)
    : null

  let query = serviceSupabase
    .from('internal_messages')
    .select('id', { count: 'exact', head: true })
    .eq(toColumn, user.id)
    .eq('is_read', false)

  if (allowedCategories && allowedCategories.length > 0) {
    query = query.in('category', allowedCategories)
    if (includeNull) {
      query = query.or('category.is.null,category.eq.,category.eq.undefined')
    }
  }
  if (excludeCategories && excludeCategories.length > 0) {
    query = query.not('category', 'in', `(${excludeCategories.map((c) => `"${c}"`).join(',')})`)
  }

  const { count, error } = await query

  if (error) {
    console.error('Fetch unread count failed:', error)
    return NextResponse.json({ success: false, error: '获取未读数量失败' }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: count ?? 0 })
}
