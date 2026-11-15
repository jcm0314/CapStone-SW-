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

-- Helper Function: Get Current Session's Tenant ID from JWT claims or x-tenant-id header
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS VARCHAR AS $$
    SELECT COALESCE(
        NULLIF(current_setting('request.jwt.claims', true)::json->>'tenant_id', ''),
        NULLIF(current_setting('request.headers', true)::json->>'x-tenant-id', '')
    )::VARCHAR;
$$ LANGUAGE sql STABLE;

-- 0. Job Postings RLS Policy
CREATE POLICY tenant_isolation_job_postings ON job_postings
    FOR ALL
    USING (tenant_id = current_tenant_id() OR current_setting('role', true) = 'service_role')
    WITH CHECK (tenant_id = current_tenant_id() OR current_setting('role', true) = 'service_role');

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

-- Seed Default Job Postings (4 templates x 3 tenants)
INSERT INTO job_postings (id, tenant_id, title, target_team, competencies)
SELECT j.id, t.id, j.title, j.target_team, j.competencies::jsonb
FROM (VALUES ('toss-payments'), ('daangn'), ('woowa')) AS t(id)
CROSS JOIN (VALUES
    ('tech_backend', '소프트웨어 엔지니어', 'Platform Engineering', '[{"id":"problem_solving","name":"문제 해결력 & 논리성","weight":30},{"id":"tech_skill","name":"직무 전문성 & 기술력","weight":30},{"id":"teamwork","name":"협업 & 커뮤니케이션","weight":20},{"id":"growth","name":"성장 가능성 & 주도성","weight":10},{"id":"ethics","name":"책임감 & 조직 적합성","weight":10}]'),
    ('marketing_growth', '그로스 마케팅', 'Growth Marketing', '[{"id":"tech_skill","name":"데이터 분석 & 툴 활용력","weight":30},{"id":"problem_solving","name":"성과 창출 & 가설 검증력","weight":30},{"id":"growth","name":"기획력 & 도메인 이해도","weight":20},{"id":"teamwork","name":"소통 & 협업 능률","weight":10},{"id":"ethics","name":"도전 정신 & 열정","weight":10}]'),
    ('sales_account', 'B2B 영업 & 사업개발', 'Enterprise Sales', '[{"id":"teamwork","name":"고객 설득 & 커뮤니케이션","weight":35},{"id":"problem_solving","name":"목표 달성력 & 딜 실행력","weight":30},{"id":"growth","name":"시장 분석 & 기획력","weight":15},{"id":"tech_skill","name":"제품 이해도 & 기술 소통","weight":10},{"id":"ethics","name":"회복 탄력성 & 관계 구축","weight":10}]'),
    ('hr_recruiter', '인사 & 리크루터', 'Talent Acquisition', '[{"id":"ethics","name":"인재 검증력 & 윤리 의식","weight":30},{"id":"teamwork","name":"공감 & 조직 소통 역량","weight":25},{"id":"growth","name":"채용 브랜딩 & 기획력","weight":20},{"id":"problem_solving","name":"전략적 문제 해결력","weight":15},{"id":"tech_skill","name":"HR 테크 & 데이터 활용력","weight":10}]')
) AS j(id, title, target_team, competencies)
ON CONFLICT (id, tenant_id) DO UPDATE
SET title = EXCLUDED.title, target_team = EXCLUDED.target_team, competencies = EXCLUDED.competencies;

-- Index Optimization for Sub-second Query Speed
CREATE INDEX IF NOT EXISTS idx_applicants_tenant ON applicants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_tenant_applicant ON evaluations(tenant_id, applicant_id);
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(share_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_share ON interview_collaborations(share_id);
