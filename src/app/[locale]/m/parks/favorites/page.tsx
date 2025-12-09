"use client"

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Clock, Heart } from 'lucide-react'
import { useAuthContext } from '@/components/auth/auth-provider'
import { useLoadingOverlay } from '@/components/common/loading-overlay'
import { getParkFavorites, removeParkFavorite, type ParkFavoriteItem } from '@/api/parks'

export default function MobileParkFavoritesPage() {
  const pathname = usePathname()
  const router = useRouter()
  const locale = pathname.startsWith('/en') ? 'en' : 'zh'
  const isEn = locale === 'en'
  const basePath = locale === 'en' ? '/en' : '/zh'
  const { user } = useAuthContext()
  const { showLoading, hideLoading } = useLoadingOverlay()

  const [favorites, setFavorites] = useState<ParkFavoriteItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    const load = async () => {
      if (!user) {
        setLoading(false)
        return
      }
      setLoading(true)
      showLoading()
      try {
        const list = await getParkFavorites(user.id)
        if (!alive) return
        setFavorites(list)
      } finally {
        if (alive) setLoading(false)
        hideLoading()
      }
    }
    load()
    return () => {
      alive = false
      hideLoading()
    }
  }, [user, showLoading, hideLoading])

  const handleRemove = async (parkId: string) => {
    if (!confirm(isEn ? 'Remove this park from favorites?' : '确定取消收藏该园区吗？')) {
      return
    }
    try {
      const ok = await removeParkFavorite(parkId)
      if (ok) {
        setFavorites((prev) => prev.filter((f) => f.parkId !== parkId))
      }
    } catch (error) {
      console.error('取消园区收藏失败:', error)
    }
  }

  if (!user) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center text-center px-6" style={{ backgroundColor: '#edeef7' }}>
        <p className="text-[14px] text-gray-700 font-medium">
          {isEn ? 'Please login to view favorites' : '请登录后查看园区收藏列表'}
        </p>
        <button
          type="button"
          onClick={() => router.push(`${basePath}/m/login`)}
          className="mt-3 px-4 h-9 rounded-full bg-[#00b899] text-white text-[13px]"
        >
          {isEn ? 'Go to Login' : '去登录'}
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center text-[13px] text-gray-500" style={{ backgroundColor: '#edeef7' }}>
        {isEn ? 'Loading favorites...' : '正在加载收藏列表...'}
      </div>
    )
  }

  if (!favorites.length) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center text-center px-6" style={{ backgroundColor: '#edeef7' }}>
        <p className="text-[14px] text-gray-700 font-medium">
          {isEn ? 'No favorites yet' : '暂无园区收藏'}
        </p>
        <p className="mt-1 text-[12px] text-gray-500">
          {isEn
            ? 'Browse the park list and add interesting parks to your favorites.'
            : '快去园区列表逛逛，收藏感兴趣的园区吧。'}
        </p>
        <button
          type="button"
          onClick={() => router.push(`${basePath}/m/parks`)}
          className="mt-3 px-4 h-9 rounded-full bg-[#00b899] text-white text-[13px]"
        >
          {isEn ? 'Go to Parks' : '前往园区列表'}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-dvh" style={{ backgroundColor: '#edeef7' }}>
      <div className="px-3 pt-4 pb-4">
        <h1 className="text-[18px] font-semibold text-gray-900 mb-3">
          {isEn ? 'My Park Favorites' : '我的园区收藏'}
        </h1>

        <div className="space-y-3">
          {favorites.map((fav) => {
            const p = fav.park
            if (!p) return null
            return (
              <div
                key={fav.favoriteId}
                className="rounded-2xl bg-white border border-gray-100 shadow-sm p-3"
              >
                <button
                  type="button"
                  onClick={() => router.push(`${basePath}/m/parks/${p.id}`)}
                  className="w-full text-left flex items-start gap-3"
                >
                  <div className="w-[60px] h-[60px] rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                    {p.logo_url ? (
                      <Image
                        src={p.logo_url}
                        alt={p.name_zh}
                        width={60}
                        height={60}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                        {isEn ? 'No Logo' : '暂无Logo'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-semibold text-gray-900 line-clamp-2">
                      {p.name_zh}
                    </h3>
                    {p.brief_zh && (
                      <p className="mt-1 text-[12px] text-gray-600 line-clamp-3">
                        {p.brief_zh}
                      </p>
                    )}
                    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {isEn ? 'Favorited at' : '收藏时间'} {fav.favoritedAt.slice(0, 10)}
                        </span>
                      </span>
                    </div>
                  </div>
                </button>
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleRemove(p.id)}
                    className="inline-flex items-center gap-1 px-3 h-8 rounded-full bg-rose-50 text-rose-600 text-[12px] border border-rose-200"
                  >
                    <Heart className="w-3 h-3 fill-current" />
                    <span>{isEn ? 'Remove' : '取消收藏'}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

