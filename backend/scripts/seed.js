// ============================================================
// Seed Script — Loads default data into prototype_builder
// Run: npm run db:seed
// ============================================================

require('dotenv').config();
const { query, pool } = require('../src/config/db');

async function seed() {
  console.log('🌱 Seeding database...\n');

  try {
    // ----- 0. Schema additions (idempotent) -----
    await query(`
      CREATE TABLE IF NOT EXISTS template_skills (
        template_id     UUID NOT NULL REFERENCES templates(template_id) ON DELETE CASCADE,
        skill_id        UUID NOT NULL REFERENCES skills(skill_id) ON DELETE CASCADE,
        execution_order INT DEFAULT 0,
        PRIMARY KEY (template_id, skill_id)
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS template_connectors (
        template_id     UUID NOT NULL REFERENCES templates(template_id) ON DELETE CASCADE,
        connector_id    UUID NOT NULL REFERENCES connectors(connector_id) ON DELETE CASCADE,
        execution_order INT DEFAULT 0,
        PRIMARY KEY (template_id, connector_id)
      )
    `);
    await query(`ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_category_check`);
    await query(`ALTER TABLE templates ADD CONSTRAINT templates_category_check CHECK (category IN ('support','sales','ops','hr','finance','custom','analytics','knowledge'))`);

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
      { name: 'Salesforce',     type: 'saas', provider: 'salesforce',   category: 'crm',           auth_methods: ['oauth2'], config_schema: {
        fields: [
          { name: 'instance_url', type: 'text', label: 'Salesforce Instance URL', placeholder: 'https://yourcompany.my.salesforce.com', required: true },
          { name: 'client_id', type: 'text', label: 'Connected App Client ID', required: true },
          { name: 'client_secret', type: 'password', label: 'Connected App Client Secret', required: true },
          { name: 'sandbox', type: 'boolean', label: 'Use Sandbox', default: true },
        ],
      }},
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
        `INSERT INTO connectors (name, type, provider, category, auth_methods, config_schema)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING connector_id`,
        [c.name, c.type, c.provider, c.category, JSON.stringify(c.auth_methods), JSON.stringify(c.config_schema || {})]
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

    // ----- 8b. Skill Versions -----
    console.log('  → Skill versions (Email Drafter + Lead Scorer)');

    // Lead Scorer v1.0.0 (published)
    await query(
      `INSERT INTO skill_versions (skill_id, version_number, status, prompt_config, model_settings)
       VALUES ($1, '1.0.0', 'published', $2, $3)`,
      [
        skillIds['Lead Scorer'],
        JSON.stringify({
          system_prompt: "You are a B2B lead scoring engine. Analyze the lead's title, company size signals, deal stage, engagement score, and source channel. Return a classification (Hot/Warm/Cold), a confidence score, reasoning, and a recommended next action.",
          user_template: "Score this lead:\n\nName: {{name}}\nCompany: {{company}}\nTitle: {{title}}\nDeal Value: ${{deal_value}}\nStage: {{stage}}\nEngagement Score: {{lead_score}}/100\nSource: {{source}}\n\nClassify as Hot, Warm, or Cold with reasoning.",
        }),
        JSON.stringify({
          model: 'gpt-4o',
          temperature: 0.3,
          max_tokens: 512,
        }),
      ]
    );

    // Email Drafter versions
    await query(
      `INSERT INTO skill_versions (skill_id, version_number, status, prompt_config, model_settings)
       VALUES ($1, '1.0.0', 'published', $2, $3)`,
      [
        skillIds['Email Drafter'],
        JSON.stringify({
          system_prompt: 'You are a professional email writer for a B2B SaaS company. Write clear, warm, and action-oriented emails. Always include a specific next step or CTA. Keep emails under 200 words.',
          user_template: 'Write a reply to {{customer_name}} who asked: {{inquiry}}\n\nTone: {{tone}}\nInclude a specific call-to-action.',
        }),
        JSON.stringify({
          model: 'gpt-4o',
          temperature: 0.7,
          max_tokens: 1024,
        }),
      ]
    );
    await query(
      `INSERT INTO skill_versions (skill_id, version_number, status, prompt_config, model_settings)
       VALUES ($1, '2.0.0', 'draft', $2, $3)`,
      [
        skillIds['Email Drafter'],
        JSON.stringify({
          system_prompt: 'You are a professional email writer for a B2B SaaS company. Write clear, warm, and action-oriented emails. Always include a specific next step or CTA. Keep emails under 200 words. Use the customer\'s first name. Reference their specific question in the opening line.',
          user_template: 'Write a reply to {{customer_name}} regarding: {{inquiry}}\n\nTone: {{tone}}\nMirror the customer\'s language where appropriate.\nInclude a specific, time-bound call-to-action.',
        }),
        JSON.stringify({
          model: 'gpt-4o',
          temperature: 0.65,
          max_tokens: 1024,
        }),
      ]
    );

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
      { name: 'Lead Qualification Agent',       category: 'sales',     tier: 'no-code',  description: 'Pulls leads from your CRM, scores them by engagement and deal potential, then drafts personalized follow-up emails. Perfect for sales teams who want to prioritize outreach without manual research.' },
      { name: 'Customer Support Triage Agent',  category: 'support',   tier: 'no-code',  description: 'Classifies incoming support tickets by urgency and category, then routes to the right team with a suggested response.' },
      { name: 'Document Q&A Agent',             category: 'knowledge', tier: 'no-code',  description: 'Upload company documents and ask questions in natural language. The agent retrieves relevant sections and generates accurate answers with source citations.' },
      { name: 'Weekly Report Generator',        category: 'analytics', tier: 'low-code', description: 'Connects to your database, pulls key metrics, and generates a formatted executive summary every Monday morning.' },
      { name: 'Employee Onboarding Guide',      category: 'hr',        tier: 'no-code',  description: 'Walks new employees through onboarding steps and answers common questions' },
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

    // ----- 10b. Template ↔ Skills & Connectors -----
    console.log('  → Template skills & connectors');
    const templateLinks = [
      { template: 'Lead Qualification Agent',
        skills: [{ name: 'Lead Scorer', order: 1 }, { name: 'Email Drafter', order: 2 }],
        connectors: [{ name: 'Salesforce', order: 0 }] },
      { template: 'Customer Support Triage Agent',
        skills: [{ name: 'Ticket Classifier', order: 1 }, { name: 'Email Drafter', order: 2 }],
        connectors: [{ name: 'Zendesk', order: 0 }] },
      { template: 'Weekly Report Generator',
        skills: [{ name: 'Data Transformer', order: 1 }, { name: 'Report Generator', order: 2 }],
        connectors: [{ name: 'PostgreSQL', order: 0 }] },
      { template: 'Document Q&A Agent',
        skills: [{ name: 'Document Summarizer', order: 1 }],
        connectors: [{ name: 'SharePoint', order: 0 }] },
    ];
    for (const tl of templateLinks) {
      for (const s of tl.skills) {
        await query(
          `INSERT INTO template_skills (template_id, skill_id, execution_order) VALUES ($1, $2, $3)`,
          [templateIds[tl.template], skillIds[s.name], s.order]
        );
      }
      for (const c of tl.connectors) {
        await query(
          `INSERT INTO template_connectors (template_id, connector_id, execution_order) VALUES ($1, $2, $3)`,
          [templateIds[tl.template], connectorIds[c.name], c.order]
        );
      }
    }

    // ----- 11. Persona ↔ Template recommendations -----
    console.log('  → Persona-template mappings');
    const personaTemplates = [
      { persona: 'Sales Rep',         templates: ['Lead Qualification Agent'] },
      { persona: 'Support Agent',     templates: ['Customer Support Triage Agent', 'Document Q&A Agent'] },
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

    // ----- 14. Lead Qualification Bot (demo agent) -----
    console.log('  → Lead Qualification Bot agent');

    // Create a Salesforce connector instance for the demo org
    const sfInstanceResult = await query(
      `INSERT INTO connector_instances (connector_id, org_id, name, connection_config, status)
       VALUES ($1, $2, 'Acme Salesforce (Sandbox)', $3, 'active') RETURNING instance_id`,
      [
        connectorIds['Salesforce'],
        orgId,
        JSON.stringify({ instance_url: 'https://acme-corp.my.salesforce.com', sandbox: true }),
      ]
    );
    const sfInstanceId = sfInstanceResult.rows[0].instance_id;

    // Create the agent
    const agentResult = await query(
      `INSERT INTO agents (workspace_id, name, description, builder_tier, status)
       VALUES ($1, 'Lead Qualification Bot', 'Pulls leads from Salesforce, scores them, and drafts personalized follow-up emails', 'no-code', 'active')
       RETURNING agent_id`,
      [wsId]
    );
    const lqAgentId = agentResult.rows[0].agent_id;

    // Link skills to agent
    await query(
      `INSERT INTO agent_skills (agent_id, skill_id, execution_order) VALUES ($1, $2, 1)`,
      [lqAgentId, skillIds['Lead Scorer']]
    );
    await query(
      `INSERT INTO agent_skills (agent_id, skill_id, execution_order) VALUES ($1, $2, 2)`,
      [lqAgentId, skillIds['Email Drafter']]
    );

    // Link Salesforce connector instance to agent
    await query(
      `INSERT INTO agent_connectors (agent_id, instance_id, purpose) VALUES ($1, $2, 'Pull lead data')`,
      [lqAgentId, sfInstanceId]
    );

    console.log('\n✅ Seed complete!');
    console.log(`   Org: ${orgId}`);
    console.log(`   Workspace: ${wsId}`);
    console.log(`   Personas: ${Object.keys(personaIds).length}`);
    console.log(`   Connectors: ${Object.keys(connectorIds).length}`);
    console.log(`   Skills: ${Object.keys(skillIds).length}`);
    console.log(`   Templates: ${Object.keys(templateIds).length}`);
    console.log(`   Agent: Lead Qualification Bot (${lqAgentId})`);

  } catch (err) {
    console.error('❌ Seed failed:', err);
  } finally {
    await pool.end();
  }
}

seed();
