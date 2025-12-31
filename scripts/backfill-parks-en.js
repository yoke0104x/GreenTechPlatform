#!/usr/bin/env node
/**
 * Backfill English fields for public.parks using an LLM translator (OpenRouter).
 *
 * Usage:
 *   # dry run (default)
 *   node scripts/backfill-parks-en.js --limit 10
 *
 *   # execute updates
 *   node scripts/backfill-parks-en.js --limit 50 --execute
 *
 * Required env:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENROUTER_API_KEY
 *
 * Optional env:
 *   OPENROUTER_MODEL (default: openai/gpt-4o-mini)
 *   OPENROUTER_SITE_URL (optional)
 *   OPENROUTER_APP_NAME (optional)
 *   DRY_RUN=true|false
 */

const { createClient } = require('@supabase/supabase-js')

// Load env from .env.local for standalone Node scripts (Next.js loads this automatically, but node does not).
try {
  // Allow overriding via DOTENV_CONFIG_PATH, default to .env.local
  require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env.local' })
} catch {
  // ignore
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini'
const OPENROUTER_SITE_URL = process.env.OPENROUTER_SITE_URL
const OPENROUTER_APP_NAME = process.env.OPENROUTER_APP_NAME
const OPENROUTER_MAX_TOKENS = Number(process.env.OPENROUTER_MAX_TOKENS || '2048')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!OPENROUTER_API_KEY) {
  console.error('Missing env: OPENROUTER_API_KEY')
  process.exit(1)
}

