import type { SupabaseClient } from '@supabase/supabase-js'
import type { NextResponse } from 'next/server'
import { NextResponse as NextResponseImpl } from 'next/server'
import type { CustomUser } from '@/lib/custom-auth'
import { serviceSupabase } from '@/app/api/_utils/auth'

export function requireServiceSupabase(): SupabaseClient | NextResponse {
  if (!serviceSupabase) {
    return NextResponseImpl.json(
      { success: false, error: 'Supabase service client not configured' },
      { status: 500 }
    )
  }
  return serviceSupabase
}

export function mapCustomUser(row: any): CustomUser {
  return {
    id: row.id,
    phone: row.phone || '',
    countryCode: row.country_code || '+86',
    name: row.name,
    email: row.email,
    role: row.role,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
    isActive: row.is_active,
    userMetadata: row.user_metadata || {},
  }
}

export async function fetchCustomUserById(
  supabase: SupabaseClient,
  userId: string
): Promise<CustomUser | null> {
  const { data, error } = await supabase
    .from('custom_users')
    .select('*')
    .eq('id', userId)
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  return mapCustomUser(data)
}

