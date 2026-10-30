/**
 * Supabase Cloud Database Client & Multi-Tenancy RLS Client
 * Provides seamless connection to Supabase PostgreSQL with x-tenant-id RLS header scoping
 * and graceful offline-first fallback when environment credentials are not configured.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.length > 20
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    })
  : null;

/**
 * Creates or returns a Supabase client scoped with Tenant ID header for PostgreSQL RLS policies
 * (`current_setting('request.headers', true)::json->>'x-tenant-id'`)
 * @param {string} tenantId
 */
export function getTenantScopedClient(tenantId) {
  if (!isSupabaseConfigured || !tenantId) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true
    },
    global: {
      headers: {
        'x-tenant-id': tenantId
      }
    }
  });
}

/**
 * Fetches tenant-isolated applicants from Supabase `applicants` table (RLS enforced)
 * @param {string} tenantId
 * @returns {Promise<Array|null>}
 */
export async function fetchTenantApplicantsFromSupabase(tenantId) {
  const client = getTenantScopedClient(tenantId);
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('applicants')
      .select('*')
      .eq('org_id', tenantId)
      .order('created_at', { ascending: false });

    if (error || !Array.isArray(data)) return null;
    return data.map((row) => ({
      id: row.id,
      name: row.name,
      orgId: row.org_id,
      applyJobId: row.apply_job_id || 'dev',
      rawText: row.raw_text,
      analysis: row.analysis,
      isHumanVerified: Boolean(row.is_human_verified),
      reviewerNote: row.reviewer_note || '',
      analyzedAt: row.created_at
    }));
  } catch {
    return null;
  }
}

/**
 * Synchronizes tenant-isolated applicants to Supabase `applicants` table (RLS enforced)
 * @param {string} tenantId
 * @param {Array} applicants
 */
export async function syncTenantApplicantsToSupabase(tenantId, applicants = []) {
  const client = getTenantScopedClient(tenantId);
  if (!client || !Array.isArray(applicants) || applicants.length === 0) return false;

  try {
    const rows = applicants.map((app) => ({
      id: String(app.id),
      org_id: tenantId,
      name: app.name,
      apply_job_id: app.applyJobId || 'dev',
      raw_text: app.rawText || '',
      analysis: app.analysis || {},
      is_human_verified: Boolean(app.isHumanVerified),
      reviewer_note: app.reviewerNote || ''
    }));

    const { error } = await client.from('applicants').upsert(rows, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}
