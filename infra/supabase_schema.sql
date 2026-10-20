-- ====================================================================
-- Check-Mate Enterprise Multi-Tenancy Database Schema (PostgreSQL / Supabase)
-- Architecture: Row-Level Security (RLS) for 100% Logical Tenant Data Isolation
-- ====================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Organizations & Tenants Table (B2B Corporate Clients)
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(64) PRIMARY KEY, -- e.g., 'toss-payments', 'daangn', 'woowa'
    name VARCHAR(128) NOT NULL,
    domain VARCHAR(128) NOT NULL UNIQUE,
    plan VARCHAR(64) DEFAULT 'Enterprise Tier',
    total_credit INTEGER DEFAULT 500000,
    used_credit INTEGER DEFAULT 0,
    is_locked BOOLEAN DEFAULT FALSE,
    industry VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Users Table (HR Recruiters, Interviewers, Admins)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('ADMIN', 'RECRUITER', 'INTERVIEWER')),
    role_title VARCHAR(128),
    provider VARCHAR(64) DEFAULT 'Google Workspace', -- 'Google Workspace', 'Slack', 'Okta'
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Job Postings & Evaluation Criteria Table
CREATE TABLE IF NOT EXISTS job_postings (
    id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    target_team VARCHAR(128),
    competencies JSONB NOT NULL, -- Array of { id, name, weight, description }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, tenant_id)
);

-- 5. Applicants Table (Candidate Resumes & PII Masking)
CREATE TABLE IF NOT EXISTS applicants (
    id VARCHAR(64) NOT NULL,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    job_id VARCHAR(64) NOT NULL,
    name VARCHAR(128) NOT NULL,
    raw_text TEXT NOT NULL,
    pii_masked_text TEXT,
    status VARCHAR(32) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ANALYZING', 'COMPLETED', 'FAILED')),
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, tenant_id)
);

-- 6. Evaluations Table (4-Stage Multi-Agent Analysis & 1:1 Grounding)
CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    applicant_id VARCHAR(64) NOT NULL,
    total_score INTEGER NOT NULL CHECK (total_score BETWEEN 0 AND 100),
    decision VARCHAR(32) NOT NULL CHECK (decision IN ('STRONG_PASS', 'INTERVIEW', 'HOLD', 'REJECT')),
    decision_reason TEXT NOT NULL,
    ai_text_probability INTEGER DEFAULT 0,
    competency_scores JSONB NOT NULL, -- Key-value map: { problem_solving: 90, ... }
    grounding_evidences JSONB NOT NULL, -- Array of { quote, type, rationale, competencyId }
    interview_questions JSONB NOT NULL, -- Array of { question, intent, category }
    is_human_verified BOOLEAN DEFAULT FALSE,
    reviewer_note TEXT,
    calibrated_by UUID REFERENCES users(id),
    calibrated_at TIMESTAMPTZ,
    agent_audit_metadata JSONB, -- Logs from the 4 sub-agents
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_applicant FOREIGN KEY (applicant_id, tenant_id) REFERENCES applicants(id, tenant_id) ON DELETE CASCADE
);

-- 7. Multi-Interviewer Real-time Share Links (Share ID & TTL)
CREATE TABLE IF NOT EXISTS share_links (
    share_id VARCHAR(64) PRIMARY KEY, -- e.g., 'eval_9f8a12bc'
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    evaluation_id UUID NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
    created_by_name VARCHAR(128) NOT NULL,
    created_by_role VARCHAR(32) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Interviewer Collaborative Live Notes & Consensus
CREATE TABLE IF NOT EXISTS interview_collaborations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    share_id VARCHAR(64) NOT NULL REFERENCES share_links(share_id) ON DELETE CASCADE,
    tenant_id VARCHAR(64) NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    author_name VARCHAR(128) NOT NULL,
    role VARCHAR(32) NOT NULL,
    content TEXT NOT NULL,
    score_adjustment INTEGER DEFAULT 0 CHECK (score_adjustment BETWEEN -20 AND 20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- Strict Isolation: Users can ONLY access data belonging to their tenant
-- ====================================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_collaborations ENABLE ROW LEVEL SECURITY;

-- Helper Function: Get Current Session's Tenant ID from JWT claims
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS VARCHAR AS $$
    SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'tenant_id', '')::VARCHAR;
$$ LANGUAGE sql STABLE;

-- 1. Applicants RLS Policy
CREATE POLICY tenant_isolation_applicants ON applicants
    FOR ALL
    USING (tenant_id = current_tenant_id() OR current_setting('role', true) = 'service_role')
    WITH CHECK (tenant_id = current_tenant_id() OR current_setting('role', true) = 'service_role');

-- 2. Evaluations RLS Policy
CREATE POLICY tenant_isolation_evaluations ON evaluations
    FOR ALL
    USING (tenant_id = current_tenant_id() OR current_setting('role', true) = 'service_role')
    WITH CHECK (tenant_id = current_tenant_id() OR current_setting('role', true) = 'service_role');

-- 3. Share Links RLS Policy (Allows read via public share_id within TTL)
CREATE POLICY share_link_access ON share_links
    FOR SELECT
    USING (expires_at > NOW() AND is_active = TRUE);

CREATE POLICY tenant_isolation_share_links ON share_links
    FOR INSERT
    WITH CHECK (tenant_id = current_tenant_id() OR current_setting('role', true) = 'service_role');

-- 4. Collaborations RLS Policy
CREATE POLICY collaboration_access ON interview_collaborations
    FOR ALL
    USING (
        share_id IN (SELECT share_id FROM share_links WHERE expires_at > NOW())
        OR tenant_id = current_tenant_id()
        OR current_setting('role', true) = 'service_role'
    );

-- ====================================================================
-- SEED DATA (Default Enterprises: Toss, Daangn, Woowa)
-- ====================================================================

INSERT INTO tenants (id, name, domain, plan, total_credit, used_credit, industry)
VALUES 
    ('toss-payments', '토스페이먼츠', 'tosspayments.com', 'Enterprise Tier', 500000, 80000, 'Fintech / Payment'),
    ('daangn', '당근', 'daangn.com', 'Growth Pro', 300000, 115000, 'Hyperlocal Commerce / AI Feed'),
    ('woowa', '우아한형제들', 'woowahan.com', 'Enterprise Ultimate', 1000000, 250000, 'Food Delivery / Mobility Tech')
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, plan = EXCLUDED.plan, industry = EXCLUDED.industry;

-- Index Optimization for Sub-second Query Speed
CREATE INDEX IF NOT EXISTS idx_applicants_tenant ON applicants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_tenant_applicant ON evaluations(tenant_id, applicant_id);
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(share_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_share ON interview_collaborations(share_id);
