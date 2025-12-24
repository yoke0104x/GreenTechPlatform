import { Buffer } from 'buffer'
import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequestUser, serviceSupabase } from '@/app/api/_utils/auth'
import {
  isWeChatSubscribeConfigured,
  sendWeChatServiceSubscribeMessage,
} from '@/lib/wechat/service-account'

interface AdminOverrideUser {
  id: string
  email?: string | null
  phone?: string | null
  role?: string | null
}

export const dynamic = 'force-dynamic'

function getRequestOrigin(request: NextRequest) {
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  if (host) return `${proto}://${host}`
  return new URL(request.url).origin
}

function inferMessageContext(category?: string | null) {
  const c = (category || '').trim()
  const isPark = ['园区对接', 'Park Connection'].includes(c)
  const isPolicy = ['政策咨询', 'Policy Consultation'].includes(c)
  if (isPark) return { from: 'parks' as const, platform: '园区平台', remark: '绿色园区平台' }
  if (isPolicy) return { from: 'policy' as const, platform: '政策平台', remark: '绿色政策平台' }
  return { from: null, platform: '技术平台', remark: '绿色技术平台' }
}

function normalizeOrigin(raw: string) {
  const v = (raw || '').trim()
  if (!v) return ''
  if (v.startsWith('http://') || v.startsWith('https://')) return v.replace(/\/+$/, '')
  return `https://${v.replace(/\/+$/, '')}`
}

function getPlatformOrigin(request: NextRequest, from: 'parks' | 'policy' | null) {
  const envOrigin =
    from === 'parks'
      ? process.env.PARK_H5_ORIGIN
      : from === 'policy'
        ? process.env.POLICY_H5_ORIGIN
        : process.env.TECH_H5_ORIGIN
  const normalized = normalizeOrigin(envOrigin || '')
  return normalized || getRequestOrigin(request)
}

function buildH5ChatDetailUrl(
  origin: string,
  from: 'parks' | 'policy' | null,
  messageId: string | null,
  locale: 'zh' | 'en' = 'zh',
) {
  const base = `${origin}/${locale}/m/chat`
  if (!messageId) return from ? `${base}?from=${from}` : base
  const detail = `${base}/${encodeURIComponent(messageId)}`
  return from ? `${detail}?from=${from}` : detail
}

function parseAdminOverride(header: string | null): AdminOverrideUser | null {
  if (!header) return null
  try {
    // 优先尝试直接将 header 当作 JSON 解析（新格式）
    if (header.trim().startsWith('{')) {
      return JSON.parse(header) as AdminOverrideUser
    }
  } catch (jsonError) {
    console.warn('Admin override直接JSON解析失败:', jsonError)
  }

  try {
    // 兼容旧格式：base64 编码
    const decoded = Buffer.from(header, 'base64').toString('utf8')
    return JSON.parse(decoded) as AdminOverrideUser
  } catch (e) {
    console.warn('Admin override解析失败(兼容模式):', e)
    return null
  }
}

