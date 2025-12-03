import { useCallback, useEffect, useState } from 'react'
import { useAuthContext } from '@/components/auth/auth-provider'
import {
  getPolicyFavorites,
  type PolicyFavoriteItem,
} from '@/api/policy'

interface UsePolicyFavoritesDataResult {
  userId: string | null
  authLoading: boolean
  favorites: PolicyFavoriteItem[]
  isLoading: boolean
  refresh: () => Promise<void>
  removeFavoriteLocally: (policyId: string) => void
}

export function usePolicyFavoritesData(): UsePolicyFavoritesDataResult {
  const { user, loading: authLoading } = useAuthContext()
  const [favorites, setFavorites] = useState<PolicyFavoriteItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const userId = user?.id ?? null

  const refresh = useCallback(async () => {
    if (!userId) {
      setFavorites([])
      return
    }

    setIsLoading(true)
    try {
      const records = await getPolicyFavorites(userId)
      setFavorites(records)
    } catch (error) {
      console.error('加载政策收藏数据失败:', error)
      setFavorites([])
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setFavorites([])
      setIsLoading(false)
      return
    }
    refresh()
  }, [userId, refresh])

  const removeFavoriteLocally = useCallback((policyId: string) => {
    if (!policyId) return
    setFavorites((prev) => prev.filter((item) => item.policyId !== policyId))
  }, [])

  return {
    userId,
    authLoading,
    favorites,
    isLoading,
    refresh,
    removeFavoriteLocally,
  }
}

