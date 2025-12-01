import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function downloadBuffer(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('image download failed')
  const arr = await res.arrayBuffer()
  return Buffer.from(arr)
}

function generateCompanyLogoSVG(name: string, size = 256) {
  const clean = (name || '').replace(/(有限公司|股份有限公司|有限责任公司|集团|公司|科技|技术)$/g, '').replace(/\s+/g, '')
  let chars = clean.slice(0, 4).split('')
  if (chars.length < 4) {
    const rest = (name || '').replace(/\s+/g, '').slice(clean.length)
    for (const c of rest) { if (chars.length >= 4) break; if (!chars.includes(c)) chars.push(c) }
    while (chars.length > 0 && chars.length < 4) chars.push(chars[0])
  }
  const fontSize = Math.floor(size / 3.5)
  const spacing = fontSize * 1.3
  const cx = size / 2, cy = size / 2
  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#00b899" rx="8" ry="8"/>
    <text x="${cx - spacing/2}" y="${cy - spacing/2}" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${chars[0] || ''}</text>
    <text x="${cx + spacing/2}" y="${cy - spacing/2}" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${chars[1] || ''}</text>
    <text x="${cx - spacing/2}" y="${cy + spacing/2}" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${chars[2] || ''}</text>
    <text x="${cx + spacing/2}" y="${cy + spacing/2}" font-family="Arial, PingFang SC, Microsoft YaHei, sans-serif" font-size="${fontSize}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="middle">${chars[3] || ''}</text>
  </svg>`
}

async function nextUnknownCode(supabase: any): Promise<string> {
  const { data } = await supabase
    .from('admin_countries')
    .select('code')
    .ilike('code', 'xx%')
  let maxN = 0
  for (const row of data || []) {
    const m = String(row.code || '').match(/^xx(\d+)$/i)
    if (m) {
      const n = parseInt(m[1], 10)
      if (!isNaN(n)) maxN = Math.max(maxN, n)
    }
  }
  return `xx${maxN + 1}`
}

async function ensureOthers(supabase: any): Promise<string> {
  const { data: byCode } = await supabase.from('admin_countries').select('id').eq('code', 'others').limit(1)
  if (byCode && byCode.length) return byCode[0].id
  const { data: byName } = await supabase
    .from('admin_countries')
    .select('id')
    .or('name_en.ilike.Others,name_zh.ilike.其他')
    .limit(1)
  if (byName && byName.length) return byName[0].id
  const { data, error } = await supabase
    .from('admin_countries')
    .upsert({ name_zh: '其他', name_en: 'Others', code: 'others', logo_url: null, is_active: true, sort_order: 999 }, { onConflict: 'code' })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

async function ensureCountry(supabase: any, name: string) {
  if (!name) {
    return await ensureOthers(supabase)
  }
  const { data: found } = await supabase
    .from('admin_countries')
    .select('id, name_zh, name_en, code')
    .or(`name_en.ilike.${name},name_zh.ilike.${name}`)
    .limit(1)
  if (found && found.length) return found[0].id
  const MAP: Record<string, { zh: string, code: string }> = {
    'United Kingdom': { zh: '英国', code: 'gb' },
    'United States': { zh: '美国', code: 'us' },
    'China': { zh: '中国', code: 'cn' },
    'Japan': { zh: '日本', code: 'jp' },
    'Canada': { zh: '加拿大', code: 'ca' },
    'Germany': { zh: '德国', code: 'de' },
    'Netherlands': { zh: '荷兰', code: 'nl' },
    'Denmark': { zh: '丹麦', code: 'dk' },
    'Sweden': { zh: '瑞典', code: 'se' },
    'Kazakhstan': { zh: '哈萨克斯坦', code: 'kz' },
    'Philippines': { zh: '菲律宾', code: 'ph' },
    'India': { zh: '印度', code: 'in' },
    'Global': { zh: '全球', code: 'xx' }
  }
  const m = MAP[name] || { zh: name, code: await nextUnknownCode(supabase) }
  const logo_url = m.code !== 'xx' ? `https://flagcdn.com/w160/${m.code}.png` : null
  // Try match by code to avoid unique violation on code
  const { data: byCode } = await supabase
    .from('admin_countries')
    .select('id')
    .eq('code', m.code)
    .limit(1)
  if (byCode && byCode.length) return byCode[0].id
  const { data, error } = await supabase
    .from('admin_countries')
    .upsert({ name_zh: m.zh, name_en: name, code: m.code, logo_url, is_active: true, sort_order: 0 }, { onConflict: 'code' })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

function clipString(v: any, max: number): string | null {
  if (v == null) return null
  const s = String(v)
  if (s.length <= max) return s
  return s.slice(0, max)
}

function sanitizeTechPayload(payload: any) {
  payload.name_zh = clipString(payload.name_zh, 200) || ''
  payload.name_en = clipString(payload.name_en, 200) || ''
  if (payload.website_url != null) payload.website_url = clipString(payload.website_url, 500)
  if (payload.image_url != null) payload.image_url = clipString(payload.image_url, 500)
  if (payload.company_name_zh != null) payload.company_name_zh = clipString(payload.company_name_zh, 200)
  if (payload.company_name_en != null) payload.company_name_en = clipString(payload.company_name_en, 200)
  return payload
}

async function upsertWipoId(supabase: any, wipoId: string, techId: string) {
  if (!wipoId) return
  await supabase
    .from('wipo_technology_ids')
    .upsert({ wipo_id: wipoId, tech_id: techId }, { onConflict: 'wipo_id' })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const item = body?.item || {}
    const onDuplicate: 'skip' | 'overwrite' | undefined = body?.onDuplicate
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceRole)

    // Upload tech image
    let imageUrl: string | null = null
    if (item.technologyImageUrl) {
      try {
        const buf = await downloadBuffer(item.technologyImageUrl)
        const objectPath = `technologies/wipo/${item.id}.jpg`
        const { error: upErr } = await supabase.storage.from('images').upload(objectPath, buf, { contentType: 'image/jpeg', upsert: true })
        if (upErr) throw upErr
        const { data } = supabase.storage.from('images').getPublicUrl(objectPath)
        imageUrl = data.publicUrl
      } catch {}
    }

    // Ensure country
    const countryId = await ensureCountry(supabase, item.developedInCountry)

    // Company logo if missing
    let companyLogoUrl: string | null = null
    if (item.companyName) {
      try {
        const svg = generateCompanyLogoSVG(item.companyName, 256)
        const objectPath = `company-logos/generated-wipo-${Date.now()}-${Math.random().toString(36).slice(2)}.svg`
        const { error: upErr } = await supabase.storage.from('images').upload(objectPath, Buffer.from(svg), { contentType: 'image/svg+xml', upsert: false })
        if (!upErr) {
          const { data } = supabase.storage.from('images').getPublicUrl(objectPath)
          companyLogoUrl = data.publicUrl
        }
      } catch {}
    }

    // If no uploaded image, try fallback to subcategory default image
    const chosenSubcategoryId: string | undefined = body?.subcategory_id
    if (!imageUrl && chosenSubcategoryId) {
      try {
        const { data: sub } = await supabase
          .from('admin_subcategories')
          .select('default_tech_image_url')
          .eq('id', chosenSubcategoryId)
          .single()
        imageUrl = sub?.default_tech_image_url || null
      } catch {}
    }

    // Prepare english and chinese descriptions (client may send pre-processed; accept overrides)
    const description_en: string = body?.description_en || ''
    const description_zh: string = body?.description_zh || ''

    let payload: any = {
      name_zh: item.technologyNameCN || item.technologyNameEN || '',
      name_en: item.technologyNameEN || '',
      description_en,
      description_zh,
      image_url: imageUrl,
      company_logo_url: companyLogoUrl,
      website_url: item.companyWebsiteUrl || null,
      tech_source: 'self_developed',
      acquisition_method: 'wipo',
      category_id: body?.category_id,
      subcategory_id: body?.subcategory_id,
      custom_label: Array.isArray(item.customLabels) ? item.customLabels.slice(0,2).join('|') : (item.customLabels || ''),
      company_name_zh: item.companyName || '',
      company_name_en: item.companyName || '',
      is_active: true,
      company_country_id: countryId,
      review_status: 'published'
    }
    payload = sanitizeTechPayload(payload)

    const wipoId = String(item.id || '').trim()

    // 优先使用专用ID表查找已存在的技术
    let existingTechId: string | null = null
    if (wipoId) {
      const { data: mapped } = await supabase
        .from('wipo_technology_ids')
        .select('tech_id')
        .eq('wipo_id', wipoId)
        .maybeSingle()
      if (mapped?.tech_id) existingTechId = mapped.tech_id
    }

    // 兼容旧数据：退回到描述字段匹配
    if (!existingTechId && wipoId) {
      const { data: fallback } = await supabase
        .from('admin_technologies')
        .select('id')
        .ilike('description_en', `%ID: ${wipoId}%`)
        .limit(1)
      if (fallback && fallback.length) {
        existingTechId = fallback[0].id
        await upsertWipoId(supabase, wipoId, existingTechId)
      }
    }

    if (existingTechId) {
      if (onDuplicate === 'skip') {
        return NextResponse.json({ success: true, skipped: true, reason: 'duplicate', id: existingTechId })
      }
      const { error: upErr } = await supabase.from('admin_technologies').update(payload).eq('id', existingTechId)
      if (upErr) throw upErr
      await upsertWipoId(supabase, wipoId, existingTechId)
      return NextResponse.json({ success: true, id: existingTechId, updated: true })
    } else {
      const { data, error } = await supabase.from('admin_technologies').insert(payload).select('id').single()
      if (error) throw error
      await upsertWipoId(supabase, wipoId, data.id)
      return NextResponse.json({ success: true, id: data.id, updated: false })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 })
  }
}
