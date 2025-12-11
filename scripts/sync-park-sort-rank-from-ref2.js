// 同步国家级经开区在 parks 表中的排序顺位
// 使用 /ref/2.md 中的 233 家排名，为 level = '国家级经济技术开发区' 的园区写入 sort_rank（从 0 开始）

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://qpeanozckghazlzzhrni.supabase.co'
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwZWFub3pja2doYXpsenpocm5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI4NTg1MCwiZXhwIjoyMDY5ODYxODUwfQ.wE2j1kNbMKkQgZSkzLR7z6WFft6v90VfWkSd5SBi2P8'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

function parseRanking() {
  const mdPath = path.join(process.cwd(), 'ref', '2.md')
  const raw = fs.readFileSync(mdPath, 'utf8')
  const lines = raw.split(/\r?\n/)
  const result = []
  for (const line of lines) {
    const m = line.match(/^\|\s*(\d+)\s*\|\s*(.+?)\s*\|/)
    if (!m) continue
    const rank = Number(m[1])
    const name = m[2].trim()
    if (!Number.isNaN(rank) && name) {
      result.push({ rank, name })
    }
  }
  return result
}

async function main() {
  const ranking = parseRanking()
  console.log(`从 /ref/2.md 解析到 ${ranking.length} 条排名记录`)

  const unmatched = []
  const multipleMatches = []

  for (const item of ranking) {
    const sortRank = item.rank - 1
    const name = item.name

    const { data, error } = await supabase
      .from('parks')
      .select('id, name_zh, level')
      .eq('level', '国家级经济技术开发区')
      .ilike('name_zh', `${name}%`)

    if (error) {
      console.error('查询失败:', name, error)
      unmatched.push({ name, reason: 'query_error', error })
      continue
    }

    if (!data || data.length === 0) {
      unmatched.push({ name, reason: 'no_match' })
      continue
    }

    if (data.length > 1) {
      multipleMatches.push({ name, matches: data.map((d) => d.name_zh) })
      continue
    }

    const park = data[0]
    const { error: updateError } = await supabase
      .from('parks')
      .update({ sort_rank: sortRank })
      .eq('id', park.id)

    if (updateError) {
      console.error('更新 sort_rank 失败:', name, updateError)
      unmatched.push({ name, reason: 'update_error', error: updateError })
    } else {
      console.log(`✅ ${item.rank} - ${name} -> park:${park.name_zh}, sort_rank=${sortRank}`)
    }
  }

  // 列出仍未设置 sort_rank 的国家级经开区
  const { data: remaining, error: remainingError } = await supabase
    .from('parks')
    .select('id, name_zh, level, sort_rank')
    .eq('level', '国家级经济技术开发区')
    .is('sort_rank', null)

  if (remainingError) {
    console.error('查询剩余未设置排序的园区失败:', remainingError)
  } else {
    console.log('\n⚠️  以下国家级经开区仍未设置 sort_rank（需要手动确认）：')
    for (const p of remaining || []) {
      console.log(`- ${p.name_zh}`)
    }
  }

  if (unmatched.length > 0 || multipleMatches.length > 0) {
    console.log('\n⚠️  排名表中匹配不到或匹配多条的名称（请手动处理）：')
    unmatched.forEach((u) => console.log(`- 未匹配: ${u.name} (${u.reason})`))
    multipleMatches.forEach((m) =>
      console.log(`- 多个匹配: ${m.name} -> [${m.matches.join(', ')}]`),
    )
  } else {
    console.log('\n🎉 所有排名记录已成功匹配并设置 sort_rank。')
  }
}

main().catch((e) => {
  console.error('脚本执行出错:', e)
  process.exit(1)
})

