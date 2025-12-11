import { supabase, supabaseAdmin } from '@/lib/supabase';
import { safeFetch, handleApiResponse } from '@/lib/safe-fetch';

// 联系消息数据类型定义
export interface ContactMessage {
  id: string;
  user_id: string;
  custom_user_id?: string;
  technology_id?: string;
  technology_name?: string;
  company_name?: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  message: string;
  status: 'pending' | 'processed';
  category?: '技术对接' | '用户反馈' | '园区对接'; // 新增分类字段，包含园区对接
  admin_reply?: string;
  admin_id?: string;
  replied_at?: string;
  created_at: string;
  updated_at: string;
}

// 创建联系消息的数据类型
export interface CreateContactMessageData {
  technology_id?: string;
  technology_name?: string;
  company_name?: string;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  message: string;
  category?: '技术对接' | '用户反馈' | '园区对接'; // 新增分类字段，包含园区对接
  source?: string; // 可选来源标记（如 park/tech/policy），便于后端兜底分类
}

// 站内信数据类型定义
export interface InternalMessage {
  id: string;
  from_user_id: string;
  to_user_id: string;
  contact_message_id?: string;
  title: string;
  content: string;
  category?: string; // 消息分类
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

// 发送站内信的数据类型
export interface SendInternalMessageData {
  to_user_id?: string;
  custom_to_user_id?: string;
  contact_message_id?: string;
  title: string;
  content: string;
  category?: string; // 消息分类
}

// 消息分类白名单（平台隔离）
export const TECH_MESSAGE_CATEGORIES = [
  '技术对接',
  'Technical Connection',
  '发布审核',
  'Publication Review',
  '我的关注',
  'My Following',
]
export const PARK_MESSAGE_CATEGORIES = [
  '园区对接',
  'Park Connection',
  '我的关注',
  'My Following',
]
export const SHARED_MESSAGE_CATEGORIES = [
  '安全消息',
  'Security Messages',
  '其他',
  'Other',
]
// 默认：技术平台（含历史为空/undefined 分类）
export const DEFAULT_MESSAGE_CATEGORIES = [
  ...TECH_MESSAGE_CATEGORIES,
  ...SHARED_MESSAGE_CATEGORIES,
  '',
  'undefined',
]

/**
 * 创建联系消息
 */
export async function createContactMessage(data: CreateContactMessageData): Promise<ContactMessage> {
  const response = await safeFetch('/api/messages/contact', {
    method: 'POST',
    useAuth: true,
    body: JSON.stringify(data),
  });
  const result = await handleApiResponse(response);
  return (result?.data ?? result) as ContactMessage;
}

/**
 * 获取用户的联系消息列表
 */
export async function getUserContactMessages(): Promise<ContactMessage[]> {
  const response = await safeFetch('/api/messages/contact', {
    method: 'GET',
    useAuth: true,
  });
  const result = await handleApiResponse(response);
  const data = result?.data ?? result;
  return Array.isArray(data) ? data : [];
}

/**
 * 获取所有联系消息（管理员用）
 */
export async function getAllContactMessages(
  page = 1, 
  pageSize = 10, 
  status?: 'pending' | 'processed'
): Promise<{
  data: ContactMessage[];
  count: number;
  totalPages: number;
}> {
  // 直接跳过认证检查，使用无认证版本
  return getAllContactMessagesNoAuth(page, pageSize, status);
}

/**
 * 无认证检查版本 - 直接查询数据库
 */
export async function getAllContactMessagesNoAuth(
  page = 1, 
  pageSize = 10, 
  status?: 'pending' | 'processed'
): Promise<{
  data: ContactMessage[];
  count: number;
  totalPages: number;
}> {
  console.log('📋 无认证版本 - 开始获取联系消息，参数:', { page, pageSize, status });

  try {
    // 使用管理员客户端查询，绕过 RLS 限制
    const client = supabaseAdmin || supabase;
    console.log('📋 使用客户端:', supabaseAdmin ? '管理员' : '普通');
    
    let query = client
      .from('contact_messages')
      .select('*', { count: 'exact' });

    if (status) {
      query = query.eq('status', status);
      console.log('📋 添加状态筛选:', status);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    console.log('📋 分页参数:', { from, to });

    const { data, error, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('📋 数据库查询失败:', error);
      throw new Error(`数据库查询失败: ${error.message} (${error.code || 'unknown'})`);
    }

    console.log('📋 查询成功:', { dataLength: data?.length, count });

    const totalPages = Math.ceil((count || 0) / pageSize);

    return {
      data: data || [],
      count: count || 0,
      totalPages
    };
  } catch (err) {
    console.error('📋 无认证版本查询失败:', err);
    throw err;
  }
}

/**
 * 更新联系消息状态
 */
export async function updateContactMessageStatus(
  messageId: string, 
  status: 'pending' | 'processed'
): Promise<ContactMessage> {
  console.log('📝 更新消息状态:', { messageId, status });
  
  // 尝试获取用户信息，但不强制要求
  const { data: { user } } = await supabase.auth.getUser();
  
  const updateData: any = { 
    status,
    updated_at: new Date().toISOString()
  };
  
  // 如果有用户信息，添加管理员ID
  if (user) {
    updateData.admin_id = user.id;
    console.log('📝 添加管理员ID:', user.id);
  }

  const client = supabaseAdmin || supabase;
  const { data, error } = await client
    .from('contact_messages')
    .update(updateData)
    .eq('id', messageId)
    .select()
    .single();

  if (error) {
    console.error('📝 更新联系消息状态失败:', error);
    throw new Error(error.message || '更新联系消息状态失败');
  }

  console.log('📝 状态更新成功:', data);
  return data;
}

/**
 * 发送站内信
 */
export async function sendInternalMessage(data: SendInternalMessageData): Promise<InternalMessage> {
  console.log('💌 发送站内信(通过API):', data);

  const headers: Record<string, string | undefined> = {};

  if (typeof window !== 'undefined') {
    try {
      const adminMode = localStorage.getItem('admin_mode');
      const adminUser = localStorage.getItem('admin_user');
      if (adminUser) {
        headers['X-Admin-User'] = btoa(unescape(encodeURIComponent(adminUser)));
      } else if (adminMode === 'true') {
        console.warn('管理员模式已开启但未找到admin_user');
      }
    } catch (err) {
      console.warn('⚠️ 读取管理员模式信息失败:', err);
    }
  }

  const response = await safeFetch('/api/messages/internal', {
    method: 'POST',
    useAuth: true,
    body: JSON.stringify(data),
    headers,
  });
  const result = await handleApiResponse(response);
  const payload = result?.data ?? result;
  console.log('💌 站内信发送成功(通过API):', payload);
  return payload as InternalMessage;
}

type MessageFilterOptions = {
  categories?: string[];
  includeNull?: boolean;
  excludeCategories?: string[];
};

const buildCategoryQuery = (options?: MessageFilterOptions) => {
  const params = new URLSearchParams();
  if (options?.categories && options.categories.length > 0) {
    const encoded = options.categories.map((c) => encodeURIComponent(c)).join(',');
    params.set('categories', encoded);
  }
  if (options?.excludeCategories && options.excludeCategories.length > 0) {
    const encodedEx = options.excludeCategories.map((c) => encodeURIComponent(c)).join(',');
    params.set('exclude', encodedEx);
  }
  if (options?.includeNull) {
    params.set('includeNull', 'true');
  }
  const query = params.toString();
  return query ? `?${query}` : '';
};

/**
 * 获取用户收到的站内信（支持按分类过滤）
 */
export async function getReceivedInternalMessages(options?: MessageFilterOptions): Promise<InternalMessage[]> {
  try {
    const merged = options ?? { excludeCategories: PARK_MESSAGE_CATEGORIES, includeNull: true };
    const query = buildCategoryQuery(merged);
    const response = await safeFetch(`/api/messages/internal${query}`, {
      method: 'GET',
      useAuth: true,
    });
    const result = await handleApiResponse(response);
    const data = result?.data ?? result;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('获取站内信失败:', error);
    throw error instanceof Error ? error : new Error('获取站内信失败');
  }
}

/**
 * 根据ID获取单条站内信（支持按分类过滤）
 */
export async function getInternalMessageById(messageId: string, options?: MessageFilterOptions): Promise<InternalMessage> {
  try {
    const merged = options ?? { excludeCategories: PARK_MESSAGE_CATEGORIES, includeNull: true };
    const query = buildCategoryQuery(merged);
    const response = await safeFetch(`/api/messages/internal?id=${encodeURIComponent(messageId)}${query}`, {
      method: 'GET',
      useAuth: true,
    });
    const result = await handleApiResponse(response);
    const data = result?.data ?? result;
    if (!data) {
      throw new Error('消息不存在');
    }
    return data as InternalMessage;
  } catch (error) {
    console.error('获取站内信详情失败:', error);
    throw error instanceof Error ? error : new Error('获取站内信详情失败');
  }
}

/**
 * 标记站内信为已读
 */
export async function markInternalMessageAsRead(messageId: string): Promise<InternalMessage> {
  try {
    const response = await safeFetch('/api/messages/internal/mark-read', {
      method: 'POST',
      useAuth: true,
      body: JSON.stringify({ ids: [messageId] }),
    });
    const result = await handleApiResponse(response);
    const data = result?.data ?? result;
    if (Array.isArray(data) && data.length > 0) {
      return data[0] as InternalMessage;
    }
    return {
      id: messageId,
      from_user_id: '',
      to_user_id: '',
      title: '',
      content: '',
      is_read: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      read_at: new Date().toISOString(),
    } as InternalMessage;
  } catch (error) {
    console.error('标记站内信为已读失败:', error);
    throw error instanceof Error ? error : new Error('标记站内信为已读失败');
  }
}

/**
 * 获取未读站内信数量（支持按分类过滤）
 */
export async function getUnreadInternalMessageCount(options?: MessageFilterOptions): Promise<number> {
  try {
    const merged = options ?? { excludeCategories: PARK_MESSAGE_CATEGORIES, includeNull: true };
    const query = buildCategoryQuery(merged);
    const response = await safeFetch(`/api/messages/internal/unread-count${query}`, {
      method: 'GET',
      useAuth: true,
    });
    const result = await handleApiResponse(response);
    const data = result?.data ?? result;
    if (typeof data === 'number') return data;
    if (typeof data?.count === 'number') return data.count;
    return 0;
  } catch (error) {
    console.error('获取未读站内信数量失败:', error);
    throw error instanceof Error ? error : new Error('获取未读站内信数量失败');
  }
}

/**
 * 批量标记站内信为已读
 */
export async function markInternalMessagesAsRead(messageIds: string[]): Promise<InternalMessage[]> {
  if (messageIds.length === 0) {
    return [];
  }

  try {
    const response = await safeFetch('/api/messages/internal/mark-read', {
      method: 'POST',
      useAuth: true,
      body: JSON.stringify({ ids: messageIds }),
    });
    const result = await handleApiResponse(response);
    const data = result?.data ?? result;
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('批量标记站内信为已读失败:', error);
    throw error instanceof Error ? error : new Error('批量标记站内信为已读失败');
  }
}

/**
 * 标记所有站内信为已读
 */
export async function markAllInternalMessagesAsRead(): Promise<number> {
  try {
    const response = await safeFetch('/api/messages/internal/mark-all-read', {
      method: 'POST',
      useAuth: true,
    });
    const result = await handleApiResponse(response);
    const data = result?.data ?? result;
    if (typeof data === 'number') return data;
    const updated = Number(data?.updated ?? 0);
    return Number.isFinite(updated) ? updated : 0;
  } catch (error) {
    console.error('标记所有站内信为已读失败:', error);
    throw error instanceof Error ? error : new Error('标记所有站内信为已读失败');
  }
}

/**
 * 批量删除站内信
 */
export async function deleteInternalMessages(messageIds: string[]): Promise<number> {
  if (messageIds.length === 0) {
    return 0;
  }

  try {
    const response = await safeFetch('/api/messages/internal/delete', {
      method: 'POST',
      useAuth: true,
      body: JSON.stringify({ ids: messageIds }),
    });
    const result = await handleApiResponse(response);
    const data = result?.data ?? result;
    if (Array.isArray(data)) return data.length;
    const count = Number(data?.deleted ?? data?.count ?? 0);
    return Number.isFinite(count) ? count : 0;
  } catch (error) {
    console.error('批量删除站内信失败:', error);
    throw error instanceof Error ? error : new Error('批量删除站内信失败');
  }
}
