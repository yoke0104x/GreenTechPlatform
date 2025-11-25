#!/usr/bin/env node

const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000'

async function fetchJson(url, options) {
  const res = await fetch(url, {
    ...(options || {}),
    headers: {
      'Content-Type': 'application/json',
      ...((options && options.headers) || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Request failed: ${res.status} ${res.statusText} -> ${text}`)
  }
  return await res.json()
}

const OTHER_NAME_ZH = '其他'
const OTHER_NAME_EN = 'Others'

function findExistingOther(subcategories = []) {
  return subcategories.find(sub => {
    if (!sub) return false
    const zh = (sub.name_zh || '').trim()
    const en = (sub.name_en || '').trim().toLowerCase()
    const slug = (sub.slug || '').trim().toLowerCase()
    return zh === OTHER_NAME_ZH || en === OTHER_NAME_EN.toLowerCase() || slug.endsWith('-other') || slug.endsWith('-others')
  })
}

function nextSortOrder(subcategories = []) {
  if (!subcategories.length) return 1
  return Math.max(...subcategories.map(sub => sub.sort_order || 0)) + 1
}

async function createOtherSubcategory(category) {
  const payload = {
    category_id: category.id,
    name_zh: OTHER_NAME_ZH,
    name_en: OTHER_NAME_EN,
    slug: `${category.slug}-others`,
    sort_order: nextSortOrder(category.subcategories),
    is_active: true,
  }
  await fetchJson(`${baseUrl}/api/admin/subcategories`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  console.log(`  ✓ Added “其他” under ${category.name_zh}`)
}

async function run() {
  console.log('Fetching categories...')
  const categories = await fetchJson(`${baseUrl}/api/admin/categories`)
  const targets = (categories || []).filter(Boolean)

  for (const category of targets) {
    console.log(`Checking ${category.name_zh} (${category.slug})...`)
    const existing = findExistingOther(category.subcategories)
    if (existing) {
      console.log('  • 已存在“其他”，跳过。')
      continue
    }
    await createOtherSubcategory(category)
  }

  console.log('All categories processed.')
}

run().catch(err => {
  console.error('Script failed:', err)
  process.exit(1)
})
