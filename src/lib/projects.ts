import { supabase } from './supabase'
import type { Database } from './database.types'

type ProjectRow = Database['public']['Tables']['projects']['Row']

export type { ProjectRow }

export async function listProjects(userId: string): Promise<ProjectRow[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getProject(projectId: string): Promise<ProjectRow> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()
  if (error) throw error
  return data
}

export async function createProject(
  userId: string,
  payload: {
    name: string
    customer_name?: string
    address?: string
    customer_email?: string | null
    customer_phone?: string | null
  }
): Promise<ProjectRow> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      name: payload.name,
      customer_name: payload.customer_name ?? '',
      address: payload.address ?? '',
      customer_email: payload.customer_email ?? null,
      customer_phone: payload.customer_phone ?? null,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// Uses .select().single() to detect zero-row mutations.
// Supabase returns no error when an RLS-filtered UPDATE affects zero rows.
// The .single() call will throw if no row was returned.
export async function archiveProject(projectId: string): Promise<void> {
  const { data, error } = await supabase
    .from('projects')
    .update({ is_archived: true })
    .eq('id', projectId)
    .select()
    .single()
  if (error) throw error
  if (!data) throw new Error('Project not found or not authorized')
}
