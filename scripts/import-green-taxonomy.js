#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

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

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function createCategory(name_zh, sort) {
  const payload = {
    name_zh,
    name_en: name_zh,
    slug: slugify(name_zh),
    sort_order: sort,
    is_active: true,
  }
  return await fetchJson(`${baseUrl}/api/admin/categories`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

async function createSubcategory(category_id, name_zh, sort) {
  const payload = {
    category_id,
    name_zh,
    name_en: name_zh,
    slug: slugify(name_zh),
    sort_order: sort,
    is_active: true,
  }
  return await fetchJson(`${baseUrl}/api/admin/subcategories`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

async function createTertiary(subcategory_id, name_zh, sort) {
  const payload = {
    subcategory_id,
    name_zh,
    name_en: name_zh,
    slug: slugify(name_zh),
    sort_order: sort,
    is_active: true,
  }
  return await fetchJson(`${baseUrl}/api/admin/tertiary-categories`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

async function createQuaternary(tertiary_id, name_zh, sort, industries) {
  const mappings = industries.length
    ? industries.map(industry => ({
        code: industry.code || '0000',
        name: industry.name || name_zh,
      }))
    : [{ code: '0000', name: name_zh }]

  const payload = {
    tertiary_category_id: tertiary_id,
    name_zh,
    name_en: name_zh,
    slug: slugify(name_zh),
    sort_order: sort,
    is_active: true,
    national_economy_mappings: mappings,
  }
  return await fetchJson(`${baseUrl}/api/admin/quaternary-categories`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

async function run() {
  const file = path.resolve(__dirname, '..', 'data', 'green-taxonomy.json')
  const content = fs.readFileSync(file, 'utf8')
  const data = JSON.parse(content)

  let primaryIndex = 0
  for (const primary of data.taxonomy || []) {
    primaryIndex += 1
    console.log(`Creating primary category ${primaryIndex}: ${primary.name}`)
    const category = await createCategory(primary.name, primaryIndex)

    let secondaryIndex = 0
    for (const secondary of primary.children || []) {
      secondaryIndex += 1
      console.log(`  Creating subcategory ${primaryIndex}.${secondaryIndex} ${secondary.name}`)
      const sub = await createSubcategory(category.id, secondary.name, secondaryIndex)

      let tertiaryIndex = 0
      for (const tertiary of secondary.children || []) {
        tertiaryIndex += 1
        console.log(`    Creating tertiary ${primaryIndex}.${secondaryIndex}.${tertiaryIndex} ${tertiary.name}`)
        const t3 = await createTertiary(sub.id, tertiary.name, tertiaryIndex)

        let quaternaryIndex = 0
        for (const quaternary of tertiary.children || []) {
          quaternaryIndex += 1
          const industries = quaternary.industries && quaternary.industries.length > 0
            ? quaternary.industries
            : [{ code: null, name: quaternary.name }]
          console.log(`      Creating quaternary ${primaryIndex}.${secondaryIndex}.${tertiaryIndex}.${quaternaryIndex} ${quaternary.name} (mappings: ${industries.length})`)
          await createQuaternary(t3.id, quaternary.name, quaternaryIndex, industries)
        }
      }
    }
  }

  console.log('Import completed successfully.')
}

run().catch(err => {
  console.error('Import failed:', err)
  process.exit(1)
})
