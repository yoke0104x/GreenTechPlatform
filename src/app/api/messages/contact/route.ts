import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateRequestUser, serviceSupabase } from '@/app/api/_utils/auth'

const db = serviceSupabase ?? (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null)

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ success: false, error: '服务未配置' }, { status: 500 })
  }

  const user = await authenticateRequestUser(request)
  if (!user) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
  }

  const userColumn = user.authType === 'custom' ? 'custom_user_id' : 'user_id'

  const { data, error } = await db
    .from('contact_messages')
    .select('*')
    .eq(userColumn, user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('获取联系消息失败:', error)
    return NextResponse.json({ success: false, error: '获取联系消息失败' }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data ?? [] })
}

export async function POST(request: NextRequest) {
  if (!db) {
    return NextResponse.json({ success: false, error: '服务未配置' }, { status: 500 })
  }

  const user = await authenticateRequestUser(request)
  if (!user) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ success: false, error: '请求体无效' }, { status: 400 })
  }

  const contactName = (body.contact_name ?? body.contactName ?? '').trim()
  const contactPhone = (body.contact_phone ?? body.contactPhone ?? '').trim()
  const contactEmail = (body.contact_email ?? body.contactEmail ?? '').trim()
  const message = (body.message || '').trim()
  const source = (body.source || body.context || '').trim()
  const categoryInput = (body.category || body.type || '').trim()
  const resolvedCategory =
    categoryInput && ['技术对接', '用户反馈', '园区对接', '政策咨询'].includes(categoryInput)
      ? categoryInput
      : source === 'park'
        ? '园区对接'
        : source === 'policy'
          ? '政策咨询'
        : '技术对接'
  const technologyId = body.technology_id || body.technologyId || null
  const technologyName = body.technology_name || body.technologyName || ''
  const companyName = body.company_name || body.companyName || ''

  if (!message) {
    return NextResponse.json({ success: false, error: '请填写反馈内容' }, { status: 400 })
  }

  const isCustom = user.authType === 'custom'
  const resolvedContactName = contactName || '未提供'
  const resolvedContactPhone = contactPhone || user.phone || '未提供'
  const resolvedContactEmail = contactEmail || user.email || '未提供'

  const insertData: any = {
    technology_id: technologyId,
    technology_name: technologyName,
    company_name: companyName,
    contact_name: resolvedContactName,
    contact_phone: resolvedContactPhone,
    contact_email: resolvedContactEmail,
    message,
    category: resolvedCategory,
    status: 'pending' as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (isCustom) {
    insertData.custom_user_id = user.id
  } else {
    insertData.user_id = user.id
  }

  const { data, error } = await db
    .from('contact_messages')
    .insert(insertData)
    .select()
    .single()

  if (error || !data) {
    console.error('创建联系消息失败:', error)
    return NextResponse.json({ success: false, error: '创建联系消息失败' }, { status: 500 })
  }

  try {
    await notifyAdmins(db, data)
  } catch (notifyError) {
    console.error('通知管理员失败（已忽略）:', notifyError)
  }

  return NextResponse.json({ success: true, data })
}

async function notifyAdmins(client: any, contactMessage: any) {
  const { data: admins, error } = await client
    .from('auth.users')
    .select('id')
    .eq('role', 'admin')

  if (error) {
    console.warn('查询管理员失败:', error)
    return
  }

  if (!admins || admins.length === 0) return

  const category: string = contactMessage.category || '技术对接'
  const isFeedback = category === '用户反馈'
  const isPark = category === '园区对接'
  const isPolicy = category === '政策咨询'

  const titlePrefix = isFeedback
    ? '新的用户反馈'
    : isPark
    ? '新的园区对接需求'
    : '新的联系咨询'
  const titleSuffix = isFeedback
    ? '问题反馈'
    : contactMessage.technology_name || (isPark ? '园区对接' : '技术咨询')
  const now = new Date().toISOString()

  const fromUserId = contactMessage.user_id || null
  const customFromUserId = contactMessage.custom_user_id || null

  const notifications = admins.map((admin: any) => ({
    from_user_id: fromUserId,
    custom_from_user_id: customFromUserId,
    to_user_id: admin.id,
    contact_message_id: contactMessage.id,
    title: `${titlePrefix}：${titleSuffix}`,
    content: `您收到了一条新的${
      isFeedback ? '用户反馈' : isPark ? '园区对接消息' : isPolicy ? '政策咨询消息' : '联系消息'
    }：\n\n联系人：${contactMessage.contact_name}\n联系电话：${contactMessage.contact_phone}\n联系邮箱：${contactMessage.contact_email}\n${
      isFeedback
        ? ''
        : `咨询对象：${
            contactMessage.technology_name ||
            (isPark ? '园区' : isPolicy ? '政策' : '技术')
          }\n所属公司：${contactMessage.company_name || '无'}`
    }\n\n${isFeedback ? '反馈' : '留言'}内容：\n${contactMessage.message}\n\n请前往管理后台查看并处理此消息。`,
    category,
    is_read: false,
    created_at: now,
    updated_at: now,
  }))

  const { error: notifyError } = await client
    .from('internal_messages')
    .insert(notifications)

  if (notifyError) {
    throw notifyError
  }
}
