#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qpeanozckghazlzzhrni.supabase.co'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwZWFub3pja2doYXpsenpocm5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDI4NTg1MCwiZXhwIjoyMDY5ODYxODUwfQ.wE2j1kNbMKkQgZSkzLR7z6WFft6v90VfWkSd5SBi2P8'

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const OLD_CATEGORY_SLUGS = ['energy-saving', 'clean-energy', 'clean-production', 'new-energy-vehicle']

async function resetTechnologyCategories() {
  console.log('Resetting technology category references...')
  const payload = {
    category_id: null,
    subcategory_id: null,
    tertiary_category_id: null,
    quaternary_category_id: null,
  }
  const { error } = await supabase
    .from('admin_technologies')
    .update(payload)
    .neq('id', '')
  if (error) throw new Error(`Failed to reset technologies: ${error.message}`)
  console.log('  ✓ All technologies now detached from old categories.')
}

async function deleteByIds(table, column, ids, label) {
  if (!ids.length) return
  console.log(`  Deleting ${label} (${ids.length})...`)
  const { error } = await supabase
    .from(table)
    .delete()
    .in(column, ids)
  if (error) throw new Error(`Failed to delete ${label}: ${error.message}`)
}

async function removeOldCategories() {
  console.log('Removing legacy taxonomy (energy-saving / clean-energy / clean-production / new-energy-vehicle)...')
  const { data: categories, error: catError } = await supabase
    .from('admin_categories')
    .select('id, slug')
    .in('slug', OLD_CATEGORY_SLUGS)
  if (catError) throw new Error(`Failed to load old categories: ${catError.message}`)
  if (!categories?.length) {
    console.log('  No legacy categories were found. Skipping removal.')
    return
  }
  const categoryIds = categories.map(c => c.id)

  const { data: subcategories, error: subError } = await supabase
    .from('admin_subcategories')
    .select('id')
    .in('category_id', categoryIds)
  if (subError) throw new Error(`Failed to load subcategories: ${subError.message}`)
  const subcategoryIds = (subcategories || []).map(s => s.id)

  const { data: tertiary, error: t3Error } = await supabase
    .from('admin_tertiary_categories')
    .select('id')
    .in('subcategory_id', subcategoryIds)
  if (t3Error) throw new Error(`Failed to load tertiary categories: ${t3Error.message}`)
  const tertiaryIds = (tertiary || []).map(t => t.id)

  const { data: quaternary, error: t4Error } = await supabase
    .from('admin_quaternary_categories')
    .select('id')
    .in('tertiary_category_id', tertiaryIds)
  if (t4Error) throw new Error(`Failed to load quaternary categories: ${t4Error.message}`)
  const quaternaryIds = (quaternary || []).map(q => q.id)

  await deleteByIds('admin_quaternary_categories', 'id', quaternaryIds, 'quaternary categories')
  await deleteByIds('admin_tertiary_categories', 'id', tertiaryIds, 'tertiary categories')
  await deleteByIds('admin_subcategories', 'id', subcategoryIds, 'subcategories')
  await deleteByIds('admin_categories', 'id', categoryIds, 'top-level categories')
  console.log('  ✓ Legacy taxonomy removed.')
}

async function run() {
  await resetTechnologyCategories()
  await removeOldCategories()
  console.log('Cleanup completed successfully.')
}

run().catch(err => {
  console.error('Cleanup failed:', err)
  process.exit(1)
})