const args = process.argv.slice(2)
const arg = (name, def = undefined) => {
  const idx = args.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`))
  if (idx === -1) return def
  const val = args[idx]
  if (val.includes('=')) return val.split('=')[1]
  const next = args[idx + 1]
  if (next === undefined) return true
  if (String(next).startsWith('--')) return true
  return next
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const isChinese = (s = '') => /[\u4e00-\u9fff]/.test(String(s))
const isBlank = (v) => v === null || v === undefined || String(v).trim() === ''

const executeFlag = arg('execute', false)
const EXECUTE = executeFlag === true || executeFlag === 'true'

const dryRunFlag = arg('dry-run', process.env.DRY_RUN ?? 'true')
const DRY_RUN = !EXECUTE && String(dryRunFlag) !== 'false'

const LIMIT = Number(arg('limit', '20'))
const OFFSET = Number(arg('offset', '0'))
const ALL = String(arg('all', 'false')) === 'true'
const BATCH_SIZE = Number(arg('batch-size', String(LIMIT || 50)))
const MAX_PAGES_RAW = arg('max-pages', ALL ? '999999' : '1')
const MAX_PAGES = Math.max(1, Number(MAX_PAGES_RAW || 1))
const FAILURE_LOG_PATH = String(
  arg('log-failures', process.env.BACKFILL_FAILURE_LOG || 'ref/parks-en-failures.jsonl'),
)
const SKIP_LOGGED_FAILURES = String(arg('skip-logged-failures', 'false')) === 'true'
const MAX_FAIL_LINES = Number(arg('max-failure-lines', process.env.MAX_FAILURE_LINES || '50000'))
const ONLY_MISSING = String(arg('only-missing', 'true')) !== 'false'
const MAX_ROWS = Number.isFinite(LIMIT) && LIMIT > 0 ? LIMIT : 20
const START = Number.isFinite(OFFSET) && OFFSET >= 0 ? OFFSET : 0
const PAGE_SIZE =
  Number.isFinite(BATCH_SIZE) && BATCH_SIZE > 0 ? BATCH_SIZE : MAX_ROWS

const FIELD_PAIRS = [
  ['name_zh', 'name_en'],
  ['city', 'city_en'],
  ['address', 'address_en'],
  ['leading_industries', 'leading_industries_en'],
  ['leading_companies', 'leading_companies_en'],
  ['alias', 'alias_en'],
  ['dialect', 'dialect_en'],
  ['climate', 'climate_en'],
  ['region_desc', 'region_desc_en'],
  ['nearby_airports', 'nearby_airports_en'],
  ['nearby_railway_stations', 'nearby_railway_stations_en'],
  ['famous_scenic_spots', 'famous_scenic_spots_en'],
  ['brief_zh', 'brief_en'],
]

function pickSourceForTranslation(row) {
  const source = {}
  for (const [zhKey] of FIELD_PAIRS) {
    const val = row[zhKey]
    if (!isBlank(val)) source[zhKey] = String(val).trim()
  }
  return source
}

function shouldTranslateField(row, zhKey, enKey) {
  const zhVal = row[zhKey]
  const enVal = row[enKey]
  if (isBlank(zhVal)) return false
  if (!ONLY_MISSING) return true
  if (isBlank(enVal)) return true
  // 如果英文列里仍有中文，视为未翻译
  if (isChinese(enVal)) return true
  return false
}

function buildMissingPlan(row) {
  const need = []
  for (const [zhKey, enKey] of FIELD_PAIRS) {
    if (shouldTranslateField(row, zhKey, enKey)) need.push([zhKey, enKey])
  }
  return need
}

async function openrouterTranslate(source, wantKeys) {
  const system = [
    'You are a professional English translator for a Chinese government/industrial park information portal.',
    'Translate the provided Chinese fields into natural, concise English.',
    'Keep proper nouns (company/park names) as standard translations; do not invent facts.',
    'Preserve numbers, units, URLs, and list separators; convert Chinese commas to English commas.',
    'Return ONLY a valid JSON object with the requested keys.',
  ].join('\n')

  const user = [
    `Translate these fields: ${wantKeys.join(', ')}`,
    'Input JSON:',
    JSON.stringify(source),
  ].join('\n')

  const headers = {
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  }
  if (OPENROUTER_SITE_URL) headers['HTTP-Referer'] = OPENROUTER_SITE_URL
  if (OPENROUTER_APP_NAME) headers['X-Title'] = OPENROUTER_APP_NAME

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      temperature: 0,
      max_tokens: Number.isFinite(OPENROUTER_MAX_TOKENS) ? OPENROUTER_MAX_TOKENS : 2048,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`OpenRouter error: ${res.status} ${res.statusText} ${text}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenRouter: empty response content')

  const jsonText = String(content)
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')

  const repairJson = (text) => {
    // Repair common invalid JSON output from LLMs: unescaped newlines/tabs inside strings.
    let out = ''
    let inString = false
    let escaped = false
    for (const ch of text) {
      if (escaped) {
        out += ch
        escaped = false
        continue
      }
      if (ch === '\\') {
        out += ch
        escaped = true
        continue
      }
      if (ch === '"') {
        out += ch
        inString = !inString
        continue
      }
      if (inString && (ch === '\n' || ch === '\r')) {
        out += '\\n'
        continue
      }
      if (inString && ch === '\t') {
        out += '\\t'
        continue
      }
      out += ch
    }
    return out
  }

  let parsed
  try {
    parsed = JSON.parse(jsonText)
  } catch (e) {
    try {
      parsed = JSON.parse(repairJson(jsonText))
    } catch {
      throw new Error(`OpenRouter: failed to parse JSON: ${jsonText.slice(0, 300)}`)
    }
  }

  if (!parsed || typeof parsed !== 'object') throw new Error('OpenRouter: invalid JSON object')
  return parsed
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  console.log('Backfill parks English fields:', {
    dryRun: DRY_RUN,
    limit: MAX_ROWS,
    offset: START,
    all: ALL,
    batchSize: PAGE_SIZE,
    maxPages: MAX_PAGES,
    onlyMissing: ONLY_MISSING,
    model: OPENROUTER_MODEL,
    failureLog: FAILURE_LOG_PATH,
    skipLoggedFailures: SKIP_LOGGED_FAILURES,
  })

  const loggedFailureIds = new Set()
  const maybeLoadFailureLog = () => {
    if (!SKIP_LOGGED_FAILURES) return
    try {
      const fs = require('fs')
      if (!fs.existsSync(FAILURE_LOG_PATH)) return
      const text = fs.readFileSync(FAILURE_LOG_PATH, 'utf8')
      const lines = text.split('\n').filter(Boolean)
      for (const line of lines) {
        try {
          const obj = JSON.parse(line)
          if (obj?.id) loggedFailureIds.add(String(obj.id))
        } catch {
          // ignore
        }
      }
      console.log(`Loaded ${loggedFailureIds.size} logged failure ids to skip.`)
    } catch (e) {
      console.warn('Failed to load failure log; continue without skipping.', e?.message || e)
    }
  }
  maybeLoadFailureLog()

  const appendFailureLog = (entry) => {
    try {
      const fs = require('fs')
      // Avoid unbounded local logs.
      if (fs.existsSync(FAILURE_LOG_PATH)) {
        const stats = fs.statSync(FAILURE_LOG_PATH)
        if (stats.size > 50 * 1024 * 1024) {
          console.warn('Failure log > 50MB, skip appending:', FAILURE_LOG_PATH)
          return
        }
      }
      // crude line-limit check
      if (MAX_FAIL_LINES && MAX_FAIL_LINES > 0 && fs.existsSync(FAILURE_LOG_PATH)) {
        const text = fs.readFileSync(FAILURE_LOG_PATH, 'utf8')
        const count = text.split('\n').filter(Boolean).length
        if (count >= MAX_FAIL_LINES) {
          console.warn(`Failure log reached MAX_FAIL_LINES=${MAX_FAIL_LINES}, skip appending.`)
          return
        }
      }
      fs.appendFileSync(FAILURE_LOG_PATH, `${JSON.stringify(entry)}\n`)
    } catch (e) {
      console.warn('Failed to append failure log:', e?.message || e)
    }
  }

  const selectFields = Array.from(
    new Set(['id', 'sort_rank', ...FIELD_PAIRS.flatMap(([a, b]) => [a, b])]),
  ).join(', ')

  let planned = 0
  let updated = 0
  let skipped = 0
  let failed = 0

  let offset = START
  let pages = 0
  let lastRowsLength = 0
  while (true) {
    pages++
    const pageStart = offset
    const pageEnd = offset + PAGE_SIZE - 1

    const { data: rows, error } = await supabase
      .from('parks')
      .select(selectFields)
      // Match H5 “默认排序”：按 sort_rank 从小到大（未设置的排在后面），再按 id 稳定排序
      .order('sort_rank', { ascending: true, nullsFirst: false })
      .order('id', { ascending: true })
      .range(pageStart, pageEnd)

    if (error) throw error
    if (!rows || rows.length === 0) {
      console.log('No rows found.')
      break
    }
    lastRowsLength = rows.length

    for (const row of rows) {
      if (SKIP_LOGGED_FAILURES && loggedFailureIds.has(String(row.id))) {
        skipped++
        continue
      }

      const needPairs = buildMissingPlan(row)
      if (needPairs.length === 0) {
        skipped++
        continue
      }

      planned++
      const wantKeys = needPairs.map(([, enKey]) => enKey)
      const source = pickSourceForTranslation(row)

      console.log(`\n[${row.id}] need: ${wantKeys.join(', ')}`)

      try {
        const translated = await openrouterTranslate(source, wantKeys)

        const patch = {}
        for (const [zhKey, enKey] of needPairs) {
          const current = row[enKey]
          const out = translated[enKey]
          if (isBlank(out)) continue
          if (ONLY_MISSING && !isBlank(current) && !isChinese(current)) continue
          // normalize separators
          patch[enKey] = String(out).replace(/，/g, ',').trim()
        }

        const patchKeys = Object.keys(patch)
        if (patchKeys.length === 0) {
          console.log('No effective changes after translation; skipping.')
          skipped++
          continue
        }

        if (DRY_RUN) {
          console.log('DRY-RUN patch:', patch)
          updated++
          continue
        }

        const { error: upErr } = await supabase
          .from('parks')
          .update(patch)
          .eq('id', row.id)

        if (upErr) throw upErr
        updated++
        console.log('Updated:', patchKeys.join(', '))

        // throttle to be nice with rate limits
        await sleep(250)
      } catch (e) {
        failed++
        const message = e?.message || String(e)
        console.warn('Failed:', message)
        const isPayment = /402\s+Payment Required/.test(message) || /requires more credits/i.test(message)
        appendFailureLog({
          at: new Date().toISOString(),
          id: row.id,
          sort_rank: row.sort_rank ?? null,
          pageStart,
          pageEnd,
          need: wantKeys,
          errorType: isPayment ? 'OPENROUTER_402' : 'OPENROUTER_ERROR',
          message: String(message).slice(0, 500),
        })
        await sleep(500)
      }
    }

    if (!ALL) break
    if (rows.length < PAGE_SIZE) break
    if (pages >= MAX_PAGES) break
    offset += PAGE_SIZE
  }

  const nextOffset =
    ALL && pages >= MAX_PAGES && lastRowsLength === PAGE_SIZE
      ? offset + PAGE_SIZE
      : null

  console.log('\nDone:', { planned, updated, skipped, failed, pages, nextOffset })
}

main().catch((e) => {
  console.error('Fatal:', e?.message || e)
  process.exit(1)
})
