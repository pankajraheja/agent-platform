-- ============================================================
-- Agent Platform — Seed Data
-- Schema: prototype_builder
-- Run AFTER init-schema.sql on a fresh database
-- ============================================================
-- Insertion order respects all foreign-key constraints:
--   1.  organizations          (root)
--   2.  roles                  (root)
--   3.  connectors             (root)
--   4.  workspaces             (→ organizations)
--   5.  personas               (→ organizations)
--   6.  users                  (→ organizations, personas, roles)
--   7.  persona_onboarding     (→ personas)
--   8.  persona_contexts       (→ personas)
--   9.  connector_instances    (→ connectors, organizations)
--  10.  knowledge_bases        (→ workspaces)
--  11.  skills                 (→ workspaces, users)
--  12.  skill_versions         (→ skills)
--  13.  skill_compositions     (→ skills)
--  14.  documents              (→ knowledge_bases)
--  15.  templates              (→ workspaces)
--  16.  agents                 (→ workspaces, knowledge_bases, users)
--  17.  agent_versions         (→ agents, users)
--  18.  UPDATE agents.active_version (back-ref to agent_versions)
--  19.  agent_skills           (→ agents, skills)
--  20.  agent_connectors       (→ agents, connector_instances)
--  21.  agent_collaborations   (→ agents)
--  22.  persona_templates      (→ personas, templates)
--  23.  persona_skills         (→ personas, skills)
--  24.  persona_connectors     (→ personas, connectors)
--  25.  governance_policies    (→ organizations)
--  26.  agent_runs             (→ agents, agent_versions, users, personas)
--  27.  run_steps              (→ agent_runs, skills, connector_instances)
--  28.  human_reviews          (→ agent_runs, users)
--  29.  usage_metrics          (→ organizations, personas)
-- ============================================================

SET search_path TO prototype_builder;

BEGIN;

-- ============================================================
-- 1. ORGANIZATIONS
-- ============================================================
INSERT INTO organizations (org_id, name, plan, settings) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'Acme Corporation',   'enterprise', '{"sso_enabled": true,  "max_agents": 100}'),
  ('a0000000-0000-4000-8000-000000000002', 'TechStart Inc',      'growth',     '{"sso_enabled": false, "max_agents": 25}'),
  ('a0000000-0000-4000-8000-000000000003', 'Demo Sandbox Org',   'starter',    '{}');

-- ============================================================
-- 2. ROLES
-- ============================================================
INSERT INTO roles (role_id, name, permissions) VALUES
  ('b0000000-0000-4000-8000-000000000001', 'viewer',    '{"read": true}'),
  ('b0000000-0000-4000-8000-000000000002', 'builder',   '{"read": true, "create": true, "edit": true}'),
  ('b0000000-0000-4000-8000-000000000003', 'admin',     '{"read": true, "create": true, "edit": true, "delete": true, "manage_users": true}'),
  ('b0000000-0000-4000-8000-000000000004', 'org_admin', '{"read": true, "create": true, "edit": true, "delete": true, "manage_users": true, "manage_org": true}');

-- ============================================================
-- 3. CONNECTORS  (global catalog — not org-specific)
-- ============================================================
INSERT INTO connectors (connector_id, name, type, provider, category, config_schema, auth_methods, status, icon_url) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'Salesforce CRM',     'saas',      'Salesforce',  'crm',           '{"instance_url": "string", "api_version": "string"}',          '["oauth2"]',              'available', '/icons/salesforce.svg'),
  ('c0000000-0000-4000-8000-000000000002', 'Zendesk Support',    'saas',      'Zendesk',     'ticketing',     '{"subdomain": "string"}',                                      '["oauth2", "api_key"]',   'available', '/icons/zendesk.svg'),
  ('c0000000-0000-4000-8000-000000000003', 'Slack Messaging',    'saas',      'Slack',       'communication', '{"workspace_id": "string"}',                                   '["oauth2"]',              'available', '/icons/slack.svg'),
  ('c0000000-0000-4000-8000-000000000004', 'PostgreSQL',         'database',  'PostgreSQL',  'storage',       '{"host": "string", "port": "number", "database": "string"}',   '["credentials"]',         'available', '/icons/postgres.svg'),
  ('c0000000-0000-4000-8000-000000000005', 'AWS S3',             'rest_api',  'AWS',         'storage',       '{"bucket": "string", "region": "string"}',                     '["api_key"]',             'available', '/icons/s3.svg'),
  ('c0000000-0000-4000-8000-000000000006', 'Google Analytics',   'saas',      'Google',      'analytics',     '{"property_id": "string"}',                                    '["oauth2"]',              'available', '/icons/ga.svg'),
  ('c0000000-0000-4000-8000-000000000007', 'Custom Webhook',     'webhook',   'Custom',      'custom',        '{"url": "string", "method": "string"}',                        '["api_key", "bearer"]',   'available', '/icons/webhook.svg'),
  ('c0000000-0000-4000-8000-000000000008', 'HubSpot CRM',        'saas',      'HubSpot',     'crm',           '{"portal_id": "string"}',                                      '["oauth2", "api_key"]',   'beta',      '/icons/hubspot.svg');

-- ============================================================
-- 4. WORKSPACES
-- ============================================================
INSERT INTO workspaces (workspace_id, org_id, name, description) VALUES
  -- Acme Corp workspaces
  ('d0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Customer Success',   'Agents for customer-facing operations'),
  ('d0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Internal Ops',       'Internal process-automation agents'),
  ('d0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Engineering',        'Developer tooling and CI/CD agents'),
  -- TechStart workspaces
  ('d0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002', 'Product',            'Product development workspace'),
  ('d0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002', 'Growth',             'Marketing & growth automation'),
  -- Demo Sandbox
  ('d0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000003', 'Sandbox Workspace',  'Playground for demos');