export async function GET(request: NextRequest) {
  const user = await authenticateRequestUser(request)
  const adminHeader = request.headers.get('x-admin-user')
  const parsedOverride: AdminOverrideUser | null = !user ? parseAdminOverride(adminHeader) : null

  if (!user && !parsedOverride?.id) {
    return NextResponse.json({ success: false, error: '未登录' }, { status: 401 })
  }

  if (!serviceSupabase) {
    return NextResponse.json({ success: false, error: '服务不可用' }, { status: 500 })
  }

  const toColumn = user?.authType === 'custom' ? 'custom_to_user_id' : 'to_user_id'
  const targetId = user?.id || parsedOverride?.id

  if (!targetId) {
    return NextResponse.json({ success: false, error: '无法确定用户身份' }, { status: 400 })
  }

  const messageId = request.nextUrl.searchParams.get('id')
  const categoriesParam = request.nextUrl.searchParams.get('categories')
  const excludeParam = request.nextUrl.searchParams.get('exclude')
  const includeNull = request.nextUrl.searchParams.get('includeNull') === 'true'
  const allowedCategories = categoriesParam
    ? categoriesParam.split(',').map((c) => decodeURIComponent(c)).filter(Boolean)
    : null
  const excludeCategories = excludeParam
    ? excludeParam.split(',').map((c) => decodeURIComponent(c)).filter(Boolean)
    : null

  if (messageId) {
    let detailQuery = serviceSupabase
      .from('internal_messages')
      .select('*')
      .eq('id', messageId)
      .eq(toColumn, targetId)

    if (allowedCategories && allowedCategories.length > 0) {
      detailQuery = detailQuery.in('category', allowedCategories)
      if (includeNull) {
        detailQuery = detailQuery.or('category.is.null,category.eq.,category.eq.undefined')
      }
    }
    if (excludeCategories && excludeCategories.length > 0) {
      detailQuery = detailQuery.not('category', 'in', `(${excludeCategories.map((c) => `"${c}"`).join(',')})`)
    }

    const { data, error } = await detailQuery.maybeSingle()

    if (error) {
      console.error('获取站内信详情失败:', error)
      return NextResponse.json({ success: false, error: '获取站内信详情失败' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ success: false, error: '消息不存在' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data })
  }

  let query = serviceSupabase
    .from('internal_messages')
    .select('*')
    .eq(toColumn, targetId)

  if (allowedCategories && allowedCategories.length > 0) {
    query = query.in('category', allowedCategories)
    if (includeNull) {
      query = query.or('category.is.null,category.eq.,category.eq.undefined')
    }
  }
  if (excludeCategories && excludeCategories.length > 0) {
    query = query.not('category', 'in', `(${excludeCategories.map((c) => `"${c}"`).join(',')})`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Internal messages fetch failed:', error)
    return NextResponse.json({ success: false, error: '获取消息失败' }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: data ?? [] })
}

export async function POST(request: NextRequest) {
  let user = await authenticateRequestUser(request)
  let adminOverride = false
  let inquiryContent: string | null = null
  let wechatError: string | null = null

  const adminHeader = request.headers.get('x-admin-user')
  const parsedOverride: AdminOverrideUser | null = !user ? parseAdminOverride(adminHeader) : null

  // 优先尝试使用 Supabase 用户 + 角色校验（真实管理员）
  if (!user && parsedOverride?.id && serviceSupabase) {
    try {
      const { data: adminRecord, error: adminError } = await serviceSupabase
        .from('auth.users')
        .select('id, email, phone, role, raw_app_meta_data')
        .eq('id', parsedOverride.id)
        .single()

      if (!adminError && adminRecord) {
        const meta = adminRecord.raw_app_meta_data as { role?: string } | null | undefined
        const role = parsedOverride.role || adminRecord.role || meta?.role
        if (role === 'admin') {
          user = {
            id: adminRecord.id,
            email: adminRecord.email,
            phone: adminRecord.phone,
            authType: 'supabase'
          }
          adminOverride = true
        } else {
          console.warn('Admin override拒绝：角色不匹配', { parsedRole: parsedOverride.role, recordRole: adminRecord.role, metaRole: meta?.role })
        }
      } else if (adminError) {
        console.warn('Admin override查询失败:', adminError)
      }
    } catch (queryError) {
      console.warn('Admin override校验异常:', queryError)
    }
  }

  // 兜底：只要提供了 override 信息，就允许作为“系统管理员”发送站内信（保持与旧版行为一致）
  if (!user && (parsedOverride?.id || adminHeader)) {
    const fallback = parsedOverride ?? {
      id: 'admin-override',
      email: null,
      phone: null,
      role: 'admin',
    }
    user = {
      id: fallback.id,
      email: fallback.email ?? null,
      phone: fallback.phone ?? null,
      authType: 'supabase'
    }
    adminOverride = true
  }

  if (!serviceSupabase) {
    return NextResponse.json({ success: false, error: '服务不可用' }, { status: 500 })
  }

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ success: false, error: '请求体无效' }, { status: 400 })
  }

  const title = (body.title || '').trim()
  const content = (body.content || '').trim()
  const category = (body.category || '').trim() || undefined
  const toUserId = typeof body.to_user_id === 'string' && body.to_user_id ? body.to_user_id : null
  const customToUserId = typeof body.custom_to_user_id === 'string' && body.custom_to_user_id ? body.custom_to_user_id : null
  const contactMessageId = typeof body.contact_message_id === 'string' && body.contact_message_id ? body.contact_message_id : null

  if (!title || !content) {
    return NextResponse.json({ success: false, error: '标题和内容为必填项' }, { status: 400 })
  }

  // 解析接收方：优先使用 contact_message_id 推断，便于兼容自定义用户
  let resolvedToUserId: string | null = toUserId
  let resolvedCustomToUserId: string | null = customToUserId

  if (contactMessageId) {
    const { data: cm, error: cmError } = await serviceSupabase
      .from('contact_messages')
      .select('user_id, custom_user_id, message')
      .eq('id', contactMessageId)
      .single()
    if (cmError) {
      console.error('查询联系消息失败:', cmError)
      return NextResponse.json({ success: false, error: '无法解析接收用户' }, { status: 400 })
    }
    inquiryContent = typeof cm?.message === 'string' ? cm.message : null
    if (!resolvedToUserId && !resolvedCustomToUserId) {
      resolvedToUserId = cm?.user_id || null
      resolvedCustomToUserId = cm?.custom_user_id || null
    }
  }

  if (!resolvedToUserId && !resolvedCustomToUserId) {
    return NextResponse.json({ success: false, error: '缺少接收用户信息' }, { status: 400 })
  }

  const now = new Date().toISOString()

  const insertData: any = {
    title,
    content,
    category,
    is_read: false,
    created_at: now,
    updated_at: now,
    contact_message_id: contactMessageId,
  }

  if (!adminOverride && user) {
    if (user.authType === 'custom') {
      insertData.custom_from_user_id = user.id
    } else {
      insertData.from_user_id = user.id
    }
  } // adminOverride 时作为系统消息，不设置from_user_id字段

  if (resolvedCustomToUserId) {
    insertData.custom_to_user_id = resolvedCustomToUserId
  } else {
    insertData.to_user_id = resolvedToUserId
  }

  const { data, error } = await serviceSupabase
    .from('internal_messages')
    .insert(insertData)
    .select('*')

  if (error) {
    console.error('发送站内信失败:', error)
    return NextResponse.json({ success: false, error: '发送站内信失败' }, { status: 500 })
  }

  const inserted = Array.isArray(data) ? data[0] : data

  // 推送到微信（仅自定义用户且存在 openid）
  let wechatSent = false
  try {
    if (resolvedCustomToUserId) {
      const { data: customUser, error: cuError } = await serviceSupabase
        .from('custom_users')
        .select('wechat_openid, user_metadata')
        .eq('id', resolvedCustomToUserId)
        .single()
      if (!cuError) {
          const openId = (customUser?.wechat_openid || (customUser?.user_metadata as any)?.wechat_openid) as string | undefined
        if (openId) {
          const { from, platform, remark } = inferMessageContext(inserted?.category)
          const origin = getPlatformOrigin(request, from)
          const messageId = inserted?.id ? String(inserted.id) : null
          const jumpUrl = buildH5ChatDetailUrl(origin, from, messageId, 'zh')

          if (isWeChatSubscribeConfigured()) {
            try {
              await sendWeChatServiceSubscribeMessage({
                openId,
                // 适配订阅模板：thing(回复内容) / thing(咨询标题) / time(回复时间)
                title: content.length > 18 ? `${content.slice(0, 18)}…` : content,
                // 新需求：不再拼接“平台｜”，仅展示咨询标题本身
                content: title.length > 18 ? `${title.slice(0, 18)}…` : title,
                platform,
                remark,
                inquiryContent: inquiryContent ? (inquiryContent.length > 20 ? `${inquiryContent.slice(0, 20)}…` : inquiryContent) : undefined,
                url: jumpUrl,
              })
              wechatSent = true
            } catch (subscribeErr) {
              wechatError = subscribeErr instanceof Error ? subscribeErr.message : String(subscribeErr)
              console.warn('微信订阅通知发送失败（已忽略）:', wechatError)
            }
          }

          // 未配置网关/订阅失败时：不阻塞站内信写入（客服消息同样需要 access_token，且 Vercel 环境可能被 IP 白名单拦截）
        }
      }
    }
  } catch (wxErr) {
    wechatError = wxErr instanceof Error ? wxErr.message : String(wxErr)
    console.error('微信推送失败（已忽略）:', wechatError)
  }

  return NextResponse.json({ success: true, data: inserted, wechatSent, wechatError, adminOverride })
}
