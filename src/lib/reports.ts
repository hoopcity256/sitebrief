import { supabase } from './supabase'
import type { Database } from './database.types'

type ReportRow = Database['public']['Tables']['reports']['Row']
type ReportUpdate = Database['public']['Tables']['reports']['Update']

/** Must be called instead of direct INSERT — one-shot from button click */
export async function createReport(projectId: string) {
  const { data, error } = await supabase
    .rpc('create_report', { p_project_id: projectId })
  if (error) throw error
  const row = data?.[0]
  if (!row) throw new Error('create_report returned no row')
  return row as { report_id: string; report_number: number }
}

export async function getReport(reportId: string): Promise<ReportRow> {
  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .single()
  if (error) throw error
  return data
}

export async function listReportsForProject(projectId: string) {
  const { data, error } = await supabase
    .from('reports')
    .select('id, report_number, is_draft, created_at, generated_at')
    .eq('project_id', projectId)
    .order('report_number', { ascending: false })
  if (error) throw error
  return data ?? []
}

/**
 * Saves draft content and returns the server-acknowledged updated_at.
 * The caller uses this to compare against the local draft revision
 * for stale-save protection.
 */
export async function updateReport(
  reportId: string,
  patch: Pick<ReportUpdate, 'work_completed' | 'problems' | 'next_steps' | 'is_draft'>
): Promise<{ updated_at: string }> {
  const { data, error } = await supabase
    .from('reports')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', reportId)
    .select('updated_at')
    .single()
  if (error) throw error
  if (!data) throw new Error('Report not found or not authorized')
  return { updated_at: data.updated_at }
}

export async function listPhotosForReport(reportId: string) {
  const { data, error } = await supabase
    .from('report_photos')
    .select('id, storage_path, display_order')
    .eq('report_id', reportId)
    .order('display_order', { ascending: true })
  if (error) throw error
  return data ?? []
}
