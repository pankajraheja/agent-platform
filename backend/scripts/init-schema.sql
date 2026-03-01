-- ============================================================
-- Agent Platform — Schema Initialization
-- Schema: prototype_builder
-- Run automatically by Docker on first boot
-- ============================================================

CREATE SCHEMA IF NOT EXISTS prototype_builder;

-- Switch to schema
SET search_path TO prototype_builder;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

-- ============================================================
-- 1. ORGANIZATION & IDENTITY
-- ============================================================

CREATE TABLE organizations (
    org_id          UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    plan            VARCHAR(50) DEFAULT 'starter' CHECK (plan IN ('starter', 'growth', 'enterprise')),
    settings        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE workspaces (
    workspace_id    UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE roles (
    role_id         UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    name            VARCHAR(50) NOT NULL UNIQUE CHECK (name IN ('viewer', 'builder', 'admin', 'org_admin')),
    permissions     JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE personas (
    persona_id      UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    org_id          UUID REFERENCES organizations(org_id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    department      VARCHAR(100) CHECK (department IN ('sales', 'support', 'engineering', 'ops', 'hr', 'finance', 'marketing', 'general')),
    default_tier    VARCHAR(20) DEFAULT 'no-code' CHECK (default_tier IN ('no-code', 'low-code', 'pro-code')),
    ui_preferences  JSONB DEFAULT '{}',
    guardrails      JSONB DEFAULT '{}',
    icon            VARCHAR(10),
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      UUID,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
    user_id         UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    persona_id      UUID REFERENCES personas(persona_id) ON DELETE SET NULL,
    role_id         UUID REFERENCES roles(role_id) ON DELETE SET NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    display_name    VARCHAR(255) NOT NULL,
    preferred_tier  VARCHAR(20) DEFAULT 'no-code' CHECK (preferred_tier IN ('no-code', 'low-code', 'pro-code')),
    last_active     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. PERSONA SUPPORTING TABLES
-- ============================================================

CREATE TABLE persona_onboarding (
    onboarding_id   UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    persona_id      UUID NOT NULL REFERENCES personas(persona_id) ON DELETE CASCADE,
    step_type       VARCHAR(50) CHECK (step_type IN ('tutorial', 'sample_agent', 'walkthrough', 'skill_intro')),
    step_order      INT NOT NULL,
    title           VARCHAR(255) NOT NULL,
    content         TEXT,
    action          JSONB DEFAULT '{}',
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled'))
);

CREATE TABLE persona_contexts (
    context_id      UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    persona_id      UUID NOT NULL REFERENCES personas(persona_id) ON DELETE CASCADE,
    context_type    VARCHAR(50) CHECK (context_type IN ('system_prompt', 'tone', 'vocabulary', 'domain_knowledge')),
    name            VARCHAR(255) NOT NULL,
    value           TEXT NOT NULL,
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. CONNECTORS
-- ============================================================

CREATE TABLE connectors (
    connector_id    UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(50) CHECK (type IN ('rest_api', 'database', 'saas', 'webhook', 'file_system')),
    provider        VARCHAR(100) NOT NULL,
    category        VARCHAR(50) CHECK (category IN ('crm', 'ticketing', 'communication', 'storage', 'analytics', 'custom')),
    config_schema   JSONB DEFAULT '{}',
    auth_methods    JSONB DEFAULT '["api_key"]',
    status          VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'beta', 'deprecated')),
    icon_url        VARCHAR(500),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE connector_instances (
    instance_id     UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    connector_id    UUID NOT NULL REFERENCES connectors(connector_id) ON DELETE CASCADE,
    org_id          UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    credentials_ref VARCHAR(500),
    connection_config JSONB DEFAULT '{}',
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'error', 'revoked')),
    last_health_check TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. SKILLS & ASSETS
-- ============================================================

CREATE TABLE skills (
    skill_id        UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    category        VARCHAR(50) CHECK (category IN ('summarize', 'classify', 'extract', 'generate', 'transform', 'custom')),
    visibility      VARCHAR(20) DEFAULT 'workspace' CHECK (visibility IN ('private', 'workspace', 'org', 'public')),
    usage_count     INT DEFAULT 0,
    avg_rating      DECIMAL(3,2) DEFAULT 0,
    input_schema    JSONB DEFAULT '{}',
    output_schema   JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      UUID REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE skill_versions (
    skill_version_id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    skill_id        UUID NOT NULL REFERENCES skills(skill_id) ON DELETE CASCADE,
    version_number  VARCHAR(20) NOT NULL,
    prompt_config   JSONB DEFAULT '{}',
    model_settings  JSONB DEFAULT '{}',
    test_results    JSONB DEFAULT '{}',
    status          VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'deprecated')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Skill composition (skills that use other skills)
CREATE TABLE skill_compositions (
    parent_skill_id UUID NOT NULL REFERENCES skills(skill_id) ON DELETE CASCADE,
    child_skill_id  UUID NOT NULL REFERENCES skills(skill_id) ON DELETE CASCADE,
    execution_order INT DEFAULT 0,
    PRIMARY KEY (parent_skill_id, child_skill_id)
);

-- ============================================================
-- 5. KNOWLEDGE BASE / RAG
-- ============================================================

CREATE TABLE knowledge_bases (
    kb_id           UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
    chunking_config JSONB DEFAULT '{"chunk_size": 512, "overlap": 50}',
    retrieval_config JSONB DEFAULT '{"top_k": 5, "similarity_threshold": 0.7}',
    document_count  INT DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'indexing', 'error')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE documents (
    document_id     UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    kb_id           UUID NOT NULL REFERENCES knowledge_bases(kb_id) ON DELETE CASCADE,
    source_type     VARCHAR(50) CHECK (source_type IN ('upload', 'connector', 'url', 'raw_text')),
    file_name       VARCHAR(500),
    mime_type       VARCHAR(100),
    chunk_count     INT DEFAULT 0,
    sync_status     VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'indexed', 'failed')),
    metadata        JSONB DEFAULT '{}',
    ingested_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. AGENTS
-- ============================================================

CREATE TABLE agents (
    agent_id        UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    workspace_id    UUID NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    builder_tier    VARCHAR(20) DEFAULT 'no-code' CHECK (builder_tier IN ('no-code', 'low-code', 'pro-code')),
    active_version  UUID,
    kb_id           UUID REFERENCES knowledge_bases(kb_id) ON DELETE SET NULL,
    status          VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'retired')),
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      UUID REFERENCES users(user_id) ON DELETE SET NULL,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agent_versions (
    version_id      UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    agent_id        UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    version_number  VARCHAR(20) NOT NULL,
    agent_config    JSONB DEFAULT '{}',
    builder_tier    VARCHAR(20) CHECK (builder_tier IN ('no-code', 'low-code', 'pro-code')),
    status          VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    promoted_from   VARCHAR(20),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    created_by      UUID REFERENCES users(user_id) ON DELETE SET NULL
);

-- Agent ↔ Skill mapping
CREATE TABLE agent_skills (
    agent_id        UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    skill_id        UUID NOT NULL REFERENCES skills(skill_id) ON DELETE CASCADE,
    execution_order INT DEFAULT 0,
    config_override JSONB DEFAULT '{}',
    PRIMARY KEY (agent_id, skill_id)
);

-- Agent ↔ Connector mapping
CREATE TABLE agent_connectors (
    agent_id        UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    instance_id     UUID NOT NULL REFERENCES connector_instances(instance_id) ON DELETE CASCADE,
    purpose         VARCHAR(255),
    PRIMARY KEY (agent_id, instance_id)
);

-- Multi-agent collaboration
CREATE TABLE agent_collaborations (
    parent_agent_id UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    child_agent_id  UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    relationship    VARCHAR(50) DEFAULT 'delegate' CHECK (relationship IN ('delegate', 'consult', 'parallel')),
    PRIMARY KEY (parent_agent_id, child_agent_id)
);

-- ============================================================
-- 7. TEMPLATES
-- ============================================================

CREATE TABLE templates (
    template_id     UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    workspace_id    UUID REFERENCES workspaces(workspace_id) ON DELETE SET NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    category        VARCHAR(50) CHECK (category IN ('support', 'sales', 'ops', 'hr', 'finance', 'custom')),
    builder_tier    VARCHAR(20) DEFAULT 'no-code' CHECK (builder_tier IN ('no-code', 'low-code', 'pro-code')),
    agent_blueprint JSONB DEFAULT '{}',
    required_connectors JSONB DEFAULT '[]',
    required_skills JSONB DEFAULT '[]',
    fork_count      INT DEFAULT 0,
    avg_rating      DECIMAL(3,2) DEFAULT 0,
    visibility      VARCHAR(20) DEFAULT 'org' CHECK (visibility IN ('workspace', 'org', 'marketplace')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Persona ↔ Template recommendations
CREATE TABLE persona_templates (
    persona_id      UUID NOT NULL REFERENCES personas(persona_id) ON DELETE CASCADE,
    template_id     UUID NOT NULL REFERENCES templates(template_id) ON DELETE CASCADE,
    is_featured     BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (persona_id, template_id)
);

-- Persona ↔ Skill recommendations
CREATE TABLE persona_skills (
    persona_id      UUID NOT NULL REFERENCES personas(persona_id) ON DELETE CASCADE,
    skill_id        UUID NOT NULL REFERENCES skills(skill_id) ON DELETE CASCADE,
    is_default      BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (persona_id, skill_id)
);

-- Persona ↔ Connector defaults
CREATE TABLE persona_connectors (
    persona_id      UUID NOT NULL REFERENCES personas(persona_id) ON DELETE CASCADE,
    connector_id    UUID NOT NULL REFERENCES connectors(connector_id) ON DELETE CASCADE,
    is_default      BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (persona_id, connector_id)
);

-- ============================================================
-- 8. GOVERNANCE
-- ============================================================

CREATE TABLE governance_policies (
    policy_id       UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(50) CHECK (type IN ('access_control', 'content_filter', 'rate_limit', 'data_boundary')),
    rules           JSONB DEFAULT '{}',
    enforcement     VARCHAR(20) DEFAULT 'warn' CHECK (enforcement IN ('block', 'warn', 'log')),
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. EXECUTION & OBSERVABILITY
-- ============================================================

CREATE TABLE agent_runs (
    run_id          UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    agent_id        UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    agent_version_id UUID REFERENCES agent_versions(version_id) ON DELETE SET NULL,
    triggered_by    UUID REFERENCES users(user_id) ON DELETE SET NULL,
    persona_id      UUID REFERENCES personas(persona_id) ON DELETE SET NULL,
    trigger_type    VARCHAR(20) CHECK (trigger_type IN ('manual', 'schedule', 'webhook', 'agent')),
    status          VARCHAR(30) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'awaiting_human')),
    input_payload   JSONB DEFAULT '{}',
    output_payload  JSONB DEFAULT '{}',
    total_tokens    INT DEFAULT 0,
    cost_usd        DECIMAL(10,6) DEFAULT 0,
    duration_ms     INT DEFAULT 0,
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);

CREATE TABLE run_steps (
    step_id         UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    run_id          UUID NOT NULL REFERENCES agent_runs(run_id) ON DELETE CASCADE,
    skill_id        UUID REFERENCES skills(skill_id) ON DELETE SET NULL,
    connector_instance_id UUID REFERENCES connector_instances(instance_id) ON DELETE SET NULL,
    step_type       VARCHAR(30) CHECK (step_type IN ('skill', 'connector', 'llm_call', 'decision', 'human_gate')),
    status          VARCHAR(20) CHECK (status IN ('success', 'failed', 'skipped', 'timeout')),
    input           JSONB DEFAULT '{}',
    output          JSONB DEFAULT '{}',
    tokens_used     INT DEFAULT 0,
    duration_ms     INT DEFAULT 0,
    retry_count     INT DEFAULT 0,
    executed_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE human_reviews (
    review_id       UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    run_id          UUID NOT NULL REFERENCES agent_runs(run_id) ON DELETE CASCADE,
    reviewer_id     UUID REFERENCES users(user_id) ON DELETE SET NULL,
    decision        VARCHAR(20) CHECK (decision IN ('approved', 'rejected', 'modified')),
    comments        TEXT,
    decided_at      TIMESTAMPTZ
);

-- ============================================================
-- 10. USAGE METRICS
-- ============================================================

CREATE TABLE usage_metrics (
    metric_id       UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    org_id          UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    entity_type     VARCHAR(30) CHECK (entity_type IN ('agent', 'skill', 'connector', 'persona')),
    entity_id       UUID NOT NULL,
    persona_id      UUID REFERENCES personas(persona_id) ON DELETE SET NULL,
    period          VARCHAR(20) CHECK (period IN ('daily', 'weekly', 'monthly')),
    total_runs      INT DEFAULT 0,
    total_tokens    INT DEFAULT 0,
    total_cost      DECIMAL(10,4) DEFAULT 0,
    avg_latency_ms  DECIMAL(10,2) DEFAULT 0,
    success_rate    DECIMAL(5,4) DEFAULT 0,
    unique_users    INT DEFAULT 0,
    period_start    DATE NOT NULL
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_workspaces_org ON workspaces(org_id);
CREATE INDEX idx_users_org ON users(org_id);
CREATE INDEX idx_users_persona ON users(persona_id);
CREATE INDEX idx_agents_workspace ON agents(workspace_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_skills_workspace ON skills(workspace_id);
CREATE INDEX idx_skills_category ON skills(category);
CREATE INDEX idx_skills_visibility ON skills(visibility);
CREATE INDEX idx_agent_runs_agent ON agent_runs(agent_id);
CREATE INDEX idx_agent_runs_status ON agent_runs(status);
CREATE INDEX idx_agent_runs_started ON agent_runs(started_at);
CREATE INDEX idx_run_steps_run ON run_steps(run_id);
CREATE INDEX idx_usage_metrics_org_period ON usage_metrics(org_id, period, period_start);
CREATE INDEX idx_connectors_category ON connectors(category);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_persona_contexts_persona ON persona_contexts(persona_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION prototype_builder.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_organizations_updated BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_workspaces_updated BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_personas_updated BEFORE UPDATE ON personas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_agents_updated BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_skills_updated BEFORE UPDATE ON skills FOR EACH ROW EXECUTE FUNCTION update_updated_at();