-- ============================================================
-- 5. PERSONAS
-- ============================================================
INSERT INTO personas (persona_id, org_id, name, description, department, default_tier, icon, status) VALUES
  -- Acme Corp personas
  ('e0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Sales Rep',         'Front-line sales representative',          'sales',       'no-code',  '💼', 'active'),
  ('e0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Support Agent',     'Tier-1 customer support',                  'support',     'no-code',  '🎧', 'active'),
  ('e0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'DevOps Engineer',   'Platform & infrastructure engineer',       'engineering', 'pro-code', '⚙️', 'active'),
  ('e0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Finance Analyst',   'Financial reporting and compliance',       'finance',     'low-code', '📊', 'active'),
  ('e0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'HR Manager',        'People operations and recruiting',         'hr',          'no-code',  '👥', 'active'),
  -- TechStart personas
  ('e0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000002', 'Growth Marketer',   'Demand gen and content marketing',         'marketing',   'low-code', '📈', 'active'),
  ('e0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000002', 'Product Manager',   'Feature planning and user research',       'ops',         'low-code', '🎯', 'active'),
  -- Demo persona
  ('e0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000003', 'Demo User',         'General-purpose demo persona',             'general',     'no-code',  '🧪', 'active');

-- ============================================================
-- 6. USERS
-- ============================================================
INSERT INTO users (user_id, org_id, persona_id, role_id, email, display_name, preferred_tier) VALUES
  -- Acme Corp users
  ('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000004', 'alice@acme.com',      'Alice Johnson',   'no-code'),
  ('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'bob@acme.com',        'Bob Martinez',    'no-code'),
  ('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000003', 'carol@acme.com',      'Carol Chen',      'pro-code'),
  ('f0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000002', 'dave@acme.com',       'Dave Patel',      'low-code'),
  ('f0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000001', 'eve@acme.com',        'Eve Williams',    'no-code'),
  -- TechStart users
  ('f0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000004', 'frank@techstart.io',  'Frank Lee',       'low-code'),
  ('f0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000002', 'grace@techstart.io',  'Grace Kim',       'low-code'),
  -- Demo user
  ('f0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000003', 'demo@sandbox.local',  'Demo Admin',      'no-code');

-- ============================================================
-- 7. PERSONA ONBOARDING
-- ============================================================
INSERT INTO persona_onboarding (persona_id, step_type, step_order, title, content, action) VALUES
  -- Sales Rep onboarding
  ('e0000000-0000-4000-8000-000000000001', 'tutorial',      1, 'Welcome to your AI Sales Assistant',  'Learn how to build a lead-scoring agent in minutes.',  '{"url": "/tutorials/sales-agent-101"}'),
  ('e0000000-0000-4000-8000-000000000001', 'sample_agent',  2, 'Try the Lead Qualifier',              'Run a pre-built agent that qualifies inbound leads.',  '{"agent_template": "lead-qualifier"}'),
  ('e0000000-0000-4000-8000-000000000001', 'walkthrough',   3, 'Connect your CRM',                    'Link Salesforce to pull contacts automatically.',       '{"connector": "salesforce"}'),
  -- Support Agent onboarding
  ('e0000000-0000-4000-8000-000000000002', 'tutorial',      1, 'Getting Started with Support Agents',  'Build a ticket-triage agent to classify incoming tickets.', '{"url": "/tutorials/support-triage"}'),
  ('e0000000-0000-4000-8000-000000000002', 'sample_agent',  2, 'Try the FAQ Bot',                      'A ready-made agent that answers common customer questions.', '{"agent_template": "faq-bot"}'),
  -- DevOps Engineer onboarding
  ('e0000000-0000-4000-8000-000000000003', 'skill_intro',   1, 'Pro-Code Agent Building',              'Learn to build agents with custom code and API integrations.', '{"url": "/tutorials/pro-code-intro"}'),
  ('e0000000-0000-4000-8000-000000000003', 'walkthrough',   2, 'Set Up CI/CD Connector',               'Connect your GitHub or GitLab repo.',                          '{"connector": "github"}'),
  -- Demo persona onboarding
  ('e0000000-0000-4000-8000-000000000008', 'tutorial',      1, 'Welcome to the Sandbox',               'Explore the platform with guided examples.',                   '{"url": "/tutorials/sandbox-intro"}');

-- ============================================================
-- 8. PERSONA CONTEXTS
-- ============================================================
INSERT INTO persona_contexts (persona_id, context_type, name, value, description) VALUES
  ('e0000000-0000-4000-8000-000000000001', 'system_prompt',     'Sales Tone',              'You are a helpful sales assistant. Be concise, data-driven, and focus on ROI.', 'Default system prompt for sales personas'),
  ('e0000000-0000-4000-8000-000000000001', 'vocabulary',        'Sales Terminology',       'pipeline, MQL, SQL, ARR, churn, upsell, cross-sell, ICP, TAM',                 'Key sales terms to understand'),
  ('e0000000-0000-4000-8000-000000000002', 'system_prompt',     'Support Tone',            'You are a patient and empathetic support agent. Resolve issues step by step.',  'Default system prompt for support personas'),
  ('e0000000-0000-4000-8000-000000000002', 'domain_knowledge',  'Ticket Categories',       'billing, technical, account, feature-request, bug-report',                     'Known ticket categories'),
  ('e0000000-0000-4000-8000-000000000003', 'system_prompt',     'Engineering Tone',        'You are a senior DevOps engineer. Be precise and technical.',                  'Default system prompt for engineering personas'),
  ('e0000000-0000-4000-8000-000000000003', 'tone',              'Engineering Voice',       'Direct, technical, no fluff. Use code examples when possible.',                'Communication style for engineers'),
  ('e0000000-0000-4000-8000-000000000006', 'system_prompt',     'Growth Marketing Tone',   'You are a creative growth marketer. Focus on metrics and experimentation.',     'Default system prompt for growth personas'),
  ('e0000000-0000-4000-8000-000000000008', 'system_prompt',     'Demo Prompt',             'You are a friendly assistant walking the user through a product demo.',         'Default system prompt for demo persona');

-- ============================================================
-- 9. CONNECTOR INSTANCES  (org-level connections)
-- ============================================================
INSERT INTO connector_instances (instance_id, connector_id, org_id, name, credentials_ref, connection_config, status) VALUES
  -- Acme Corp instances
  ('10000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Acme Salesforce Prod',  'vault://acme/salesforce-prod',  '{"instance_url": "https://acme.my.salesforce.com", "api_version": "v58.0"}', 'active'),
  ('10000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Acme Zendesk',          'vault://acme/zendesk',          '{"subdomain": "acme-support"}',                                              'active'),
  ('10000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Acme Slack',            'vault://acme/slack',            '{"workspace_id": "T0ACME001"}',                                              'active'),
  ('10000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Acme Analytics DB',     'vault://acme/analytics-pg',     '{"host": "analytics.acme.internal", "port": 5432, "database": "analytics"}', 'active'),
  ('10000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'Acme S3 Bucket',        'vault://acme/s3',               '{"bucket": "acme-agent-data", "region": "us-east-1"}',                       'active'),
  -- TechStart instances
  ('10000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'TechStart Slack',       'vault://techstart/slack',       '{"workspace_id": "T0TECH001"}',                                              'active'),
  ('10000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000002', 'TechStart HubSpot',     'vault://techstart/hubspot',     '{"portal_id": "12345678"}',                                                  'active'),
  -- Demo instance
  ('10000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000003', 'Demo Webhook',          'vault://demo/webhook',          '{"url": "https://httpbin.org/post", "method": "POST"}',                      'active');

-- ============================================================
-- 10. KNOWLEDGE BASES
-- ============================================================
INSERT INTO knowledge_bases (kb_id, workspace_id, name, description, document_count, status) VALUES
  ('20000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Product Documentation',  'Customer-facing product docs and FAQs',          25, 'active'),
  ('20000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'Support Playbooks',      'Internal support escalation procedures',          12, 'active'),
  ('20000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000002', 'HR Policies',            'Employee handbook and policy documents',           8, 'active'),
  ('20000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000004', 'TechStart Wiki',         'Internal knowledge wiki for the product team',   15, 'active'),
  ('20000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000006', 'Sandbox KB',             'Sample documents for demo purposes',               3, 'active');

-- ============================================================
-- 11. SKILLS
-- ============================================================
INSERT INTO skills (skill_id, workspace_id, name, description, category, visibility, created_by, input_schema, output_schema) VALUES
  -- Acme Customer Success skills
  ('30000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Ticket Classifier',      'Classifies support tickets by category and urgency',     'classify',   'org',       'f0000000-0000-4000-8000-000000000002', '{"type": "object", "properties": {"ticket_text": {"type": "string"}}}',  '{"type": "object", "properties": {"category": {"type": "string"}, "urgency": {"type": "string"}}}'),
  ('30000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'Sentiment Analyzer',     'Detects customer sentiment from messages',                'classify',   'org',       'f0000000-0000-4000-8000-000000000002', '{"type": "object", "properties": {"text": {"type": "string"}}}',         '{"type": "object", "properties": {"sentiment": {"type": "string"}, "score": {"type": "number"}}}'),
  ('30000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000001', 'Response Drafter',       'Drafts customer-facing reply based on context',           'generate',   'org',       'f0000000-0000-4000-8000-000000000002', '{"type": "object", "properties": {"ticket": {"type": "object"}, "kb_context": {"type": "string"}}}',  '{"type": "object", "properties": {"draft_reply": {"type": "string"}}}'),
  ('30000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', 'Customer Summary',       'Generates a one-paragraph customer account summary',      'summarize',  'org',       'f0000000-0000-4000-8000-000000000001', '{"type": "object", "properties": {"account_id": {"type": "string"}}}',   '{"type": "object", "properties": {"summary": {"type": "string"}}}'),
  -- Acme Internal Ops skills
  ('30000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000002', 'Invoice Extractor',      'Extracts line items and totals from invoice PDFs',        'extract',    'workspace', 'f0000000-0000-4000-8000-000000000004', '{"type": "object", "properties": {"document_url": {"type": "string"}}}', '{"type": "object", "properties": {"line_items": {"type": "array"}, "total": {"type": "number"}}}'),
  ('30000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000002', 'PTO Request Processor',  'Parses PTO requests and checks against policy',          'extract',    'workspace', 'f0000000-0000-4000-8000-000000000005', '{"type": "object", "properties": {"request_text": {"type": "string"}}}', '{"type": "object", "properties": {"dates": {"type": "array"}, "approved": {"type": "boolean"}}}'),
  -- Acme Engineering skills
  ('30000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000003', 'Log Analyzer',           'Parses error logs and suggests root cause',               'extract',    'workspace', 'f0000000-0000-4000-8000-000000000003', '{"type": "object", "properties": {"log_text": {"type": "string"}}}',     '{"type": "object", "properties": {"errors": {"type": "array"}, "suggestion": {"type": "string"}}}'),
  ('30000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000003', 'Code Reviewer',          'Reviews pull-request diffs for common issues',            'classify',   'workspace', 'f0000000-0000-4000-8000-000000000003', '{"type": "object", "properties": {"diff": {"type": "string"}}}',         '{"type": "object", "properties": {"issues": {"type": "array"}, "rating": {"type": "string"}}}'),
  -- TechStart skills
  ('30000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000005', 'Blog Post Generator',    'Generates SEO-friendly blog content from a brief',        'generate',   'org',       'f0000000-0000-4000-8000-000000000006', '{"type": "object", "properties": {"brief": {"type": "string"}, "keywords": {"type": "array"}}}',  '{"type": "object", "properties": {"title": {"type": "string"}, "body": {"type": "string"}}}'),
  ('30000000-0000-4000-8000-000000000010', 'd0000000-0000-4000-8000-000000000004', 'Feature Request Ranker', 'Ranks feature requests by impact and effort',             'classify',   'org',       'f0000000-0000-4000-8000-000000000007', '{"type": "object", "properties": {"requests": {"type": "array"}}}',      '{"type": "object", "properties": {"ranked": {"type": "array"}}}'),
  -- Demo skill
  ('30000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000006', 'Echo Skill',             'Simple echo skill for testing and demos',                 'custom',     'public',    'f0000000-0000-4000-8000-000000000008', '{"type": "object", "properties": {"input": {"type": "string"}}}',        '{"type": "object", "properties": {"output": {"type": "string"}}}');

-- ============================================================
-- 12. SKILL VERSIONS
-- ============================================================
INSERT INTO skill_versions (skill_version_id, skill_id, version_number, prompt_config, model_settings, status) VALUES
  ('31000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '1.0.0', '{"system": "Classify the support ticket.", "template": "Category: {{category}}\nUrgency: {{urgency}}"}',       '{"model": "claude-sonnet-4-6", "temperature": 0.1}', 'published'),
  ('31000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '1.0.0', '{"system": "Analyze sentiment.", "template": "Sentiment: {{sentiment}}, Score: {{score}}"}',                  '{"model": "claude-haiku-4-5-20251001", "temperature": 0.0}', 'published'),
  ('31000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', '1.0.0', '{"system": "Draft a helpful reply to the customer.", "template": "{{draft_reply}}"}',                         '{"model": "claude-sonnet-4-6", "temperature": 0.5}', 'published'),
  ('31000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000003', '1.1.0', '{"system": "Draft a helpful reply. Include empathy and next steps.", "template": "{{draft_reply}}"}',         '{"model": "claude-sonnet-4-6", "temperature": 0.4}', 'draft'),
  ('31000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000004', '1.0.0', '{"system": "Summarize the customer account.", "template": "{{summary}}"}',                                   '{"model": "claude-haiku-4-5-20251001", "temperature": 0.2}', 'published'),
  ('31000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000005', '1.0.0', '{"system": "Extract invoice line items.", "template": "{{line_items}}"}',                                    '{"model": "claude-sonnet-4-6", "temperature": 0.0}', 'published'),
  ('31000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000007', '1.0.0', '{"system": "Analyze error logs.", "template": "Errors: {{errors}}\nSuggestion: {{suggestion}}"}',             '{"model": "claude-sonnet-4-6", "temperature": 0.2}', 'published'),
  ('31000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000008', '1.0.0', '{"system": "Review the code diff for issues.", "template": "Issues: {{issues}}\nRating: {{rating}}"}',       '{"model": "claude-opus-4-6", "temperature": 0.1}',  'published'),
  ('31000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000009', '1.0.0', '{"system": "Write a blog post from this brief.", "template": "# {{title}}\n\n{{body}}"}',                    '{"model": "claude-sonnet-4-6", "temperature": 0.7}', 'published'),
  ('31000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000006', '1.0.0', '{"system": "Parse PTO request and check against policy.", "template": "Dates: {{dates}}\nApproved: {{approved}}"}', '{"model": "claude-sonnet-4-6", "temperature": 0.1}', 'published'),
  ('31000000-0000-4000-8000-000000000011', '30000000-0000-4000-8000-000000000010', '1.0.0', '{"system": "Rank feature requests by impact and effort.", "template": "{{ranked}}"}',                                  '{"model": "claude-sonnet-4-6", "temperature": 0.2}', 'published'),
  ('31000000-0000-4000-8000-000000000012', '30000000-0000-4000-8000-000000000011', '1.0.0', '{"system": "Echo the input.", "template": "{{output}}"}',                                                              '{"model": "claude-haiku-4-5-20251001", "temperature": 0.0}', 'published');

-- ============================================================
-- 13. SKILL COMPOSITIONS  (chained skills)
-- ============================================================
INSERT INTO skill_compositions (parent_skill_id, child_skill_id, execution_order) VALUES
  -- Response Drafter uses Ticket Classifier first, then Sentiment Analyzer
  ('30000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 1),
  ('30000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 2);

-- ============================================================
-- 14. DOCUMENTS  (in knowledge bases)
-- ============================================================
INSERT INTO documents (document_id, kb_id, source_type, file_name, mime_type, chunk_count, sync_status) VALUES
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'upload',    'getting-started.pdf',      'application/pdf',  18, 'indexed'),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'upload',    'api-reference.pdf',        'application/pdf',  42, 'indexed'),
  ('40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'url',       'https://docs.acme.com/faq','text/html',        10, 'indexed'),
  ('40000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'upload',    'escalation-playbook.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 8, 'indexed'),
  ('40000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', 'raw_text',  'common-resolutions.txt',   'text/plain',        5, 'indexed'),
  ('40000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000003', 'upload',    'employee-handbook-2025.pdf','application/pdf', 30, 'indexed'),
  ('40000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000004', 'connector', 'confluence-product-wiki',  'text/html',        22, 'indexed'),
  ('40000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000005', 'upload',    'demo-data.csv',            'text/csv',          3, 'indexed');

-- ============================================================
-- 15. TEMPLATES
-- ============================================================
INSERT INTO templates (template_id, workspace_id, name, description, category, builder_tier, visibility, fork_count, avg_rating) VALUES
  ('50000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Customer Support Bot',      'Pre-built agent for handling L1 support tickets',         'support',  'no-code',  'marketplace', 42, 4.50),
  ('50000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'Lead Qualifier',            'Scores and qualifies inbound leads using CRM data',       'sales',    'no-code',  'marketplace', 28, 4.20),
  ('50000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000002', 'Invoice Processing Agent',  'Extracts and validates invoice data automatically',       'finance',  'low-code', 'org',         10, 3.80),
  ('50000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000002', 'Employee Onboarding Bot',   'Guides new hires through onboarding checklists',          'hr',       'no-code',  'org',          5, 4.00),
  ('50000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000003', 'CI/CD Monitor Agent',       'Monitors build pipelines and alerts on failures',         'ops',      'pro-code', 'org',          3, 3.50),
  ('50000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000005', 'Content Writer',            'Generates blog posts and social media content',           'custom',   'low-code', 'marketplace', 15, 4.10),
  ('50000000-0000-4000-8000-000000000007', NULL,                                   'Blank Agent',               'Start from scratch — an empty agent template',            'custom',   'no-code',  'marketplace',  0, 0.00);

-- ============================================================
-- 16. AGENTS
-- ============================================================
INSERT INTO agents (agent_id, workspace_id, name, description, builder_tier, kb_id, status, created_by, metadata) VALUES
  -- Acme Customer Success agents
  ('60000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'Support Triage Bot',       'Classifies, prioritizes, and drafts replies for support tickets',   'no-code',  '20000000-0000-4000-8000-000000000001', 'active',  'f0000000-0000-4000-8000-000000000002', '{"channel": "zendesk"}'),
  ('60000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000001', 'Account Health Checker',   'Produces weekly customer health scores',                             'low-code', '20000000-0000-4000-8000-000000000001', 'active',  'f0000000-0000-4000-8000-000000000001', '{"schedule": "weekly"}'),
  -- Acme Internal Ops agents
  ('60000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000002', 'Invoice Processor',        'Reads invoices, extracts data, and logs to finance system',         'low-code', NULL,                                   'active',  'f0000000-0000-4000-8000-000000000004', '{}'),
  ('60000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000002', 'PTO Manager',              'Handles PTO requests and checks against company policy',            'no-code',  '20000000-0000-4000-8000-000000000003', 'active',  'f0000000-0000-4000-8000-000000000005', '{}'),
  -- Acme Engineering agents
  ('60000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000003', 'Build Monitor',            'Monitors CI/CD and posts alerts to Slack on failure',               'pro-code', NULL,                                   'active',  'f0000000-0000-4000-8000-000000000003', '{"pipeline": "github-actions"}'),
  ('60000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000003', 'PR Reviewer',              'Automated code review for pull requests',                            'pro-code', NULL,                                   'draft',   'f0000000-0000-4000-8000-000000000003', '{}'),
  -- TechStart agents
  ('60000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000005', 'Blog Writer',              'Generates SEO blog posts from content briefs',                      'low-code', '20000000-0000-4000-8000-000000000004', 'active',  'f0000000-0000-4000-8000-000000000006', '{}'),
  ('60000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000004', 'Feature Prioritizer',      'Ranks feature requests from user feedback',                         'low-code', '20000000-0000-4000-8000-000000000004', 'active',  'f0000000-0000-4000-8000-000000000007', '{}'),
  -- Demo agent
  ('60000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000006', 'Demo Agent',               'A simple agent for sandbox testing',                                 'no-code',  '20000000-0000-4000-8000-000000000005', 'active',  'f0000000-0000-4000-8000-000000000008', '{}'),
  -- Retired agent (for status variety)
  ('60000000-0000-4000-8000-000000000010', 'd0000000-0000-4000-8000-000000000001', 'Old FAQ Bot (Retired)',    'Deprecated first-gen FAQ agent',                                     'no-code',  '20000000-0000-4000-8000-000000000002', 'retired', 'f0000000-0000-4000-8000-000000000002', '{}');

-- ============================================================
-- 17. AGENT VERSIONS
-- ============================================================
INSERT INTO agent_versions (version_id, agent_id, version_number, agent_config, builder_tier, status, created_by) VALUES
  ('61000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '1.0.0', '{"max_tokens": 2048, "skills": ["classify", "respond"]}',   'no-code',  'published', 'f0000000-0000-4000-8000-000000000002'),
  ('61000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000001', '1.1.0', '{"max_tokens": 2048, "skills": ["classify", "sentiment", "respond"]}', 'no-code', 'published', 'f0000000-0000-4000-8000-000000000002'),
  ('61000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000002', '1.0.0', '{"max_tokens": 1024, "schedule": "weekly"}',                 'low-code', 'published', 'f0000000-0000-4000-8000-000000000001'),
  ('61000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000003', '1.0.0', '{"max_tokens": 4096, "output_format": "json"}',              'low-code', 'published', 'f0000000-0000-4000-8000-000000000004'),
  ('61000000-0000-4000-8000-000000000005', '60000000-0000-4000-8000-000000000004', '1.0.0', '{"max_tokens": 1024}',                                       'no-code',  'published', 'f0000000-0000-4000-8000-000000000005'),
  ('61000000-0000-4000-8000-000000000006', '60000000-0000-4000-8000-000000000005', '1.0.0', '{"max_tokens": 512,  "alert_channel": "#eng-alerts"}',       'pro-code', 'published', 'f0000000-0000-4000-8000-000000000003'),
  ('61000000-0000-4000-8000-000000000007', '60000000-0000-4000-8000-000000000007', '1.0.0', '{"max_tokens": 4096, "seo": true}',                          'low-code', 'published', 'f0000000-0000-4000-8000-000000000006'),
  ('61000000-0000-4000-8000-000000000008', '60000000-0000-4000-8000-000000000008', '1.0.0', '{"max_tokens": 2048}',                                       'low-code', 'published', 'f0000000-0000-4000-8000-000000000007'),
  ('61000000-0000-4000-8000-000000000009', '60000000-0000-4000-8000-000000000009', '1.0.0', '{"max_tokens": 512}',                                        'no-code',  'published', 'f0000000-0000-4000-8000-000000000008');

-- ============================================================
-- 18. BACK-FILL agents.active_version
-- ============================================================
UPDATE agents SET active_version = '61000000-0000-4000-8000-000000000002' WHERE agent_id = '60000000-0000-4000-8000-000000000001';
UPDATE agents SET active_version = '61000000-0000-4000-8000-000000000003' WHERE agent_id = '60000000-0000-4000-8000-000000000002';
UPDATE agents SET active_version = '61000000-0000-4000-8000-000000000004' WHERE agent_id = '60000000-0000-4000-8000-000000000003';
UPDATE agents SET active_version = '61000000-0000-4000-8000-000000000005' WHERE agent_id = '60000000-0000-4000-8000-000000000004';
UPDATE agents SET active_version = '61000000-0000-4000-8000-000000000006' WHERE agent_id = '60000000-0000-4000-8000-000000000005';
UPDATE agents SET active_version = '61000000-0000-4000-8000-000000000007' WHERE agent_id = '60000000-0000-4000-8000-000000000007';
UPDATE agents SET active_version = '61000000-0000-4000-8000-000000000008' WHERE agent_id = '60000000-0000-4000-8000-000000000008';
UPDATE agents SET active_version = '61000000-0000-4000-8000-000000000009' WHERE agent_id = '60000000-0000-4000-8000-000000000009';

-- ============================================================
-- 19. AGENT ↔ SKILL MAPPINGS
-- ============================================================
INSERT INTO agent_skills (agent_id, skill_id, execution_order, config_override) VALUES
  -- Support Triage Bot: classify → sentiment → draft reply
  ('60000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 1, '{}'),
  ('60000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 2, '{}'),
  ('60000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', 3, '{}'),
  -- Account Health Checker: customer summary
  ('60000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000004', 1, '{}'),
  -- Invoice Processor
  ('60000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000005', 1, '{}'),
  -- PTO Manager
  ('60000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000006', 1, '{}'),
  -- Build Monitor: log analyzer
  ('60000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000007', 1, '{}'),
  -- PR Reviewer
  ('60000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000008', 1, '{}'),
  -- Blog Writer
  ('60000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000009', 1, '{}'),
  -- Feature Prioritizer
  ('60000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000010', 1, '{}'),
  -- Demo Agent
  ('60000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000011', 1, '{}');

-- ============================================================
-- 20. AGENT ↔ CONNECTOR MAPPINGS
-- ============================================================
INSERT INTO agent_connectors (agent_id, instance_id, purpose) VALUES
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'Read and update Zendesk tickets'),
  ('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000003', 'Post escalation alerts to Slack'),
  ('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'Pull customer data from Salesforce'),
  ('60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000005', 'Read invoice PDFs from S3'),
  ('60000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000003', 'Send build alerts to Slack'),
  ('60000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000006', 'Post content updates to Slack'),
  ('60000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000007', 'Pull feature requests from HubSpot'),
  ('60000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000008', 'Send output to demo webhook');

-- ============================================================
-- 21. AGENT COLLABORATIONS  (multi-agent)
-- ============================================================
INSERT INTO agent_collaborations (parent_agent_id, child_agent_id, relationship) VALUES
  -- Support Triage Bot delegates to Account Health Checker for context
  ('60000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000002', 'consult'),
  -- PR Reviewer consults Build Monitor for CI status
  ('60000000-0000-4000-8000-000000000006', '60000000-0000-4000-8000-000000000005', 'consult');

-- ============================================================
-- 22. PERSONA ↔ TEMPLATE RECOMMENDATIONS
-- ============================================================
INSERT INTO persona_templates (persona_id, template_id, is_featured) VALUES
  ('e0000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002', TRUE),   -- Sales Rep → Lead Qualifier
  ('e0000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001', TRUE),   -- Support Agent → Support Bot
  ('e0000000-0000-4000-8000-000000000003', '50000000-0000-4000-8000-000000000005', TRUE),   -- DevOps → CI/CD Monitor
  ('e0000000-0000-4000-8000-000000000004', '50000000-0000-4000-8000-000000000003', TRUE),   -- Finance Analyst → Invoice Processing
  ('e0000000-0000-4000-8000-000000000005', '50000000-0000-4000-8000-000000000004', TRUE),   -- HR Manager → Onboarding Bot
  ('e0000000-0000-4000-8000-000000000006', '50000000-0000-4000-8000-000000000006', TRUE),   -- Growth Marketer → Content Writer
  ('e0000000-0000-4000-8000-000000000008', '50000000-0000-4000-8000-000000000007', FALSE);  -- Demo → Blank Agent

-- ============================================================
-- 23. PERSONA ↔ SKILL DEFAULTS
-- ============================================================
INSERT INTO persona_skills (persona_id, skill_id, is_default) VALUES
  ('e0000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', TRUE),   -- Sales → Customer Summary
  ('e0000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', TRUE),   -- Support → Ticket Classifier
  ('e0000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003', TRUE),   -- Support → Response Drafter
  ('e0000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000007', TRUE),   -- DevOps → Log Analyzer
  ('e0000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000008', TRUE),   -- DevOps → Code Reviewer
  ('e0000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000005', TRUE),   -- Finance → Invoice Extractor
  ('e0000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000006', TRUE),   -- HR → PTO Processor
  ('e0000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000009', TRUE);   -- Growth → Blog Post Generator

-- ============================================================
-- 24. PERSONA ↔ CONNECTOR DEFAULTS
-- ============================================================
INSERT INTO persona_connectors (persona_id, connector_id, is_default) VALUES
  ('e0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', TRUE),   -- Sales → Salesforce
  ('e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', TRUE),   -- Support → Zendesk
  ('e0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000003', FALSE),  -- Support → Slack
  ('e0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000003', TRUE),   -- DevOps → Slack
  ('e0000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000006', TRUE);   -- Growth → Google Analytics

-- ============================================================
-- 25. GOVERNANCE POLICIES
-- ============================================================
INSERT INTO governance_policies (policy_id, org_id, name, type, rules, enforcement, status) VALUES
  ('70000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'PII Data Boundary',        'data_boundary',  '{"blocked_fields": ["ssn", "credit_card", "bank_account"], "redaction": true}',                                 'block',  'active'),
  ('70000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Content Safety Filter',    'content_filter',  '{"categories": ["hate_speech", "violence", "self_harm"], "threshold": 0.8}',                                    'block',  'active'),
  ('70000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Agent Rate Limits',        'rate_limit',      '{"max_runs_per_hour": 100, "max_tokens_per_day": 1000000}',                                                     'warn',   'active'),
  ('70000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Role-Based Access',        'access_control',  '{"viewer": ["read"], "builder": ["read", "create", "edit"], "admin": ["read", "create", "edit", "delete"]}',     'block',  'active'),
  ('70000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002', 'TechStart Content Filter', 'content_filter',  '{"categories": ["hate_speech", "violence"], "threshold": 0.9}',                                                 'warn',   'active'),
  ('70000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000002', 'TechStart Rate Limits',    'rate_limit',      '{"max_runs_per_hour": 50, "max_tokens_per_day": 500000}',                                                       'warn',   'active');

-- ============================================================
-- 26. AGENT RUNS  (execution history)
-- ============================================================
INSERT INTO agent_runs (run_id, agent_id, agent_version_id, triggered_by, persona_id, trigger_type, status, input_payload, output_payload, total_tokens, cost_usd, duration_ms, started_at, completed_at) VALUES
  -- Support Triage Bot runs
  ('80000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002', 'manual',   'completed', '{"ticket_id": "TK-1001", "subject": "Cannot login to my account"}',                           '{"category": "technical", "urgency": "high", "draft_reply": "Hi, I understand you are having trouble logging in..."}',  1850, 0.005500, 3200, '2026-03-01 09:15:00+00', '2026-03-01 09:15:03+00'),
  ('80000000-0000-4000-8000-000000000002', '60000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002', 'webhook',  'completed', '{"ticket_id": "TK-1002", "subject": "Billing discrepancy on my invoice"}',                    '{"category": "billing", "urgency": "medium", "draft_reply": "Thank you for reaching out about your billing concern..."}', 2100, 0.006300, 4100, '2026-03-01 10:30:00+00', '2026-03-01 10:30:04+00'),
  ('80000000-0000-4000-8000-000000000003', '60000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000002', NULL,                                   NULL,                                   'webhook',  'completed', '{"ticket_id": "TK-1003", "subject": "Feature request: dark mode"}',                           '{"category": "feature-request", "urgency": "low", "draft_reply": "Thanks for the suggestion! We have logged this..."}',   1600, 0.004800, 2800, '2026-03-01 14:00:00+00', '2026-03-01 14:00:03+00'),
  ('80000000-0000-4000-8000-000000000004', '60000000-0000-4000-8000-000000000001', '61000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002', 'manual',   'failed',    '{"ticket_id": "TK-1004", "subject": "Urgent: production outage"}',                            '{"error": "Connector timeout: Zendesk API unavailable"}',                                                                  500, 0.001500, 15000, '2026-03-02 02:10:00+00', '2026-03-02 02:10:15+00'),
  -- Account Health Checker
  ('80000000-0000-4000-8000-000000000005', '60000000-0000-4000-8000-000000000002', '61000000-0000-4000-8000-000000000003', NULL,                                   NULL,                                   'schedule', 'completed', '{"accounts": ["ACC-100", "ACC-101", "ACC-102"]}',                                             '{"scores": [{"account": "ACC-100", "health": 92}, {"account": "ACC-101", "health": 67}, {"account": "ACC-102", "health": 85}]}', 3500, 0.010500, 8500, '2026-03-01 06:00:00+00', '2026-03-01 06:00:09+00'),
  -- Invoice Processor
  ('80000000-0000-4000-8000-000000000006', '60000000-0000-4000-8000-000000000003', '61000000-0000-4000-8000-000000000004', 'f0000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000004', 'manual',   'completed', '{"document_url": "s3://acme-agent-data/invoices/inv-2026-001.pdf"}',                           '{"line_items": [{"desc": "Consulting", "amount": 5000}, {"desc": "License", "amount": 1200}], "total": 6200}',            2800, 0.008400, 5200, '2026-03-02 11:00:00+00', '2026-03-02 11:00:05+00'),
  -- Build Monitor
  ('80000000-0000-4000-8000-000000000007', '60000000-0000-4000-8000-000000000005', '61000000-0000-4000-8000-000000000006', NULL,                                   NULL,                                   'webhook',  'completed', '{"pipeline": "main-deploy", "commit": "abc123f"}',                                            '{"status": "failure", "errors": ["Test suite timeout in integration tests"], "alert_sent": true}',                          900, 0.002700, 1800, '2026-03-02 15:45:00+00', '2026-03-02 15:45:02+00'),
  -- Blog Writer
  ('80000000-0000-4000-8000-000000000008', '60000000-0000-4000-8000-000000000007', '61000000-0000-4000-8000-000000000007', 'f0000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000006', 'manual',   'completed', '{"brief": "Write about AI agents in enterprise", "keywords": ["AI", "enterprise", "automation"]}', '{"title": "How AI Agents Are Transforming Enterprise Operations", "word_count": 1250}',                                4200, 0.012600, 12000, '2026-03-02 16:00:00+00', '2026-03-02 16:00:12+00'),
  -- Demo Agent
  ('80000000-0000-4000-8000-000000000009', '60000000-0000-4000-8000-000000000009', '61000000-0000-4000-8000-000000000009', 'f0000000-0000-4000-8000-000000000008', 'e0000000-0000-4000-8000-000000000008', 'manual',   'completed', '{"input": "Hello, World!"}',                                                                   '{"output": "Hello, World!"}',                                                                                              150, 0.000450, 500,   '2026-03-03 08:00:00+00', '2026-03-03 08:00:01+00'),
  -- Awaiting human review
  ('80000000-0000-4000-8000-000000000010', '60000000-0000-4000-8000-000000000003', '61000000-0000-4000-8000-000000000004', 'f0000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000004', 'manual',   'awaiting_human', '{"document_url": "s3://acme-agent-data/invoices/inv-2026-002.pdf"}',                      '{"line_items": [{"desc": "Consulting", "amount": 50000}], "total": 50000, "flag": "Amount exceeds auto-approval threshold"}', 2600, 0.007800, 4800, '2026-03-03 09:00:00+00', NULL);

-- ============================================================
-- 27. RUN STEPS
-- ============================================================
INSERT INTO run_steps (step_id, run_id, skill_id, connector_instance_id, step_type, status, input, output, tokens_used, duration_ms) VALUES
  -- Run 1 (Support Triage Bot — completed)
  ('81000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', NULL,                                   'skill',     'success', '{"ticket_text": "Cannot login to my account"}',                   '{"category": "technical", "urgency": "high"}',                    600,  800),
  ('81000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', NULL,                                   'skill',     'success', '{"text": "Cannot login to my account"}',                           '{"sentiment": "frustrated", "score": -0.7}',                     400,  600),
  ('81000000-0000-4000-8000-000000000003', '80000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', NULL,                                   'skill',     'success', '{"ticket": {"category": "technical"}, "kb_context": "..."}',      '{"draft_reply": "Hi, I understand you are having trouble..."}',   850, 1200),
  ('81000000-0000-4000-8000-000000000004', '80000000-0000-4000-8000-000000000001', NULL,                                   '10000000-0000-4000-8000-000000000002', 'connector', 'success', '{"action": "update_ticket", "ticket_id": "TK-1001"}',            '{"updated": true}',                                                 0,  600),
  -- Run 4 (Support Triage Bot — failed)
  ('81000000-0000-4000-8000-000000000005', '80000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', NULL,                                   'skill',     'success', '{"ticket_text": "Urgent: production outage"}',                     '{"category": "technical", "urgency": "critical"}',               500, 700),
  ('81000000-0000-4000-8000-000000000006', '80000000-0000-4000-8000-000000000004', NULL,                                   '10000000-0000-4000-8000-000000000002', 'connector', 'failed',  '{"action": "get_context", "ticket_id": "TK-1004"}',              '{"error": "Connection timeout"}',                                   0, 14000),
  -- Run 6 (Invoice Processor — completed)
  ('81000000-0000-4000-8000-000000000007', '80000000-0000-4000-8000-000000000006', NULL,                                   '10000000-0000-4000-8000-000000000005', 'connector', 'success', '{"action": "download", "key": "invoices/inv-2026-001.pdf"}',     '{"downloaded": true, "size_kb": 240}',                               0,  800),
  ('81000000-0000-4000-8000-000000000008', '80000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000005', NULL,                                   'skill',     'success', '{"document_url": "s3://..."}',                                     '{"line_items": [{"desc": "Consulting", "amount": 5000}], "total": 6200}', 2800, 4200),
  -- Run 7 (Build Monitor — completed)
  ('81000000-0000-4000-8000-000000000009', '80000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000007', NULL,                                   'skill',     'success', '{"log_text": "Error: test timeout at integration/api.test.js"}',  '{"errors": ["test timeout"], "suggestion": "Check API mock server"}', 900, 1200),
  ('81000000-0000-4000-8000-000000000010', '80000000-0000-4000-8000-000000000007', NULL,                                   '10000000-0000-4000-8000-000000000003', 'connector', 'success', '{"action": "post_message", "channel": "#eng-alerts"}',            '{"message_ts": "1709394302.001"}',                                     0,  600),
  -- Run 10 (Invoice Processor — awaiting human gate)
  ('81000000-0000-4000-8000-000000000011', '80000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000005', NULL,                                   'skill',     'success', '{"document_url": "s3://...inv-2026-002.pdf"}',                     '{"line_items": [{"desc": "Consulting", "amount": 50000}], "total": 50000}', 2600, 4000),
  ('81000000-0000-4000-8000-000000000012', '80000000-0000-4000-8000-000000000010', NULL,                                   NULL,                                   'human_gate','success', '{"reason": "Amount $50,000 exceeds auto-approval limit of $10,000"}', '{"awaiting_reviewer": true}',                                       0,  100);

-- ============================================================
-- 28. HUMAN REVIEWS
-- ============================================================
INSERT INTO human_reviews (review_id, run_id, reviewer_id, decision, comments, decided_at) VALUES
  ('82000000-0000-4000-8000-000000000001', '80000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000002', 'approved', 'Reply looks good, sending to customer.',                       '2026-03-01 09:20:00+00'),
  ('82000000-0000-4000-8000-000000000002', '80000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000002', 'modified', 'Added apology and discount code before sending.',             '2026-03-01 10:45:00+00'),
  ('82000000-0000-4000-8000-000000000003', '80000000-0000-4000-8000-000000000006', 'f0000000-0000-4000-8000-000000000004', 'approved', 'Invoice data verified against purchase order.',               '2026-03-02 11:30:00+00');
  -- Note: run 80..0010 is still awaiting_human — no review yet

-- ============================================================
-- 29. USAGE METRICS
-- ============================================================
INSERT INTO usage_metrics (org_id, entity_type, entity_id, persona_id, period, total_runs, total_tokens, total_cost, avg_latency_ms, success_rate, unique_users, period_start) VALUES
  -- Acme Corp — daily metrics for 2026-03-01
  ('a0000000-0000-4000-8000-000000000001', 'agent',     '60000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'daily',   3,  5550, 16.60, 3367.00, 0.6667, 1, '2026-03-01'),
  ('a0000000-0000-4000-8000-000000000001', 'agent',     '60000000-0000-4000-8000-000000000002', NULL,                                   'daily',   1,  3500, 10.50, 8500.00, 1.0000, 0, '2026-03-01'),
  ('a0000000-0000-4000-8000-000000000001', 'skill',     '30000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'daily',   3,  1700,  5.10,  767.00, 1.0000, 1, '2026-03-01'),
  ('a0000000-0000-4000-8000-000000000001', 'connector', '10000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002', 'daily',   3,     0,  0.00,  600.00, 0.6667, 1, '2026-03-01'),
  -- Acme Corp — daily metrics for 2026-03-02
  ('a0000000-0000-4000-8000-000000000001', 'agent',     '60000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000002', 'daily',   1,   500,  1.50, 15000.00, 0.0000, 1, '2026-03-02'),
  ('a0000000-0000-4000-8000-000000000001', 'agent',     '60000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000004', 'daily',   1,  2800,  8.40,  5200.00, 1.0000, 1, '2026-03-02'),
  ('a0000000-0000-4000-8000-000000000001', 'agent',     '60000000-0000-4000-8000-000000000005', NULL,                                   'daily',   1,   900,  2.70,  1800.00, 1.0000, 0, '2026-03-02'),
  -- TechStart — daily metrics for 2026-03-02
  ('a0000000-0000-4000-8000-000000000002', 'agent',     '60000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000006', 'daily',   1,  4200, 12.60, 12000.00, 1.0000, 1, '2026-03-02'),
  -- Acme Corp — weekly rollup
  ('a0000000-0000-4000-8000-000000000001', 'agent',     '60000000-0000-4000-8000-000000000001', NULL,                                   'weekly',  4,  6050, 18.10,  6275.00, 0.7500, 1, '2026-02-24'),
  -- Demo
  ('a0000000-0000-4000-8000-000000000003', 'agent',     '60000000-0000-4000-8000-000000000009', 'e0000000-0000-4000-8000-000000000008', 'daily',   1,   150,  0.45,   500.00, 1.0000, 1, '2026-03-03');

COMMIT;

-- ============================================================
-- Verification queries (uncomment to check counts)
-- ============================================================
-- SELECT 'organizations'       AS tbl, COUNT(*) FROM organizations
-- UNION ALL SELECT 'roles',              COUNT(*) FROM roles
-- UNION ALL SELECT 'connectors',         COUNT(*) FROM connectors
-- UNION ALL SELECT 'workspaces',         COUNT(*) FROM workspaces
-- UNION ALL SELECT 'personas',           COUNT(*) FROM personas
-- UNION ALL SELECT 'users',              COUNT(*) FROM users
-- UNION ALL SELECT 'persona_onboarding', COUNT(*) FROM persona_onboarding
-- UNION ALL SELECT 'persona_contexts',   COUNT(*) FROM persona_contexts
-- UNION ALL SELECT 'connector_instances',COUNT(*) FROM connector_instances
-- UNION ALL SELECT 'knowledge_bases',    COUNT(*) FROM knowledge_bases
-- UNION ALL SELECT 'skills',             COUNT(*) FROM skills
-- UNION ALL SELECT 'skill_versions',     COUNT(*) FROM skill_versions
-- UNION ALL SELECT 'skill_compositions', COUNT(*) FROM skill_compositions
-- UNION ALL SELECT 'documents',          COUNT(*) FROM documents
-- UNION ALL SELECT 'templates',          COUNT(*) FROM templates
-- UNION ALL SELECT 'agents',             COUNT(*) FROM agents
-- UNION ALL SELECT 'agent_versions',     COUNT(*) FROM agent_versions
-- UNION ALL SELECT 'agent_skills',       COUNT(*) FROM agent_skills
-- UNION ALL SELECT 'agent_connectors',   COUNT(*) FROM agent_connectors
-- UNION ALL SELECT 'agent_collaborations', COUNT(*) FROM agent_collaborations
-- UNION ALL SELECT 'persona_templates',  COUNT(*) FROM persona_templates
-- UNION ALL SELECT 'persona_skills',     COUNT(*) FROM persona_skills
-- UNION ALL SELECT 'persona_connectors', COUNT(*) FROM persona_connectors
-- UNION ALL SELECT 'governance_policies',COUNT(*) FROM governance_policies
-- UNION ALL SELECT 'agent_runs',         COUNT(*) FROM agent_runs
-- UNION ALL SELECT 'run_steps',          COUNT(*) FROM run_steps
-- UNION ALL SELECT 'human_reviews',      COUNT(*) FROM human_reviews
-- UNION ALL SELECT 'usage_metrics',      COUNT(*) FROM usage_metrics
-- ORDER BY 1;
