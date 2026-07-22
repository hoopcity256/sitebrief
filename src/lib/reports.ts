import { supabase } from './supabase'
import type { Database } from './database.types'

type ReportRow = Database['public']['Tables']['reports']['Row']

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
 * Constructs the update payload explicitly — never spreads the input
 * so that unexpected fields like id, user_id, project_id, report_number
 * are never sent to the database.
 */
export async function updateReport(
  reportId: string,
  patch: { work_completed?: string; problems?: string; next_steps?: string; is_draft?: boolean }
): Promise<{ updated_at: string }> {
  type ReportUpdate = Database['public']['Tables']['reports']['Update']
  const updateObj: ReportUpdate = {
    updated_at: new Date().toISOString(),
  }
  if (patch.work_completed !== undefined) updateObj.work_completed = patch.work_completed
  if (patch.problems !== undefined) updateObj.problems = patch.problems
  if (patch.next_steps !== undefined) updateObj.next_steps = patch.next_steps
  if (patch.is_draft !== undefined) updateObj.is_draft = patch.is_draft

  const { data, error } = await supabase
    .from('reports')
    .update(updateObj)
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
