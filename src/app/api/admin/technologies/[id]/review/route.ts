import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  isWeChatSubscribeConfigured,
  sendWeChatServiceSubscribeMessage,
  sendWeChatServiceTextMessage,
} from '@/lib/wechat/service-account'

function getRequestOrigin(request: NextRequest) {
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  if (host) return `${proto}://${host}`
  return new URL(request.url).origin
}

// 使用service role key创建Supabase客户端
const supabaseUrl = 'https://qpeanozckghazlzzhrni.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwZWFub3pja2doYXpsenpocm5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI4NTg1MCwiZXhwIjoyMDY5ODYxODUwfQ.wE2j1kNbMKkQgZSkzLR7z6WFft6v90VfWkSd5SBi2P8'
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// POST - 审核技术（通过或退回）
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { action, reason } = await request.json()
    const technologyId = params.id

    if (!action || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json({ error: '无效的审核操作' }, { status: 400 })
    }

    if (action === 'reject' && !reason?.trim()) {
      return NextResponse.json({ error: '退回时必须提供原因' }, { status: 400 })
    }

    // 准备更新数据
    const updateData: Record<string, unknown> = {
      reviewed_at: new Date().toISOString()
    }

    if (action === 'approve') {
      updateData.review_status = 'published'
      updateData.reject_reason = null
    } else if (action === 'reject') {
      updateData.review_status = 'rejected'
      updateData.reject_reason = reason.trim()
    }

    // 更新技术审核状态
    const { data, error } = await supabase
      .from('admin_technologies')
      .update(updateData)
      .eq('id', technologyId)
      .select()
      .single()

    if (error) {
      console.error('更新技术审核状态失败:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: '技术不存在' }, { status: 404 })
    }

    const targetUserId = data.custom_created_by || data.created_by
    if (targetUserId) {
      try {
        await sendReviewNotification({
          userId: data.created_by || null,
          customUserId: data.custom_created_by || null,
          technology: data,
          action,
          reason,
          origin: getRequestOrigin(request),
        })
      } catch (notificationError) {
        console.error('发送审核通知失败:', notificationError)
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API错误:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 发送审核通知的辅助函数
async function sendReviewNotification({
  userId,
  customUserId,
  technology,
  action,
  reason,
  origin,
}: {
  userId: string | null
  customUserId: string | null
  technology: { name_zh: string; id: string }
  action: string
  reason?: string
  origin: string
}) {
  console.log('🔔 开始发送审核通知:', { userId, customUserId, action, technologyName: technology.name_zh })
  
  const messageContent = action === 'approve' 
    ? `您提交的技术"${technology.name_zh}"已通过审核，现已发布到平台上。`
    : `您提交的技术"${technology.name_zh}"未通过审核。\n\n退回原因：${reason}`

  const messageData: any = {
    from_user_id: null, // 系统消息，没有发送者
    to_user_id: userId,
    title: action === 'approve' ? '技术审核通过' : '技术审核退回',
    content: messageContent,
    category: '发布审核', // 设置为发布审核分类
    is_read: false,
    created_at: new Date().toISOString()
  }
  if (customUserId) {
    messageData.custom_to_user_id = customUserId
  }
  
  console.log('🔔 准备插入的消息数据:', messageData)

  // 插入消息到站内消息表
  const { data, error } = await supabase
    .from('internal_messages')
    .insert(messageData)
    .select()

  console.log('🔔 消息插入结果:', { data, error })

  if (error) {
    console.error('🔔 消息插入失败:', error)
    throw error
  }
  
  try {
    if (customUserId) {
      const { data: customUser, error: customError } = await supabase
        .from('custom_users')
        .select('wechat_openid, user_metadata')
        .eq('id', customUserId)
        .single()

      if (customError) {
        console.warn('🔔 微信消息查询用户失败:', customError)
      } else {
        const openId = (customUser?.wechat_openid || (customUser?.user_metadata as any)?.wechat_openid) as string | undefined
        if (openId) {
          const insertedId = Array.isArray(data) && data[0]?.id ? String(data[0].id) : ''
          const detailUrl = insertedId ? `${origin}/zh/m/chat/${encodeURIComponent(insertedId)}` : `${origin}/zh/m/chat`

          let wechatSent = false
          if (isWeChatSubscribeConfigured()) {
            try {
              await sendWeChatServiceSubscribeMessage({
                openId,
                title: messageContent.length > 18 ? `${messageContent.slice(0, 18)}…` : messageContent,
                content:
                  `绿色技术平台｜${String(messageData.title || '')}`.length > 18
                    ? `${`绿色技术平台｜${String(messageData.title || '')}`.slice(0, 18)}…`
                    : `绿色技术平台｜${String(messageData.title || '')}`,
                url: detailUrl,
              })
              wechatSent = true
            } catch (subscribeErr) {
              console.warn('🔔 微信订阅通知发送失败，尝试降级客服消息:', subscribeErr)
            }
          }

          if (!wechatSent) {
            const wechatText = `绿色技术平台\n\n${messageData.title}\n\n${messageContent}\n\n请在【消息中心】查看详情。`
            await sendWeChatServiceTextMessage({ openId, content: wechatText })
          }
          console.log('🔔 微信服务号消息发送成功')
        } else {
          console.log('🔔 用户缺少微信 openid，跳过服务号推送')
        }
      }
    }
  } catch (wxError) {
    console.error('🔔 微信服务号推送失败:', wxError)
  }

  console.log('🔔 审核通知发送成功')
}
