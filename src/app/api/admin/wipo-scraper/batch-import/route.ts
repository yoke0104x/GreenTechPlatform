import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

// Env for Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

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
  // Try find by code 'others' first
  const { data: byCode } = await supabase.from('admin_countries').select('id').eq('code', 'others').limit(1)
  if (byCode && byCode.length) return byCode[0].id
  // Try by names
  const { data: byName } = await supabase
    .from('admin_countries')
    .select('id')
    .or('name_en.ilike.Others,name_zh.ilike.其他')
    .limit(1)
  if (byName && byName.length) return byName[0].id
  // Create
  const { data, error } = await supabase
    .from('admin_countries')
    .upsert({ name_zh: '其他', name_en: 'Others', code: 'others', logo_url: null, is_active: true, sort_order: 999 }, { onConflict: 'code' })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

async function ensureCountry(supabase: any, name: string | undefined) {
  if (!name) {
    // No country captured, classify as Others
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
  // Before insert, also try match by code to avoid unique conflicts
  const { data: byCode } = await supabase
    .from('admin_countries')
    .select('id')
    .eq('code', m.code)
    .limit(1)
  if (byCode && byCode.length) return byCode[0].id
  // Use upsert on code to guarantee idempotency
  const { data, error } = await supabase
    .from('admin_countries')
    .upsert({ name_zh: m.zh, name_en: name, code: m.code, logo_url, is_active: true, sort_order: 0 }, { onConflict: 'code' })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

async function ensureCategoryIds(supabase: any, catNameZh: string, subNameZh: string) {
  const { data: cats } = await supabase
    .from('admin_categories')
    .select('id, name_zh')
    .ilike('name_zh', catNameZh)
  const category = (cats || [])[0]
  if (!category) throw new Error(`Category not found: ${catNameZh}`)
  const { data: subs } = await supabase
    .from('admin_subcategories')
    .select('id, name_zh, category_id')
    .eq('category_id', category.id)
    .ilike('name_zh', subNameZh)
  const sub = (subs || [])[0]
  if (!sub) throw new Error(`Subcategory not found under ${catNameZh}: ${subNameZh}`)
  return { category_id: category.id, subcategory_id: sub.id }
}

function clipString(v: any, max: number): string | null {
  if (v == null) return null
  const s = String(v)
  if (s.length <= max) return s
  return s.slice(0, max)
}

function sanitizeTechPayload(payload: any) {
  // DB constraints based on schema docs
  payload.name_zh = clipString(payload.name_zh, 200) || ''
  payload.name_en = clipString(payload.name_en, 200) || ''
  if (payload.website_url != null) payload.website_url = clipString(payload.website_url, 500)
  if (payload.image_url != null) payload.image_url = clipString(payload.image_url, 500)
  // Company names are often short but clip to be safe
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

async function findExistingTechIdByWipoId(supabase: any, wipoId: string) {
  if (!wipoId) return null
  const { data: mapped, error: mapErr } = await supabase
    .from('wipo_technology_ids')
    .select('tech_id')
    .eq('wipo_id', wipoId)
    .maybeSingle()
  if (mapErr && mapErr.code !== 'PGRST116') throw mapErr
  if (mapped?.tech_id) return mapped.tech_id

  // 兼容旧数据：回退到描述模糊匹配
  const { data: fallback, error } = await supabase
    .from('admin_technologies')
    .select('id')
    .ilike('description_en', `%ID: ${wipoId}%`)
    .limit(1)
  if (error) throw error
  if (fallback && fallback.length) {
    await upsertWipoId(supabase, wipoId, fallback[0].id)
    return fallback[0].id
  }
  return null
}

interface ProcessedItem {
  id: string
  technologyNameEN?: string
  technologyNameCN?: string
  companyName?: string
  publishedDate?: string
  updatedDate?: string
  companyWebsiteUrl?: string
  technologyImageUrl?: string
  description_en: string
  description_zh: string
  developedInCountry?: string
  deployedInCountry?: string[]
  technologyReadinessLevel?: string
  intellectualProperty?: string
  customLabels?: string[]
  technologyCategory?: string
  subCategory?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const items: ProcessedItem[] = body?.items || []
    const supabase = createClient(supabaseUrl, supabaseKey)
    const selectedCategoryIdFromClient: string | undefined = body?.category_id
    const selectedSubcategoryIdFromClient: string | undefined = body?.subcategory_id
    const onDuplicate: 'skip' | 'overwrite' | undefined = body?.onDuplicate
    const decisions: Record<string, 'skip' | 'overwrite'> | undefined = body?.decisions
    
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: '无效的数据格式或空数据' }, { status: 400 })
    }
    
    console.log(`📦 开始批量导入，共 ${items.length} 条记录`)
    
    const results: any[] = []
    const errors: any[] = []

    // Try resolve default category/subcategory for Wind under Clean Energy
    let defaultCategoryId: string | null = null
    let defaultSubcategoryId: string | null = null
    if (!selectedCategoryIdFromClient || !selectedSubcategoryIdFromClient) {
      try {
        const ids = await ensureCategoryIds(supabase, '清洁能源技术', '风能技术')
        defaultCategoryId = ids.category_id
        defaultSubcategoryId = ids.subcategory_id
      } catch (e) {
        console.warn('Category resolution failed; proceeding without category:', (e as any)?.message || e)
      }
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const progress = `${i + 1}/${items.length}`
      
      try {
        console.log(`💾 正在导入 (${progress}) ID=${item.id}`)

        const wipoId = String(item.id || '').trim()
        // Upload tech image to storage (best-effort)
        let imageUrl: string | null = null
        if (item.technologyImageUrl) {
          try {
            const buf = await downloadBuffer(item.technologyImageUrl)
            const objectPath = `technologies/wipo/${item.id}.jpg`
            const { error: upErr } = await supabase.storage
              .from('images')
              .upload(objectPath, buf, { contentType: 'image/jpeg', upsert: true })
            if (upErr) throw upErr
            const { data } = supabase.storage.from('images').getPublicUrl(objectPath)
            imageUrl = data.publicUrl
          } catch (e) {
            console.warn(`⚠️ 图片上传失败 ID=${item.id}:`, (e as any)?.message || e)
          }
        }

        // Ensure (developed) country exists and get id
        const countryId = await ensureCountry(supabase, item.developedInCountry)

        // Generate company logo (best-effort)
        let companyLogoUrl: string | null = null
        if (item.companyName) {
          try {
            const svg = generateCompanyLogoSVG(item.companyName, 256)
            const objectPath = `company-logos/generated-wipo-${Date.now()}-${Math.random().toString(36).slice(2)}.svg`
            const { error: upErr } = await supabase.storage
              .from('images')
              .upload(objectPath, Buffer.from(svg), { contentType: 'image/svg+xml', upsert: false })
            if (!upErr) {
              const { data } = supabase.storage.from('images').getPublicUrl(objectPath)
              companyLogoUrl = data.publicUrl
            }
          } catch {}
        }

        // Determine chosen category/subcategory and try subcategory default image when missing
        const chosenCategoryId = (selectedCategoryIdFromClient || defaultCategoryId) || null
        const chosenSubcategoryId = (selectedSubcategoryIdFromClient || defaultSubcategoryId) || null
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

        // Build payload (aligned to single import route and previous script)
        let payload: any = {
          name_zh: String(item.technologyNameCN || item.technologyNameEN || ''),
          name_en: String(item.technologyNameEN || ''),
          description_en: String(item.description_en || ''),
          description_zh: String(item.description_zh || ''),
          image_url: imageUrl,
          company_logo_url: companyLogoUrl,
          website_url: item.companyWebsiteUrl || null,
          tech_source: 'self_developed',
          acquisition_method: 'wipo',
          category_id: chosenCategoryId,
          subcategory_id: chosenSubcategoryId,
          custom_label: Array.isArray(item.customLabels) ? item.customLabels.slice(0,2).join('|') : (item.customLabels || ''),
          company_name_zh: item.companyName || '',
          company_name_en: item.companyName || '',
          is_active: true,
          company_country_id: countryId,
          review_status: 'published'
        }
        // Enforce DB length constraints to avoid "value too long" errors
        payload = sanitizeTechPayload(payload)

        const existingTechId = await findExistingTechIdByWipoId(supabase, wipoId)
        if (existingTechId) {
          const targetId = existingTechId
          const { data: existingMeta } = await supabase
            .from('admin_technologies')
            .select('image_url')
            .eq('id', targetId)
            .maybeSingle()
          const decision = decisions?.[String(item.id)] || onDuplicate || 'overwrite'
          if (decision === 'skip') {
            results.push({ id: item.id, skipped: true, db_id: targetId, progress })
            await new Promise(r => setTimeout(r, 50))
            continue
          }
          const updateData = {
            name_zh: payload.name_zh,
            name_en: payload.name_en,
            description_en: payload.description_en,
            description_zh: payload.description_zh,
            website_url: payload.website_url,
            company_country_id: payload.company_country_id,
            company_name_zh: payload.company_name_zh,
            company_name_en: payload.company_name_en,
            image_url: existingMeta?.image_url || payload.image_url,
            company_logo_url: payload.company_logo_url || null,
            custom_label: payload.custom_label,
            category_id: payload.category_id,
            subcategory_id: payload.subcategory_id,
          }
          const { error: upErr } = await supabase
            .from('admin_technologies')
            .update(updateData)
            .eq('id', targetId)
          if (upErr) throw upErr
          await upsertWipoId(supabase, wipoId, targetId)
          results.push({ id: item.id, updated: true, db_id: targetId, progress })
        } else {
          const { data, error } = await supabase
            .from('admin_technologies')
            .insert(payload)
            .select('id')
            .single()
          if (error) throw error
          await upsertWipoId(supabase, wipoId, data.id)
          results.push({ id: item.id, created: true, db_id: data.id, progress })
        }
        
        // Small delay to prevent rate limiting
        await new Promise(r => setTimeout(r, 100))
        
      } catch (itemError: any) {
        console.error(`❌ 处理错误 (${progress}) ID=${item.id}:`, itemError)
        console.error('Item data:', item)
        errors.push({
          id: item.id,
          error: itemError.message || itemError.toString() || 'Unknown processing error',
          stack: itemError.stack,
          progress
        })
      }
    }
    
    const successCount = results.length
    const errorCount = errors.length
    
    console.log(`🎉 批量导入完成: 成功 ${successCount} 条, 失败 ${errorCount} 条`)
    
    return NextResponse.json({ 
      success: true,
      summary: {
        total: items.length,
        successful: successCount,
        failed: errorCount
      },
      results,
      errors,
      message: `批量导入完成: 成功 ${successCount} 条, 失败 ${errorCount} 条`
    })
    
  } catch (e: any) {
    console.error(`❌ 批量导入失败:`, e)
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 })
  }
}
