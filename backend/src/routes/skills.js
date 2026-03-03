const express = require('express');
const router = express.Router();
const { Skill, SkillVersion } = require('../models');
const { query } = require('../config/db');
const { crudRoutes } = require('./_factory');

router.use('/', crudRoutes(Skill, 'skill_id'));

// ----- VERSIONS -----
router.get('/:skillId/versions', async (req, res, next) => {
  try {
    const items = await SkillVersion.findAll(
      { skill_id: req.params.skillId },
      { orderBy: 'created_at DESC' }
    );
    res.json({ data: items });
  } catch (err) { next(err); }
});

router.post('/:skillId/versions', async (req, res, next) => {
  try {
    const item = await SkillVersion.create({
      skill_id: req.params.skillId,
      ...req.body,
    });
    res.status(201).json({ data: item });
  } catch (err) { next(err); }
});

// ----- PUBLISH VERSION -----
router.post('/:skillId/versions/:versionId/publish', async (req, res, next) => {
  try {
    const { skillId, versionId } = req.params;

    // Deprecate any currently published versions for this skill
    await query(
      `UPDATE skill_versions SET status = 'deprecated' WHERE skill_id = $1 AND status = 'published'`,
      [skillId]
    );

    // Promote the target version to published
    const updated = await SkillVersion.update(versionId, { status: 'published' });
    if (!updated) return res.status(404).json({ error: { message: 'Version not found' } });

    res.json({ data: updated });
  } catch (err) { next(err); }
});

// ----- TEST EXECUTION -----
const EMAIL_DRAFTER_RESPONSES = {
  pricing: {
    subject: 'Re: Enterprise Plan Pricing Inquiry',
    body: `Hi {{name}},

Thank you for your interest in our Enterprise plan. I'd be happy to walk you through the details.

Our Enterprise plan starts at $2,400/year per seat and includes:
\u2022 Unlimited AI agent deployments
\u2022 Priority support with a dedicated success manager
\u2022 Custom connector development
\u2022 SSO via Azure Entra ID and advanced RBAC
\u2022 99.9% uptime SLA

For teams of 50+, we offer volume discounts. I'd love to schedule a quick call to understand your team's needs and put together a tailored proposal.

Would Tuesday at 2pm EST work for a 20-minute walkthrough?

Best regards,
Alex Morgan
Enterprise Account Executive`,
  },
  demo: {
    subject: 'Re: Product Demo Request',
    body: `Hi {{name}},

Thanks for reaching out! I'd love to show you how our platform can help your team.

I've put together a personalized demo that covers:
\u2022 Building your first AI agent in under 5 minutes (no code required)
\u2022 Connecting to your existing tools (Salesforce, Slack, Jira, etc.)
\u2022 Real-time monitoring and governance controls
\u2022 Team collaboration and version management

Our demos typically run 30 minutes and I'll tailor it to your specific use case. I have availability this week on:
- Wednesday at 10am EST
- Thursday at 2pm EST
- Friday at 11am EST

Which time works best for you? Feel free to invite any colleagues who'd like to join.

Looking forward to it,
Alex Morgan
Enterprise Account Executive`,
  },
  support: {
    subject: 'Re: Support & Onboarding Question',
    body: `Hi {{name}},

Great question — we take onboarding and ongoing support very seriously.

Here's what's included with every plan:
\u2022 Dedicated onboarding specialist for the first 30 days
\u2022 24/7 email support with < 4 hour response time
\u2022 Live chat support during business hours (9am-6pm EST)
\u2022 Comprehensive documentation and video tutorials
\u2022 Monthly office hours with our product team

Enterprise customers also get:
\u2022 Dedicated Customer Success Manager
\u2022 Slack Connect channel for real-time collaboration
\u2022 Quarterly business reviews

Would you like me to connect you with our Head of Customer Success for a deeper dive?

Best,
Alex Morgan
Enterprise Account Executive`,
  },
  integration: {
    subject: 'Re: Integration Capabilities',
    body: `Hi {{name}},

Absolutely — integrations are one of our strongest areas. Let me break down what's available.

Out-of-the-box connectors (20+ and growing):
\u2022 CRM: Salesforce, HubSpot, Dynamics 365
\u2022 Ticketing: Zendesk, Jira, ServiceNow
\u2022 Communication: Slack, Microsoft Teams, Gmail
\u2022 Data: PostgreSQL, Snowflake, BigQuery, Google Sheets
\u2022 Storage: SharePoint, Google Drive, S3

For custom integrations, our REST API connector lets you connect to any system with an API. Enterprise plans include custom connector development by our team.

All connectors support OAuth 2.0 and encrypted credential storage. Setup typically takes under 10 minutes.

Want me to walk you through connecting your specific stack?

Cheers,
Alex Morgan
Enterprise Account Executive`,
  },
};

function detectEmailCategory(input) {
  const text = JSON.stringify(input).toLowerCase();
  if (text.includes('pricing') || text.includes('cost') || text.includes('price') || text.includes('plan'))
    return 'pricing';
  if (text.includes('demo') || text.includes('trial') || text.includes('walkthrough'))
    return 'demo';
  if (text.includes('support') || text.includes('help') || text.includes('onboard'))
    return 'support';
  if (text.includes('integrat') || text.includes('connect') || text.includes('api'))
    return 'integration';
  return 'pricing'; // default fallback
}

function buildEmailResponse(input) {
  const category = detectEmailCategory(input);
  const template = EMAIL_DRAFTER_RESPONSES[category];

  // Extract customer name from input
  let name = 'there';
  if (typeof input === 'object') {
    name = input.customer_name || input.name || 'there';
    // Use first name only
    if (name.includes(' ')) name = name.split(' ')[0];
  }

  const subject = template.subject;
  const body = template.body.replace(/\{\{name\}\}/g, name);

  return `Subject: ${subject}\n\n${body}`;
}

router.post('/:skillId/test', async (req, res, next) => {
  try {
    const skill = await Skill.findById(req.params.skillId);
    if (!skill) return res.status(404).json({ error: { message: 'Skill not found' } });

    const { input, version_id } = req.body;
    const startTime = Date.now();

    let result;
    let tokens;

    if (skill.name.toLowerCase().includes('email drafter')) {
      // Parse input — accept both string and object
      let parsedInput = input;
      if (typeof input === 'string') {
        try { parsedInput = JSON.parse(input); } catch { parsedInput = { inquiry: input }; }
      }

      result = buildEmailResponse(parsedInput || {});
      tokens = 200 + Math.floor(Math.random() * 200); // 200-400 tokens
    } else {
      // Generic mock for other skills
      result = `[Mock Output] Skill "${skill.name}" executed successfully with input: ${JSON.stringify(input).substring(0, 200)}`;
      tokens = 50 + Math.floor(Math.random() * 100);
    }

    // Simulate realistic latency (400-800ms)
    const simulatedLatency = 400 + Math.floor(Math.random() * 400);
    await new Promise((resolve) => setTimeout(resolve, simulatedLatency));

    const latencyMs = Date.now() - startTime;

    res.json({
      data: {
        result,
        tokens_used: tokens,
        latency_ms: latencyMs,
        model: 'gpt-4o (mock)',
        version_id: version_id || null,
        executed_at: new Date().toISOString(),
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
