import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { hasUpstashRedisRest, redisGet, redisSetEx } from '@/lib/upstash-redis-rest'

export const dynamic = 'force-dynamic'

type PortalStats = {
  techCount: number
  parkCount: number
  policyCount: number
  generatedAt: string
  source: 'cache' | 'db'
}

const CACHE_KEY = 'portal:stats:v1'
const CACHE_TTL_SECONDS = 10 * 60

export async function GET() {
  try {
    if (hasUpstashRedisRest()) {
      try {
        const cached = await redisGet(CACHE_KEY)
        if (cached) {
          const parsed = JSON.parse(cached) as Omit<PortalStats, 'source'>
          const res = NextResponse.json({
            success: true,
            data: { ...parsed, source: 'cache' satisfies PortalStats['source'] },
          })
          res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600')
          return res
        }
      } catch (error) {
        console.warn('portal stats cache read failed:', error)
      }
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: '服务配置错误' }, { status: 500 })
    }

    const [tech, parks, policy] = await Promise.all([
      supabaseAdmin
        .from('admin_technologies')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .eq('review_status', 'published'),
      supabaseAdmin
        .from('parks')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      supabaseAdmin
        .from('policy')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'active'),
    ])

    const payload: PortalStats = {
      techCount: tech.count || 0,
      parkCount: parks.count || 0,
      policyCount: policy.count || 0,
      generatedAt: new Date().toISOString(),
      source: 'db',
    }

    if (hasUpstashRedisRest()) {
      try {
        // Cache without "source" so subsequent reads can mark as cache.
        const { source: _source, ...cacheBody } = payload
        await redisSetEx(CACHE_KEY, JSON.stringify(cacheBody), CACHE_TTL_SECONDS)
      } catch (error) {
        console.warn('portal stats cache write failed:', error)
      }
    }

    const res = NextResponse.json({ success: true, data: payload })
    res.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600')
    return res
  } catch (error) {
    console.error('portal stats error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '服务器内部错误',
      },
      { status: 500 },
    )
  }
}

