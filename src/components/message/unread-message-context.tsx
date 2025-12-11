'use client'

import { createContext, useContext, useCallback, useEffect, useState, ReactNode, useMemo } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAuthContext } from '@/components/auth/auth-provider'
import { getUnreadInternalMessageCount, DEFAULT_MESSAGE_CATEGORIES, PARK_MESSAGE_CATEGORIES, SHARED_MESSAGE_CATEGORIES } from '@/lib/supabase/contact-messages'

interface UnreadMessageContextType {
  unreadCount: number
  refreshUnreadCount: () => Promise<void>
  decrementUnreadCount: (amount?: number) => void
  setUnreadCount: (count: number) => void
}

const UnreadMessageContext = createContext<UnreadMessageContextType | undefined>(undefined)

export function UnreadMessageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [unreadCount, setUnreadCount] = useState(0)

  const isParkContext = useMemo(() => {
    if (!pathname) return false
    if (pathname.includes('/m/parks')) return true
    if (pathname.includes('/parks/')) return true
    return searchParams?.get('from') === 'parks'
  }, [pathname, searchParams])

  const categoryOptions = useMemo(
    () =>
      isParkContext
        ? { categories: [...PARK_MESSAGE_CATEGORIES, ...SHARED_MESSAGE_CATEGORIES], includeNull: false }
        : { excludeCategories: PARK_MESSAGE_CATEGORIES, includeNull: true },
    [isParkContext],
  )

  const refreshUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0)
      return
    }
    try {
      const count = await getUnreadInternalMessageCount(categoryOptions)
      setUnreadCount(count)
    } catch (error) {
      console.error('Failed to load unread count:', error)
      setUnreadCount(0)
    }
  }, [user, categoryOptions])

  const decrementUnreadCount = useCallback((amount: number = 1) => {
    setUnreadCount(prev => Math.max(0, prev - amount))
  }, [])

  // 初始加载和定期刷新
  useEffect(() => {
    refreshUnreadCount()

    // 定期更新未读数量（每30秒）
    const interval = setInterval(refreshUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [refreshUnreadCount])

  const value: UnreadMessageContextType = {
    unreadCount,
    refreshUnreadCount,
    decrementUnreadCount,
    setUnreadCount
  }

  return (
    <UnreadMessageContext.Provider value={value}>
      {children}
    </UnreadMessageContext.Provider>
  )
}

export function useUnreadMessage() {
  const context = useContext(UnreadMessageContext)
  if (context === undefined) {
    throw new Error('useUnreadMessage must be used within an UnreadMessageProvider')
  }
  return context
}
