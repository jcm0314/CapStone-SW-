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

    if (error) return false;

    // 평가 결과가 있는 지원자는 evaluations 테이블에도 동기화
    const evaluated = applicants.filter((app) => app.analysis?.summary);
    for (const app of evaluated) {
      const summary = app.analysis.summary || {};
      const evalPayload = {
        tenant_id: tenantId,
        applicant_id: String(app.id),
        total_score: Math.max(0, Math.min(100, Math.round(Number(summary.totalScore ?? 75)))),
        decision: ['STRONG_PASS', 'INTERVIEW', 'HOLD', 'REJECT'].includes(summary.decision)
          ? summary.decision
          : 'HOLD',
        decision_reason: summary.decisionReason || '',
        ai_text_probability: Math.round(Number(summary.aiTextProbability ?? 0)),
        competency_scores: app.analysis.competencyScores || {},
        grounding_evidences: app.analysis.groundingEvidences || [],
        interview_questions: app.analysis.interviewQuestions || [],
        is_human_verified: Boolean(app.isHumanVerified),
        reviewer_note: app.reviewerNote || null,
        agent_audit_metadata: app.agentMetadata || null
      };

      const { data: existingEval } = await client
        .from('evaluations')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('applicant_id', String(app.id))
        .limit(1);

      if (existingEval && existingEval.length > 0) {
        await client.from('evaluations').update(evalPayload).eq('id', existingEval[0].id);
      } else {
        await client.from('evaluations').insert(evalPayload);
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes a tenant-scoped applicant from Supabase (cascades to evaluations).
 * @param {string} tenantId
 * @param {string} applicantId
 */
export async function deleteTenantApplicantFromSupabase(tenantId, applicantId) {
  const client = getTenantScopedClient(tenantId);
  if (!client || !applicantId) return false;

  try {
    const { error } = await client
      .from('applicants')
      .delete()
      .eq('id', String(applicantId))
      .eq('tenant_id', tenantId);
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

/**
 * Fetches custom tenant workspaces from Supabase `tenants` table when configured.
 * @returns {Promise<Array>}
 */
export async function fetchTenantsFromSupabase() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, domain, plan, total_credit, used_credit, industry, created_at')
      .order('created_at', { ascending: false });

    if (error || !Array.isArray(data)) return [];
    return data.map((row) => ({
      id: row.id,
      name: row.name,
      domain: row.domain || '',
      plan: row.plan || 'Starter',
      totalCredit: row.total_credit ?? 50,
      usedCredit: row.used_credit ?? 0,
      industry: row.industry || '중소 · 벤처기업',
      isCustom: true,
      defaultApplicants: []
    }));
  } catch {
    return [];
  }
}

/**
 * Upserts a newly registered tenant workspace into Supabase `tenants` table.
 * @param {object} tenant
 * @returns {Promise<boolean>}
 */
export async function upsertTenantToSupabase(tenant) {
  if (!supabase || !tenant?.id || !tenant?.name) return false;
  try {
    const { error } = await supabase.from('tenants').upsert(
      {
        id: tenant.id,
        name: tenant.name,
        domain: tenant.domain || `${tenant.id}.local`,
        plan: tenant.plan || 'Starter',
        total_credit: tenant.totalCredit ?? 50,
        used_credit: tenant.usedCredit ?? 0,
        industry: tenant.industry || '중소 · 벤처기업'
      },
      { onConflict: 'id' }
    );
    return !error;
  } catch {
    return false;
  }
}
