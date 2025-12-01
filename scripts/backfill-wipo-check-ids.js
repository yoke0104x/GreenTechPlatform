#!/usr/bin/env node
/**
 * Backfill WIPO IDs into mapping table by calling the Next.js endpoint.
 * - Reads all `admin_technologies` rows where acquisition_method = 'wipo'
 * - Extracts WIPO IDs from description_en like "ID: <id>"
 * - Calls /api/admin/wipo-scraper/check-ids in batches to trigger the upsert logic
 *
 * Usage:
 *   node scripts/backfill-wipo-check-ids.js
 *
 * Requirements:
 * - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set in env
 * - Local Next.js server running and reachable at API_BASE (default http://localhost:3000)
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
const dotenv = require('dotenv')

// Load env from .env first, then .env.local (non-overriding) to pick up local dev credentials
dotenv.config()
dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const apiBase = process.env.API_BASE || 'http://localhost:3000'
const BATCH_SIZE = 200

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

function extractWipoId(description) {
  if (!description) return null
  const m = String(description).match(/ID:\s*([0-9A-Za-z_-]+)/i)
  return m ? m[1].trim() : null
}

async function collectWipoIds() {
  const PAGE = 1000
  let from = 0
  let to = PAGE - 1
  const ids = new Set()
  for (;;) {
    const { data, error } = await supabase
      .from('admin_technologies')
      .select('id, description_en')
      .eq('acquisition_method', 'wipo')
      .range(from, to)
    if (error) throw error
    if (!data || !data.length) break
    for (const row of data) {
      const extracted = extractWipoId(row.description_en)
      if (extracted) ids.add(extracted)
    }
    if (data.length < PAGE) break
    from += PAGE
    to += PAGE
  }
  return Array.from(ids)
}

async function postCheckIds(ids) {
  const res = await fetch(`${apiBase}/api/admin/wipo-scraper/check-ids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids })
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`check-ids failed ${res.status}: ${text}`)
  }
  return res.json()
}

async function main() {
  console.log('Collecting WIPO IDs from admin_technologies (acquisition_method = wipo)...')
  const allIds = await collectWipoIds()
  console.log(`Collected ${allIds.length} candidate IDs`)
  if (!allIds.length) return

  let totalExisting = 0
  let totalMissing = 0
  let batchNo = 0
  for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
    const batch = allIds.slice(i, i + BATCH_SIZE)
    batchNo += 1
    console.log(`Batch ${batchNo}: sending ${batch.length} IDs to /api/admin/wipo-scraper/check-ids`)
    const res = await postCheckIds(batch)
    const existing = Array.isArray(res.existingIds) ? res.existingIds.length : 0
    const missing = Array.isArray(res.missingIds) ? res.missingIds.length : 0
    totalExisting += existing
    totalMissing += missing
    if (missing) {
      console.log(`  Missing in this batch: ${res.missingIds.join(', ')}`)
    }
    await new Promise(r => setTimeout(r, 100)) // small gap to avoid bursts
  }
  console.log(`Done. Existing mapped: ${totalExisting}, Missing after check: ${totalMissing}`)
}

// Ensure fetch is available (Node 18+); fallback to dynamic import if needed
if (typeof fetch === 'undefined') {
  global.fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args))
}

main().catch(err => {
  console.error('Backfill failed:', err)
  process.exit(1)
})
