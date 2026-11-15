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
 * Maps `applicants` + `evaluations` tables from infra/supabase_schema.sql.
 * @param {string} tenantId
 * @returns {Promise<Array|null>}
 */
export async function fetchTenantApplicantsFromSupabase(tenantId) {
  const client = getTenantScopedClient(tenantId);
  if (!client) return null;

  try {
    const [{ data: applicantsData, error: appErr }, { data: evalsData }] = await Promise.all([
      client
        .from('applicants')
        .select('id, tenant_id, job_id, name, raw_text, pii_masked_text, status, applied_at')
        .eq('tenant_id', tenantId)
        .order('applied_at', { ascending: false }),
      client
        .from('evaluations')
        .select('*')
        .eq('tenant_id', tenantId)
    ]);

    if (appErr || !Array.isArray(applicantsData) || applicantsData.length === 0) {
      return null;
    }

    const evalByApplicant = new Map();
    if (Array.isArray(evalsData)) {
      for (const ev of evalsData) {
        evalByApplicant.set(ev.applicant_id, ev);
      }
    }

    return applicantsData.map((row) => {
      const ev = evalByApplicant.get(row.id);
      return {
        id: row.id,
        name: row.name,
        orgId: row.tenant_id || tenantId,
        applyJobId: row.job_id || 'tech_backend',
        rawText: row.raw_text || '',
        piiMaskedText: row.pii_masked_text || '',
        appliedAt: row.applied_at,
        analysis: ev
          ? {
              summary: {
                totalScore: ev.total_score ?? 0,
                decision: ev.decision || 'HOLD',
                decisionReason: ev.decision_reason || '',
                aiTextProbability: ev.ai_text_probability ?? 0
              },
              competencyScores: ev.competency_scores || {},
              groundingEvidences: ev.grounding_evidences || [],
              interviewQuestions: ev.interview_questions || [],
              isHumanVerified: Boolean(ev.is_human_verified),
              reviewerNote: ev.reviewer_note || '',
              agentAuditMetadata: ev.agent_audit_metadata || null
            }
          : undefined
      };
    });
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
      tenant_id: tenantId,
      job_id: app.applyJobId || 'tech_backend',
      name: app.name || '익명 지원자',
      raw_text: app.rawText || '',
      pii_masked_text: app.piiMaskedText || app.rawText || '',
      status: app.analysis ? 'COMPLETED' : 'PENDING'
    }));

    const { error } = await client
      .from('applicants')
      .upsert(rows, { onConflict: 'id,tenant_id' });

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
