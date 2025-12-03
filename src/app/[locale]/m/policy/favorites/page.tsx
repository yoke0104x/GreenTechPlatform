"use client"

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, Heart, Loader2 } from 'lucide-react'
import { usePolicyFavoritesData } from '@/hooks/usePolicyFavoritesData'
import { removePolicyFavorite, type PolicyLevel, type PolicyTag } from '@/api/policy'

export default function MobilePolicyFavoritesPage() {
  const pathname = usePathname()
  const router = useRouter()
  const locale = pathname.startsWith('/en') ? 'en' : 'zh'

  return (
    <div className="px-3 py-3 pb-20" style={{ backgroundColor: '#edeef7' }}>
      <div className="rounded-2xl bg-white p-3 border border-gray-100">
        <div className="mb-3 flex items-center gap-2">
          <button
            onClick={() => router.back()}
            aria-label={locale === 'en' ? 'Back' : '返回'}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 inline-flex items-center justify-center active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-[16px] font-semibold text-gray-900">
            {locale === 'en' ? 'My Policy Favorites' : '我的政策收藏'}
          </h2>
        </div>
        <MobilePolicyFavoritesList locale={locale} />
      </div>
    </div>
  )
}

function MobilePolicyFavoritesList({ locale }: { locale: string }) {
  const router = useRouter()
  const { userId, authLoading, favorites, isLoading, removeFavoriteLocally } = usePolicyFavoritesData()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const levelLabel = (value: PolicyLevel | '') => {
    switch (value) {
      case 'national':
        return locale === 'en' ? 'Central' : '中央政策'
      case 'ministry':
        return locale === 'en' ? 'Ministry' : '部委政策'
      case 'local':
        return locale === 'en' ? 'Local' : '地方政策'
      case 'park':
        return locale === 'en' ? 'Park' : '园区政策'
      default:
        return ''
    }
  }

  const handleUnfavorite = async (policyId: string) => {
    if (!userId) {
      alert(locale === 'en' ? 'Please login first' : '请先登录')
      return
    }
    if (pendingId) return
    setPendingId(policyId)
    try {
      const success = await removePolicyFavorite(policyId)
      if (success) {
        removeFavoriteLocally(policyId)
      } else {
        alert(locale === 'en' ? 'Failed to remove favorite, please try again later' : '取消收藏失败，请稍后重试')
      }
    } catch (error) {
      console.error('取消政策收藏失败:', error)
      alert(locale === 'en' ? 'Failed to update favorite, please try again later' : '收藏操作失败，请稍后重试')
    } finally {
      setPendingId(null)
    }
  }

  if (authLoading || isLoading) {
    return <MobilePolicyFavoritesSkeleton />
  }

  if (!userId) {
    return (
      <div className="text-center py-12">
        <Heart className="mx-auto h-12 w-12 text-gray-300" />
        <p className="mt-2 text-[14px] text-gray-700 font-medium">{locale === 'en' ? 'Please login to view favorites' : '请登录后查看政策收藏列表'}</p>
        <p className="mt-1 text-[12px] text-gray-500">{locale === 'en' ? 'Log in to sync your saved policies across devices.' : '登录后可同步政策收藏，随时查看。'}</p>
      </div>
    )
  }

  if (!favorites.length) {
    return (
      <div className="text-center py-12">
        <Heart className="mx-auto h-12 w-12 text-gray-300" />
        <p className="mt-2 text-[14px] text-gray-700 font-medium">{locale === 'en' ? 'No favorites yet' : '暂无政策收藏'}</p>
        <p className="mt-1 text-[12px] text-gray-500">{locale === 'en' ? 'Browse the policy list and add interesting items to your favorites.' : '快去政策列表逛逛，收藏对企业有用的政策吧。'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {favorites.map((fav) => {
        const p = fav.policy
        const title = p?.name || ''
        const publishDate = p?.publishDate || (p as any)?.publish_date || ''
        const summary = (p as any)?.summary || ''
        const level = ((p as any)?.level as PolicyLevel) || ''
        const provinceName =
          (p as any)?.province?.name ||
          (p as any)?.province?.name_zh ||
          (p as any)?.province_name ||
          ''
        const zoneName =
          (p as any)?.developmentZone?.name ||
          (p as any)?.developmentZone?.name_zh ||
          (p as any)?.development_zone_name ||
          ''
        const tags =
          ((p as any)?.tags as PolicyTag[] | undefined) ||
          ((p as any)?.policy_tags as PolicyTag[] | undefined) ||
          []

        const locationChips: { text: string; kind: 'location' | 'tag' }[] = []
        const lvl = levelLabel(level)
        if (lvl) locationChips.push({ text: lvl, kind: 'location' })
        if (provinceName) locationChips.push({ text: provinceName, kind: 'location' })
        if (zoneName) locationChips.push({ text: zoneName, kind: 'location' })

        const policyTags = tags && tags.length ? tags : []

        return (
          <article
            key={fav.favoriteId}
            className="rounded-2xl bg-white border border-gray-100 p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-semibold text-gray-900 leading-snug line-clamp-2">
                  {title}
                </h2>
                {summary && (
                  <p className="mt-2 text-[12px] text-gray-700 leading-relaxed line-clamp-3">
                    {summary}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUnfavorite(fav.policyId)}
                  className={`h-7 w-7 rounded-full border flex items-center justify-center ${pendingId === fav.policyId ? 'border-gray-200 bg-gray-100 text-gray-400' : 'border-rose-200 bg-rose-50 text-rose-500 hover:bg-rose-100'}`}
                  aria-label={locale === 'en' ? 'Unfavorite' : '取消收藏'}
                  disabled={pendingId === fav.policyId}
                >
                  {pendingId === fav.policyId ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Heart className="w-4 h-4 fill-current" />
                  )}
                </button>
                <button
                  onClick={() =>
                    router.push(
                      `${locale === 'en' ? '/en' : '/zh'}/m/policy/${fav.policyId}`,
                    )
                  }
                  className="shrink-0 px-2.5 h-7 rounded-full bg-[#00b899] text-white text-[11px] leading-none flex items-center"
                >
                  {locale === 'en' ? 'Details' : '查看详情'}
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                {locationChips.map((item, idx) => (
                  <span
                    key={`${fav.favoriteId}-chip-${idx}`}
                    className={`px-2 h-6 inline-flex items-center rounded-lg text-[11px] shrink-0 ${
                      item.kind === 'location'
                        ? 'bg-[#eef2ff] text-[#4b50d4]'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {item.text}
                  </span>
                ))}
                {policyTags.map((tag) => (
                  <span
                    key={`${fav.favoriteId}-tag-${tag.id}`}
                    className="px-2 h-6 inline-flex items-center rounded-lg bg-gray-100 text-gray-700 text-[11px] shrink-0"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
              {publishDate && (
                <div className="shrink-0 text-right text-[11px] text-gray-500 whitespace-nowrap">
                  {locale === 'en' ? 'Published' : '发布日期'}：{publishDate}
                </div>
              )}
            </div>
          </article>
        )
      })}
    </div>
  )
}

function MobilePolicyFavoritesSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm animate-pulse">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="h-4 w-2/3 bg-gray-200 rounded" />
            <div className="h-6 w-16 bg-gray-200 rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded" />
            <div className="h-3 bg-gray-200 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
