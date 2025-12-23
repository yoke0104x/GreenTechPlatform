'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Bell } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AuthModal } from '../auth/auth-modal';
import { useAuthContext } from '../auth/auth-provider';
import { UserMenu } from '../user/user-menu';
import { LanguageSwitcher } from '../common/language-switcher';
import { getUnreadInternalMessageCount } from '@/lib/supabase/contact-messages';

export function Header() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, loading } = useAuthContext();
  const pathname = usePathname();
  const t = useTranslations('header');
  
  // 检测是否在国际化路由下
  const isI18nRoute = pathname.startsWith('/zh') || pathname.startsWith('/en');
  const locale = isI18nRoute ? pathname.split('/')[1] : 'zh';

  // 加载未读消息数量
  useEffect(() => {
    if (user) {
      const loadUnreadCount = async () => {
        try {
          const count = await getUnreadInternalMessageCount();
          setUnreadCount(count);
        } catch (error) {
          console.error('加载未读消息数量失败:', error);
        }
      };
      
      loadUnreadCount();
      
      // 设置定时刷新未读消息数量
      const interval = setInterval(loadUnreadCount, 30000); // 每30秒刷新一次
      return () => clearInterval(interval);
    }
  }, [user]);

  return (
    <header className="bg-white shadow-sm border-b border-gray-100">
      <div className="flex justify-between items-center h-16 px-6">
          {/* Logo和标题 */}
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href={`/${locale}`}
              className="relative w-56 h-14"
              aria-label={locale === 'en' ? t('platformNameEn') : t('platformName')}
            >
              <Image
                src="/images/logo/图片1.png"
                alt="绿盟logo"
                fill
                className="object-contain"
                sizes="224px"
                priority
              />
            </Link>
            <h1 className="sr-only">
              {locale === 'en' ? t('platformNameEn') : t('platformName')}
            </h1>
          </div>

          {/* 导航菜单 */}
          <nav className="flex items-center space-x-2">
            {/* 语言选择 */}
            <LanguageSwitcher />

            {/* 用户功能链接 - 只在用户登录后显示 */}
            {user && (
              <>
                <Link 
                  href={`/${locale}/user/technologies`}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                  <span>{t('dashboard')}</span>
                </Link>
                
                <Link 
                  href={`/${locale}/user/messages`}
                  className="relative flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
                  title={t('messages')}
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>
              </>
            )}

            {/* 登录/注册 */}
            {loading ? (
              <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
            ) : user ? (
              <UserMenu />
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
                title={t('loginRegister')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>{t('loginRegister')}</span>
              </button>
            )}
          </nav>
      </div>
      
      {/* 登录注册弹窗 */}
      {!user && <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />}
    </header>
  );
} 
