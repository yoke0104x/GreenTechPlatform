type UpstashResult<T> = {
  result: T
  error?: string
}

const getEnv = (key: string) => process.env[key] || process.env[`NEXT_PUBLIC_${key}`]

const restUrl = () => getEnv('UPSTASH_REDIS_REST_URL')
const restToken = () => getEnv('UPSTASH_REDIS_REST_TOKEN')

export function hasUpstashRedisRest(): boolean {
  return Boolean(restUrl() && restToken())
}

async function upstashCommand<T>(path: string): Promise<T> {
  const url = restUrl()
  const token = restToken()
  if (!url || !token) throw new Error('Upstash Redis REST env not configured')

  const resp = await fetch(`${url}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new Error(`Upstash Redis REST error: ${resp.status} ${resp.statusText} ${text}`)
  }

  const data = (await resp.json()) as UpstashResult<T>
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(`Upstash Redis REST error: ${data.error}`)
  }
  return data.result
}

export async function redisGet(key: string): Promise<string | null> {
  return await upstashCommand<string | null>(`/get/${encodeURIComponent(key)}`)
}

export async function redisSetEx(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<'OK' | string> {
  const ttl = Number.isFinite(ttlSeconds) ? Math.max(1, Math.floor(ttlSeconds)) : 600
  return await upstashCommand<'OK' | string>(
    `/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}?EX=${ttl}`,
  )
}

