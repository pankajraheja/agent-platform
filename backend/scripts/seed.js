// ============================================================
// Seed Script — Loads default data into prototype_builder
// Run: npm run db:seed
// ============================================================

require('dotenv').config();
const { query, pool } = require('../src/config/db');

async function seed() {
  console.log('🌱 Seeding database...\n');

  try {
    // ----- 1. Default Roles -----
    console.log('  → Roles');
    const roles = [
      { name: 'viewer',    permissions: { read: true } },
      { name: 'builder',   permissions: { read: true, create: true, edit: true } },
      { name: 'admin',     permissions: { read: true, create: true, edit: true, delete: true, manage_workspace: true } },
      { name: 'org_admin', permissions: { read: true, create: true, edit: true, delete: true, manage_workspace: true, manage_org: true } },
    ];
    for (const role of roles) {
      await query(
        `INSERT INTO roles (name, permissions) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING`,
        [role.name, JSON.stringify(role.permissions)]
      );
    }

    // ----- 2. Demo Organization + Workspace -----
    console.log('  → Demo org & workspace');
    const orgResult = await query(
      `INSERT INTO organizations (name, plan) VALUES ('Acme Corp (Demo)', 'growth') RETURNING org_id`
    );
    const orgId = orgResult.rows[0].org_id;

    const wsResult = await query(
      `INSERT INTO workspaces (org_id, name, description)
       VALUES ($1, 'Default Workspace', 'Primary workspace for demo') RETURNING workspace_id`,
      [orgId]
    );
    const wsId = wsResult.rows[0].workspace_id;

    // ----- 3. Default Personas -----
    console.log('  → Personas');
    const personas = [
      { name: 'Sales Rep',         department: 'sales',       default_tier: 'no-code',  icon: '💼', description: 'Field and inside sales representatives focused on pipeline and deal management' },
      { name: 'Support Agent',     department: 'support',     default_tier: 'no-code',  icon: '🎧', description: 'Customer support and success team members handling tickets and inquiries' },
      { name: 'Business Analyst',  department: 'ops',         default_tier: 'low-code', icon: '📊', description: 'Analysts who build reports, automate data flows, and derive insights' },
      { name: 'HR Specialist',     department: 'hr',          default_tier: 'no-code',  icon: '👥', description: 'HR team members managing recruiting, onboarding, and employee experience' },
      { name: 'Marketing Manager', department: 'marketing',   default_tier: 'no-code',  icon: '📣', description: 'Marketing professionals managing campaigns, content, and analytics' },
      { name: 'Developer',         department: 'engineering', default_tier: 'pro-code', icon: '🔥', description: 'Software engineers building custom integrations and advanced agents' },
      { name: 'Finance Analyst',   department: 'finance',     default_tier: 'low-code', icon: '💰', description: 'Finance team members handling reporting, forecasting, and compliance' },
    ];

    const personaIds = {};
    for (const p of personas) {
      const result = await query(
        `INSERT INTO personas (org_id, name, description, department, default_tier, icon)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING persona_id`,
        [orgId, p.name, p.description, p.department, p.default_tier, p.icon]
      );
      personaIds[p.name] = result.rows[0].persona_id;
    }

    // ----- 4. Persona Contexts (default system prompts) -----
    console.log('  → Persona contexts');
    const contexts = [
      { persona: 'Sales Rep',     context_type: 'system_prompt', name: 'Default Tone', value: 'You are a helpful sales assistant. Be concise, action-oriented, and focused on pipeline metrics and deal progress.' },
      { persona: 'Support Agent', context_type: 'system_prompt', name: 'Default Tone', value: 'You are a customer support assistant. Be empathetic, solution-focused, and always check the knowledge base before responding.' },
      { persona: 'Developer',     context_type: 'system_prompt', name: 'Default Tone', value: 'You are a technical assistant. Be precise, include code examples where relevant, and reference documentation.' },
    ];
    for (const c of contexts) {
      await query(
        `INSERT INTO persona_contexts (persona_id, context_type, name, value)
         VALUES ($1, $2, $3, $4)`,
        [personaIds[c.persona], c.context_type, c.name, c.value]
      );
    }

    // ----- 5. Persona Onboarding Steps -----
    console.log('  → Persona onboarding');
    const onboarding = [
      { persona: 'Sales Rep', steps: [
        { step_type: 'tutorial',     step_order: 1, title: 'Welcome to Agent Builder',     content: 'Learn how to create your first sales agent in 5 minutes' },
        { step_type: 'sample_agent', step_order: 2, title: 'Try: Lead Qualifier Agent',    content: 'A pre-built agent that scores and qualifies inbound leads' },
        { step_type: 'skill_intro',  step_order: 3, title: 'Explore Sales Skills',         content: 'Discover reusable skills like email drafting, CRM lookup, and deal summarization' },
      ]},
      { persona: 'Support Agent', steps: [
        { step_type: 'tutorial',     step_order: 1, title: 'Welcome to Agent Builder',     content: 'Learn how to create a support agent that resolves tickets faster' },
        { step_type: 'sample_agent', step_order: 2, title: 'Try: Ticket Triage Agent',     content: 'A pre-built agent that classifies and routes support tickets' },
        { step_type: 'skill_intro',  step_order: 3, title: 'Explore Support Skills',       content: 'Discover skills like sentiment analysis, KB search, and response drafting' },
      ]},
    ];
    for (const o of onboarding) {
      for (const step of o.steps) {
        await query(
          `INSERT INTO persona_onboarding (persona_id, step_type, step_order, title, content)
           VALUES ($1, $2, $3, $4, $5)`,
          [personaIds[o.persona], step.step_type, step.step_order, step.title, step.content]
        );
      }
    }

    // ----- 6. Default Connectors -----
    console.log('  → Connectors');
    const connectors = [
      { name: 'Salesforce',     type: 'saas', provider: 'salesforce',   category: 'crm',           auth_methods: ['oauth2'] },
      { name: 'HubSpot',        type: 'saas', provider: 'hubspot',     category: 'crm',           auth_methods: ['oauth2', 'api_key'] },
      { name: 'Zendesk',        type: 'saas', provider: 'zendesk',     category: 'ticketing',     auth_methods: ['oauth2', 'api_key'] },
      { name: 'Jira',           type: 'saas', provider: 'jira',        category: 'ticketing',     auth_methods: ['oauth2'] },
      { name: 'Slack',          type: 'saas', provider: 'slack',       category: 'communication', auth_methods: ['oauth2'] },
      { name: 'Microsoft Teams',type: 'saas', provider: 'ms_teams',    category: 'communication', auth_methods: ['oauth2'] },
      { name: 'PostgreSQL',     type: 'database', provider: 'postgres',category: 'storage',       auth_methods: ['basic'] },
      { name: 'REST API',       type: 'rest_api', provider: 'custom',  category: 'custom',        auth_methods: ['api_key', 'oauth2', 'basic'] },
      { name: 'SharePoint',     type: 'saas', provider: 'sharepoint',  category: 'storage',       auth_methods: ['oauth2'] },
      { name: 'Google Sheets',  type: 'saas', provider: 'gsheets',     category: 'analytics',     auth_methods: ['oauth2'] },
    ];

    const connectorIds = {};
    for (const c of connectors) {
      const result = await query(
        `INSERT INTO connectors (name, type, provider, category, auth_methods)
         VALUES ($1, $2, $3, $4, $5) RETURNING connector_id`,
        [c.name, c.type, c.provider, c.category, JSON.stringify(c.auth_methods)]
      );
      connectorIds[c.name] = result.rows[0].connector_id;
    }

    // ----- 7. Persona ↔ Connector defaults -----
    console.log('  → Persona-connector mappings');
    const personaConnectors = [
      { persona: 'Sales Rep',         connectors: ['Salesforce', 'HubSpot', 'Slack'] },
      { persona: 'Support Agent',     connectors: ['Zendesk', 'Slack', 'Jira'] },
      { persona: 'Business Analyst',  connectors: ['PostgreSQL', 'Google Sheets', 'REST API'] },
      { persona: 'Developer',         connectors: ['PostgreSQL', 'REST API', 'Jira'] },
      { persona: 'Marketing Manager', connectors: ['HubSpot', 'Slack', 'Google Sheets'] },
    ];
    for (const pc of personaConnectors) {
      for (const connName of pc.connectors) {
        await query(
          `INSERT INTO persona_connectors (persona_id, connector_id, is_default) VALUES ($1, $2, TRUE)`,
          [personaIds[pc.persona], connectorIds[connName]]
        );
      }
    }

    // ----- 8. Default Skills -----
    console.log('  → Skills');
    const skills = [
      { name: 'Email Drafter',        category: 'generate',   description: 'Generates professional email drafts based on context and intent' },
      { name: 'Document Summarizer',   category: 'summarize',  description: 'Summarizes documents, articles, and long-form content' },
      { name: 'Ticket Classifier',     category: 'classify',   description: 'Classifies support tickets by category, priority, and sentiment' },
      { name: 'Lead Scorer',           category: 'classify',   description: 'Scores and qualifies leads based on firmographic and behavioral data' },
      { name: 'Invoice Extractor',     category: 'extract',    description: 'Extracts structured data from invoices and receipts' },
      { name: 'Meeting Note Taker',    category: 'summarize',  description: 'Generates structured meeting notes with action items' },
      { name: 'Response Generator',    category: 'generate',   description: 'Drafts contextual responses using knowledge base content' },
      { name: 'Data Transformer',      category: 'transform',  description: 'Transforms data between formats (CSV, JSON, structured text)' },
      { name: 'Sentiment Analyzer',    category: 'classify',   description: 'Analyzes sentiment and emotional tone in text' },
      { name: 'Report Generator',      category: 'generate',   description: 'Creates formatted reports from structured data inputs' },
    ];

    const skillIds = {};
    for (const s of skills) {
      const result = await query(
        `INSERT INTO skills (workspace_id, name, description, category, visibility)
         VALUES ($1, $2, $3, $4, 'org') RETURNING skill_id`,
        [wsId, s.name, s.description, s.category]
      );
      skillIds[s.name] = result.rows[0].skill_id;
    }

    // ----- 9. Persona ↔ Skill recommendations -----
    console.log('  → Persona-skill mappings');
    const personaSkills = [
      { persona: 'Sales Rep',         skills: ['Email Drafter', 'Lead Scorer', 'Meeting Note Taker'] },
      { persona: 'Support Agent',     skills: ['Ticket Classifier', 'Response Generator', 'Sentiment Analyzer'] },
      { persona: 'Business Analyst',  skills: ['Document Summarizer', 'Data Transformer', 'Report Generator'] },
      { persona: 'Finance Analyst',   skills: ['Invoice Extractor', 'Data Transformer', 'Report Generator'] },
      { persona: 'Marketing Manager', skills: ['Email Drafter', 'Sentiment Analyzer', 'Document Summarizer'] },
    ];
    for (const ps of personaSkills) {
      for (const skillName of ps.skills) {
        await query(
          `INSERT INTO persona_skills (persona_id, skill_id, is_default) VALUES ($1, $2, TRUE)`,
          [personaIds[ps.persona], skillIds[skillName]]
        );
      }
    }

    // ----- 10. Default Templates -----
    console.log('  → Templates');
    const templates = [
      { name: 'Lead Qualification Agent',   category: 'sales',   tier: 'no-code',  description: 'Automatically scores and qualifies inbound leads from your CRM' },
      { name: 'Ticket Triage Agent',        category: 'support', tier: 'no-code',  description: 'Classifies, prioritizes, and routes incoming support tickets' },
      { name: 'Document Q&A Agent',         category: 'ops',     tier: 'no-code',  description: 'Answers questions about uploaded documents using RAG' },
      { name: 'Weekly Report Generator',    category: 'ops',     tier: 'low-code', description: 'Pulls data from connected sources and generates a weekly summary report' },
      { name: 'Employee Onboarding Guide',  category: 'hr',      tier: 'no-code',  description: 'Walks new employees through onboarding steps and answers common questions' },
    ];

    const templateIds = {};
    for (const t of templates) {
      const result = await query(
        `INSERT INTO templates (workspace_id, name, description, category, builder_tier, visibility)
         VALUES ($1, $2, $3, $4, $5, 'org') RETURNING template_id`,
        [wsId, t.name, t.description, t.category, t.tier]
      );
      templateIds[t.name] = result.rows[0].template_id;
    }

    // ----- 11. Persona ↔ Template recommendations -----
    console.log('  → Persona-template mappings');
    const personaTemplates = [
      { persona: 'Sales Rep',         templates: ['Lead Qualification Agent'] },
      { persona: 'Support Agent',     templates: ['Ticket Triage Agent', 'Document Q&A Agent'] },
      { persona: 'Business Analyst',  templates: ['Weekly Report Generator', 'Document Q&A Agent'] },
      { persona: 'HR Specialist',     templates: ['Employee Onboarding Guide'] },
    ];
    for (const pt of personaTemplates) {
      for (const tplName of pt.templates) {
        await query(
          `INSERT INTO persona_templates (persona_id, template_id, is_featured) VALUES ($1, $2, TRUE)`,
          [personaIds[pt.persona], templateIds[tplName]]
        );
      }
    }

    // ----- 12. Demo Users -----
    console.log('  → Demo users');
    const builderRole = await query(`SELECT role_id FROM roles WHERE name = 'builder'`);
    await query(
      `INSERT INTO users (org_id, persona_id, role_id, email, display_name, preferred_tier)
       VALUES ($1, $2, $3, 'demo@acmecorp.com', 'Demo Builder', 'no-code')
       ON CONFLICT (email) DO NOTHING`,
      [orgId, personaIds['Sales Rep'], builderRole.rows[0].role_id]
    );
    await query(
      `INSERT INTO users (org_id, persona_id, role_id, email, display_name, preferred_tier)
       VALUES ($1, $2, $3, 'demo@acme.com', 'Demo User', 'low-code')
       ON CONFLICT (email) DO NOTHING`,
      [orgId, personaIds['Business Analyst'], builderRole.rows[0].role_id]
    );

    // ----- 13. Default Governance Policies -----
    console.log('  → Governance policies');
    const policies = [
      { name: 'Content Safety Filter',  type: 'content_filter', enforcement: 'block',
        rules: { block_pii: true, block_profanity: true, max_output_tokens: 4096 } },
      { name: 'Rate Limit — Standard',  type: 'rate_limit',     enforcement: 'block',
        rules: { max_runs_per_hour: 100, max_runs_per_day: 1000 } },
      { name: 'Audit Logging',          type: 'access_control', enforcement: 'log',
        rules: { log_all_runs: true, log_connector_access: true } },
    ];
    for (const p of policies) {
      await query(
        `INSERT INTO governance_policies (org_id, name, type, enforcement, rules)
         VALUES ($1, $2, $3, $4, $5)`,
        [orgId, p.name, p.type, p.enforcement, JSON.stringify(p.rules)]
      );
    }

    console.log('\n✅ Seed complete!');
    console.log(`   Org: ${orgId}`);
    console.log(`   Workspace: ${wsId}`);
    console.log(`   Personas: ${Object.keys(personaIds).length}`);
    console.log(`   Connectors: ${Object.keys(connectorIds).length}`);
    console.log(`   Skills: ${Object.keys(skillIds).length}`);
    console.log(`   Templates: ${Object.keys(templateIds).length}`);

  } catch (err) {
    console.error('❌ Seed failed:', err);
  } finally {
    await pool.end();
  }
}

seed();
