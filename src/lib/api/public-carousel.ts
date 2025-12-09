import type { AdminCarouselImage } from '@/lib/types/admin'

// Minimal client wrapper to fetch public carousel items for the homepage or specific scenes
// Reuses the server route at /api/public/carousel
export async function getPublicCarouselApi(scene?: string): Promise<AdminCarouselImage[]> {
  const url = scene
    ? `/api/public/carousel?scene=${encodeURIComponent(scene)}`
    : '/api/public/carousel'

  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    try {
      const err = await res.json()
      throw new Error(err?.error || 'Failed to fetch carousel')
    } catch {
      throw new Error('Failed to fetch carousel')
    }
  }

  const data = await res.json()
  if (data && data.success && Array.isArray(data.data)) {
    return data.data as AdminCarouselImage[]
  }
  return []
}
