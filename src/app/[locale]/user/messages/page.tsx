'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { 
  Bell, 
  Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { 
  InternalMessage, 
  getReceivedInternalMessages, 
  markInternalMessageAsRead,
  getUnreadInternalMessageCount,
  markInternalMessagesAsRead,
  markAllInternalMessagesAsRead,
  deleteInternalMessages
} from '@/lib/supabase/contact-messages';
import { useToast } from '@/components/ui/use-toast';
import { useAuthContext } from '@/components/auth/auth-provider';

interface MessageFilters {
  category: 'all' | 'technical' | 'audit' | 'following' | 'security' | 'other';
  status: 'all' | 'read' | 'unread';
  searchKeyword: string;
}

export default function MessageCenterPage() {
  const { user } = useAuthContext();
  const { toast } = useToast();
  const pathname = usePathname();
  
  // 检测当前语言
  const locale = pathname.startsWith('/en') ? 'en' : 'zh';
  
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<InternalMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<string>>(new Set());
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [filters, setFilters] = useState<MessageFilters>({
    category: 'all',
    status: 'all',
    searchKeyword: ''
  });


  // 加载消息列表
  const loadMessages = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const [messagesData, unreadCountData] = await Promise.all([
        getReceivedInternalMessages(),
        getUnreadInternalMessageCount()
      ]);
      
      setMessages(messagesData);
      setUnreadCount(unreadCountData);
      
      // 如果没有选中的消息且有消息，默认选中第一条
      if (!selectedMessageId && messagesData.length > 0) {
        setSelectedMessageId(messagesData[0].id);
      }
    } catch (error) {
      console.error('加载消息失败:', error);
      toast({
        title: locale === 'en' ? "Loading Failed" : "加载失败",
        description: locale === 'en' 
          ? "Unable to load message list, please refresh the page and try again"
          : "无法加载消息列表，请刷新页面重试",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadMessages();
  }, [user]);

  // 筛选消息
  useEffect(() => {
    let filtered = [...messages];

    // 按分类筛选（使用消息的 category 字段）
    if (filters.category !== 'all') {
      const categoryMap = {
        technical: locale === 'en' ? 'Technical Connection' : '技术对接',
        audit: locale === 'en' ? 'Publication Review' : '发布审核',
        following: locale === 'en' ? 'My Following' : '我的关注',
        security: locale === 'en' ? 'Security Messages' : '安全消息',
        other: locale === 'en' ? 'Other' : '其他'
      };
      
      const targetCategory = categoryMap[filters.category];
      if (targetCategory) {
        filtered = filtered.filter(msg => {
          // 如果是技术对接类别，包含没有category字段的消息（向后兼容）
          if (targetCategory === '技术对接' || targetCategory === 'Technical Connection') {
            return msg.category === targetCategory || 
                   msg.category === '技术对接' ||
                   msg.category === 'Technical Connection' ||
                   !msg.category || 
                   msg.category === null || 
                   msg.category === '' ||
                   msg.category === 'undefined';
          }
          return msg.category === targetCategory;
        });
      }
    }

    // 按读取状态筛选
    if (filters.status === 'read') {
      filtered = filtered.filter(msg => msg.is_read);
    } else if (filters.status === 'unread') {
      filtered = filtered.filter(msg => !msg.is_read);
    }

    // 按关键词筛选
    if (filters.searchKeyword.trim()) {
      const keyword = filters.searchKeyword.toLowerCase();
      filtered = filtered.filter(msg => 
        msg.title.toLowerCase().includes(keyword) ||
        msg.content.toLowerCase().includes(keyword)
      );
    }

    setFilteredMessages(filtered);
    
    // 重置选择状态
    setSelectedMessageIds(new Set());
    setIsAllSelected(false);
  }, [messages, filters, locale]);

  // 选中消息并标记为已读
  const handleSelectMessage = async (message: InternalMessage) => {
    setSelectedMessageId(message.id);

    // 如果消息未读，标记为已读
    if (!message.is_read) {
      try {
        await markInternalMessageAsRead(message.id);
        // 更新本地状态
        setMessages(prev => 
          prev.map(msg => 
            msg.id === message.id 
              ? { ...msg, is_read: true, read_at: new Date().toISOString() }
              : msg
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('标记已读失败:', error);
      }
    }
  };

  // 处理单个消息的选择
  const handleMessageSelect = (messageId: string, checked: boolean) => {
    const newSelected = new Set(selectedMessageIds);
    if (checked) {
      newSelected.add(messageId);
    } else {
      newSelected.delete(messageId);
    }
    setSelectedMessageIds(newSelected);
    setIsAllSelected(newSelected.size === filteredMessages.length && filteredMessages.length > 0);
  };

  // 处理全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = new Set(filteredMessages.map(msg => msg.id));
      setSelectedMessageIds(allIds);
      setIsAllSelected(true);
    } else {
      setSelectedMessageIds(new Set());
      setIsAllSelected(false);
    }
  };

  // 批量标记为已读
  const handleBatchMarkAsRead = async () => {
    if (selectedMessageIds.size === 0) {
      toast({
        title: locale === 'en' ? "Notice" : "提示",
        description: locale === 'en' 
          ? "Please select messages to mark first"
          : "请先选择要标记的消息",
        variant: "default"
      });
      return;
    }

    setBatchLoading(true);
    try {
      const messageIdsArray = Array.from(selectedMessageIds);
      await markInternalMessagesAsRead(messageIdsArray);

      // 更新本地状态
      setMessages(prev => 
        prev.map(msg => 
          selectedMessageIds.has(msg.id)
            ? { ...msg, is_read: true, read_at: new Date().toISOString() }
            : msg
        )
      );

      // 更新未读数量
      const markedUnreadCount = Array.from(selectedMessageIds)
        .filter(id => {
          const msg = messages.find(m => m.id === id);
          return msg && !msg.is_read;
        }).length;
      setUnreadCount(prev => Math.max(0, prev - markedUnreadCount));

      // 清空选择
      setSelectedMessageIds(new Set());
      setIsAllSelected(false);

      toast({
        title: locale === 'en' ? "Success" : "操作成功",
        description: locale === 'en' 
          ? `Marked ${messageIdsArray.length} messages as read`
          : `已标记 ${messageIdsArray.length} 条消息为已读`,
        variant: "default"
      });
    } catch (error) {
      console.error('批量标记已读失败:', error);
      toast({
        title: locale === 'en' ? "Operation Failed" : "操作失败",
        description: locale === 'en' 
          ? "Batch mark as read failed, please try again"
          : "批量标记已读失败，请重试",
        variant: "destructive"
      });
    } finally {
      setBatchLoading(false);
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedMessageIds.size === 0) {
      toast({
        title: locale === 'en' ? "Notice" : "提示",
        description: locale === 'en' 
          ? "Please select messages to delete first"
          : "请先选择要删除的消息",
        variant: "default"
      });
      return;
    }

    setBatchLoading(true);
    try {
      const messageIdsArray = Array.from(selectedMessageIds);
      await deleteInternalMessages(messageIdsArray);

      // 更新本地状态
      setMessages(prev => prev.filter(msg => !selectedMessageIds.has(msg.id)));

      // 更新未读数量
      const deletedUnreadCount = Array.from(selectedMessageIds)
        .filter(id => {
          const msg = messages.find(m => m.id === id);
          return msg && !msg.is_read;
        }).length;
      setUnreadCount(prev => Math.max(0, prev - deletedUnreadCount));

      // 清空选择
      setSelectedMessageIds(new Set());
      setIsAllSelected(false);

      // 如果删除的是当前查看的消息，清空选择
      if (selectedMessageId && selectedMessageIds.has(selectedMessageId)) {
        setSelectedMessageId(null);
      }

      toast({
        title: locale === 'en' ? "Success" : "操作成功",
        description: locale === 'en' 
          ? `Deleted ${messageIdsArray.length} messages`
          : `已删除 ${messageIdsArray.length} 条消息`,
        variant: "default"
      });
    } catch (error) {
      console.error('批量删除失败:', error);
      toast({
        title: locale === 'en' ? "Operation Failed" : "操作失败",
        description: locale === 'en' 
          ? "Batch delete failed, please try again"
          : "批量删除失败，请重试",
        variant: "destructive"
      });
    } finally {
      setBatchLoading(false);
    }
  };

  // 全部已读
  const handleMarkAllAsRead = async () => {
    setBatchLoading(true);
    try {
      const updatedCount = await markAllInternalMessagesAsRead();

      // 更新本地状态
      setMessages(prev => 
        prev.map(msg => ({ 
          ...msg, 
          is_read: true, 
          read_at: new Date().toISOString() 
        }))
      );

      setUnreadCount(0);

      toast({
        title: locale === 'en' ? "Success" : "操作成功",
        description: locale === 'en' 
          ? `Marked ${updatedCount} messages as read`
          : `已标记 ${updatedCount} 条消息为已读`,
        variant: "default"
      });
    } catch (error) {
      console.error('全部标记已读失败:', error);
      toast({
        title: locale === 'en' ? "Operation Failed" : "操作失败",
        description: locale === 'en' 
          ? "Mark all as read failed, please try again"
          : "全部标记已读失败，请重试",
        variant: "destructive"
      });
    } finally {
      setBatchLoading(false);
    }
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return date.toLocaleTimeString(locale === 'en' ? 'en-US' : 'zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'zh-CN', { month: '2-digit', day: '2-digit' });
    }
  };

  // 获取选中的消息
  const selectedMessage = messages.find(msg => msg.id === selectedMessageId);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">
            {locale === 'en' ? 'Please login to view messages' : '请先登录查看消息'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 页面标题 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {locale === 'en' ? 'All Messages' : '全部消息'}
        </h1>
      </div>

      {/* 分类标签和搜索 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* 消息分类标签 */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setFilters(prev => ({ ...prev, category: 'all', status: 'all' }))}
              className={`flex items-center space-x-1 ${locale === 'en' ? 'text-xs' : 'text-sm'} font-medium border-b-2 pb-1 whitespace-nowrap ${
                filters.category === 'all' && filters.status === 'all'
                  ? 'text-gray-900 border-gray-900' 
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <span>{locale === 'en' ? 'All Categories' : '全部类别'}</span>
              <span className="text-blue-600 font-semibold">({messages.length})</span>
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, category: 'technical' }))}
              className={`flex items-center space-x-1 ${locale === 'en' ? 'text-xs' : 'text-sm'} font-medium border-b-2 pb-1 whitespace-nowrap ${
                filters.category === 'technical'
                  ? 'text-blue-600 border-blue-600' 
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <span>{locale === 'en' ? 'Technical' : '技术对接'}</span>
              <span className="text-blue-600 font-semibold">({messages.filter(msg => 
                msg.category === '技术对接' || 
                msg.category === 'Technical Connection' ||
                !msg.category || 
                msg.category === null || 
                msg.category === '' ||
                msg.category === 'undefined'
              ).length})</span>
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, category: 'audit' }))}
              className={`flex items-center space-x-1 ${locale === 'en' ? 'text-xs' : 'text-sm'} font-medium border-b-2 pb-1 whitespace-nowrap ${
                filters.category === 'audit'
                  ? 'text-orange-600 border-orange-600' 
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <span>{locale === 'en' ? 'Review' : '发布审核'}</span>
              <span className="text-blue-600 font-semibold">({messages.filter(msg => 
                msg.category === '发布审核' || msg.category === 'Publication Review'
              ).length})</span>
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, category: 'following' }))}
              className={`flex items-center space-x-1 ${locale === 'en' ? 'text-xs' : 'text-sm'} font-medium border-b-2 pb-1 whitespace-nowrap ${
                filters.category === 'following'
                  ? 'text-green-600 border-green-600' 
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
              >
              <span>{locale === 'en' ? 'Following' : '我的关注'}</span>
              <span className="text-blue-600 font-semibold">({messages.filter(msg => 
                msg.category === '我的关注' || msg.category === 'My Following'
              ).length})</span>
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, category: 'security' }))}
              className={`flex items-center space-x-1 ${locale === 'en' ? 'text-xs' : 'text-sm'} font-medium border-b-2 pb-1 whitespace-nowrap ${
                filters.category === 'security'
                  ? 'text-red-600 border-red-600' 
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
              >
              <span>{locale === 'en' ? 'Security' : '安全消息'}</span>
              <span className="text-blue-600 font-semibold">({messages.filter(msg => 
                msg.category === '安全消息' || msg.category === 'Security Messages'
              ).length})</span>
            </button>
            <button
              onClick={() => setFilters(prev => ({ ...prev, category: 'other' }))}
              className={`flex items-center space-x-1 ${locale === 'en' ? 'text-xs' : 'text-sm'} font-medium border-b-2 pb-1 whitespace-nowrap ${
                filters.category === 'other'
                  ? 'text-gray-600 border-gray-600' 
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
              >
              <span>{locale === 'en' ? 'Other' : '其他'}</span>
              <span className="text-blue-600 font-semibold">({messages.filter(msg => 
                msg.category === '其他' || msg.category === 'Other'
              ).length})</span>
            </button>
          </div>

          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={locale === 'en' ? 'Enter keywords' : '请输入关键字'}
              value={filters.searchKeyword}
              onChange={(e) => setFilters(prev => ({ ...prev, searchKeyword: e.target.value }))}
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      {/* 批量操作栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <input 
                type="checkbox" 
                className="rounded border-gray-300"
                checked={isAllSelected}
                onChange={(e) => handleSelectAll(e.target.checked)}
                disabled={filteredMessages.length === 0}
              />
              <span className="text-sm text-gray-600">
                {locale === 'en' ? 'Select All' : '全选'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBatchMarkAsRead}
                disabled={selectedMessageIds.size === 0 || batchLoading}
                className="px-3 py-1 text-sm rounded bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {batchLoading 
                  ? (locale === 'en' ? 'Processing...' : '处理中...') 
                  : (locale === 'en' ? 'Mark as Read' : '标记已读')
                }
              </button>
              <button
                onClick={handleBatchDelete}
                disabled={selectedMessageIds.size === 0 || batchLoading}
                className="px-3 py-1 text-sm rounded bg-red-100 text-red-700 hover:bg-red-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {locale === 'en' ? 'Delete' : '删除'}
              </button>
              <button
                onClick={handleMarkAllAsRead}
                disabled={batchLoading || unreadCount === 0}
                className="px-3 py-1 text-sm rounded bg-green-100 text-green-700 hover:bg-green-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {locale === 'en' ? 'Mark All as Read' : '全部已读'}
              </button>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              {locale === 'en' ? 'Selected' : '已选择'}: {selectedMessageIds.size} {locale === 'en' ? 'items' : '条'}
            </div>
            <div className="text-sm text-gray-500">
              {locale === 'en' ? 'Total' : '总条数'}: {filteredMessages.length}
            </div>
            {unreadCount > 0 && (
              <div className="text-sm text-red-600">
                {locale === 'en' ? 'Unread' : '未读'}: {unreadCount} {locale === 'en' ? 'items' : '条'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex-1 flex bg-white">
        {/* 左侧消息列表 */}
        <div className="w-1/3 border-r border-gray-200 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <p className="mt-2 text-gray-600">
                {locale === 'en' ? 'Loading...' : '加载中...'}
              </p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>{locale === 'en' ? 'No messages' : '暂无消息'}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredMessages.map((message) => (
                <div 
                  key={message.id} 
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedMessageId === message.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                  onClick={() => handleSelectMessage(message)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300"
                        checked={selectedMessageIds.has(message.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleMessageSelect(message.id, e.target.checked);
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        {!message.is_read && (
                          <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 animate-pulse"></div>
                        )}
                        <h3 className={`text-sm font-medium truncate ${
                          !message.is_read ? 'text-gray-900' : 'text-gray-400'
                        }`}>
                          {message.title}
                        </h3>
                      </div>
                      
                      <p className="text-xs text-gray-500 mb-1">
                        {formatDate(message.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 右侧消息详情 */}
        <div className="flex-1 flex flex-col">
          {selectedMessage ? (
            <>
              {/* 消息标题 */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  {selectedMessage.title}
                </h2>
                <div className="text-sm text-gray-500">
                  {locale === 'en' ? 'Published at' : '发布于'} {new Date(selectedMessage.created_at).toLocaleString(locale === 'en' ? 'en-US' : 'zh-CN')} | {selectedMessage.category || (locale === 'en' ? 'Technical Connection' : '技术对接')}
                </div>
              </div>
              
              {/* 消息内容 */}
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {selectedMessage.content}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>
                  {locale === 'en' 
                    ? 'Please select a message to view details' 
                    : '请选择一条消息查看详情'
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
