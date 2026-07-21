// Thin service layer — no business logic in components (AGENTS.md rule 8)
import { supabase } from './supabase'
import type { Database } from './database.types'

type CompanyProfileInsert =
  Database['public']['Tables']['company_profiles']['Insert']

export async function getCompanyProfile(userId: string) {
  const { data, error } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data // null when no row exists
}

export async function upsertCompanyProfile(
  userId: string,
  payload: Omit<CompanyProfileInsert, 'user_id'>
) {
  const { data, error } = await supabase
    .from('company_profiles')
    .upsert({ user_id: userId, ...payload }, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw error
  return data
}
