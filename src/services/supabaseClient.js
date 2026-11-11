/**
 * Supabase Cloud Database Client & Multi-Tenancy RLS / Realtime Bridge
 * Connects to Supabase PostgreSQL + Realtime WebSocket when VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
 * are configured, and gracefully falls back to localStorage / BFF API Gateway polling when offline or unconfigured.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';
const isTestMode = import.meta.env?.MODE === 'test';

export const isSupabaseConfigured = Boolean(
  !isTestMode &&
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

const tenantClientsCache = new Map();

/**
 * Returns a Supabase client instance scoped with the `x-tenant-id` header for PostgreSQL RLS enforcement.
 * @param {string} tenantId
 */
export function getTenantScopedClient(tenantId = 'toss-payments') {
  if (!isSupabaseConfigured) return null;
  if (tenantClientsCache.has(tenantId)) {
    return tenantClientsCache.get(tenantId);
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
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

  tenantClientsCache.set(tenantId, client);
  return client;
}

/**
 * Fetches tenant-scoped applicant evaluations from Supabase if configured and reachable.
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

    if (error || !Array.isArray(data) || data.length === 0) {
      return null;
    }

    return data.map((row) => ({
      ...(row.payload || {}),
      id: row.id,
      name: row.name,
      orgId: row.org_id || tenantId,
      applyJobId: row.apply_job_id || row.payload?.applyJobId || 'tech_backend',
      rawText: row.raw_text || row.payload?.rawText || '',
      analysis: row.analysis || row.payload?.analysis
    }));
  } catch {
    return null;
  }
}

/**
 * Upserts tenant-scoped applicants to Supabase in the background (non-blocking).
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
      name: app.name || '익명 지원자',
      apply_job_id: app.applyJobId || 'tech_backend',
      raw_text: app.rawText || '',
      analysis: app.analysis || {},
      payload: app,
      updated_at: new Date().toISOString()
    }));

    const { error } = await client.from('applicants').upsert(rows, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Subscribes to Supabase Realtime changes for multi-interviewer collaboration notes on a shared evaluation.
 * Returns a cleanup function.
 * @param {string} shareId
 * @param {(note: object) => void} onRemoteChange
 * @returns {() => void}
 */
export function subscribeCollaborationNotes(shareId, onRemoteChange) {
  if (!supabase || !shareId) {
    return () => {};
  }

  try {
    const channel = supabase
      .channel(`collab_notes_${shareId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'interview_collaborations',
          filter: `share_id=eq.${shareId}`
        },
        (payload) => {
          if (onRemoteChange) {
            onRemoteChange(payload);
          }
        }
      )
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {
        // ignore cleanup errors
      }
    };
  } catch {
    return () => {};
  }
}
