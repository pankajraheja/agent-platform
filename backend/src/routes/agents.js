const express = require('express');
const router = express.Router();
const { Agent, AgentVersion, AgentRun, RunStep } = require('../models');
const { query } = require('../config/db');

// ----- CRUD (inline to avoid sub-router conflicts) -----
router.get('/', async (req, res, next) => {
  try {
    const { limit, offset, orderBy, ...filters } = req.query;
    const items = await Agent.findAll(filters, {
      limit: parseInt(limit) || 50, offset: parseInt(offset) || 0,
      orderBy: orderBy || 'created_at DESC',
    });
    const count = await Agent.count(filters);
    res.json({ data: items, total: count });
  } catch (err) { next(err); }
});
router.post('/', async (req, res, next) => {
  try { res.status(201).json({ data: await Agent.create(req.body) }); } catch (err) { next(err); }
});
router.put('/:id', async (req, res, next) => {
  try {
    const item = await Agent.update(req.params.id, req.body);
    if (!item) return res.status(404).json({ error: { message: 'Not found' } });
    res.json({ data: item });
  } catch (err) { next(err); }
});
router.delete('/:id', async (req, res, next) => {
  try {
    const item = await Agent.remove(req.params.id);
    if (!item) return res.status(404).json({ error: { message: 'Not found' } });
    res.json({ data: item, message: 'Deleted' });
  } catch (err) { next(err); }
});

// ----- VERSIONS -----
router.get('/:agentId/versions', async (req, res, next) => {
  try {
    const items = await AgentVersion.findAll(
      { agent_id: req.params.agentId },
      { orderBy: 'created_at DESC' }
    );
    res.json({ data: items });
  } catch (err) { next(err); }
});

router.post('/:agentId/versions', async (req, res, next) => {
  try {
    const item = await AgentVersion.create({
      agent_id: req.params.agentId,
      ...req.body,
    });
    res.status(201).json({ data: item });
  } catch (err) { next(err); }
});

// ----- LINKED SKILLS -----
router.get('/:agentId/skills', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT s.*, ags.execution_order, ags.config_override
       FROM agent_skills ags
       JOIN skills s ON s.skill_id = ags.skill_id
       WHERE ags.agent_id = $1
       ORDER BY ags.execution_order`, [req.params.agentId]
    );
    res.json({ data: result.rows });
  } catch (err) { next(err); }
});

router.post('/:agentId/skills', async (req, res, next) => {
  try {
    const { skill_id, execution_order = 0, config_override = {} } = req.body;
    await query(
      `INSERT INTO agent_skills (agent_id, skill_id, execution_order, config_override)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (agent_id, skill_id) DO UPDATE SET execution_order = $3, config_override = $4`,
      [req.params.agentId, skill_id, execution_order, JSON.stringify(config_override)]
    );
    res.status(201).json({ message: 'Skill linked' });
  } catch (err) { next(err); }
});

router.delete('/:agentId/skills/:skillId', async (req, res, next) => {
  try {
    await query(
      `DELETE FROM agent_skills WHERE agent_id = $1 AND skill_id = $2`,
      [req.params.agentId, req.params.skillId]
    );
    res.json({ message: 'Skill unlinked' });
  } catch (err) { next(err); }
});

// ----- LINKED CONNECTORS -----
router.get('/:agentId/connectors', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT ci.*, ac.purpose, c.name as connector_name, c.provider, c.category, c.connector_id
       FROM agent_connectors ac
       JOIN connector_instances ci ON ci.instance_id = ac.instance_id
       JOIN connectors c ON c.connector_id = ci.connector_id
       WHERE ac.agent_id = $1`, [req.params.agentId]
    );
    res.json({ data: result.rows });
  } catch (err) { next(err); }
});

router.post('/:agentId/connectors', async (req, res, next) => {
  try {
    const { instance_id, purpose = '' } = req.body;
    await query(
      `INSERT INTO agent_connectors (agent_id, instance_id, purpose)
       VALUES ($1, $2, $3)
       ON CONFLICT (agent_id, instance_id) DO UPDATE SET purpose = $3`,
      [req.params.agentId, instance_id, purpose]
    );
    res.status(201).json({ message: 'Connector linked' });
  } catch (err) { next(err); }
});

router.delete('/:agentId/connectors/:instanceId', async (req, res, next) => {
  try {
    await query(
      `DELETE FROM agent_connectors WHERE agent_id = $1 AND instance_id = $2`,
      [req.params.agentId, req.params.instanceId]
    );
    res.json({ message: 'Connector unlinked' });
  } catch (err) { next(err); }
});

// ============================================================
// RUN AGENT — deterministic pipeline simulator
// ============================================================

const SALESFORCE_LEADS = [
  { name: 'Sarah Chen', company: 'Meridian Health Systems', title: 'VP of Operations', deal_value: 185000, stage: 'Negotiation', lead_score: 87, source: 'Webinar' },
  { name: 'Marcus Johnson', company: 'TechForge Industries', title: 'CTO', deal_value: 340000, stage: 'Discovery', lead_score: 62, source: 'LinkedIn' },
  { name: 'David Okafor', company: 'Atlas Financial Partners', title: 'Head of Strategy', deal_value: 520000, stage: 'Qualification', lead_score: 45, source: 'Cold Outreach' },
  { name: 'Rachel Kim', company: 'Vertex Cloud Solutions', title: 'VP Engineering', deal_value: 275000, stage: 'Closed Won', lead_score: 95, source: 'Inbound Demo' },
  { name: 'Carlos Rivera', company: 'Summit Manufacturing', title: 'IT Director', deal_value: 210000, stage: 'Proposal Sent', lead_score: 82, source: 'Webinar' },
];

function buildLeadScoreOutput(lead) {
  const s = lead.lead_score;
  const dv = '$' + lead.deal_value.toLocaleString();
  if (s >= 80) {
    return {
      classification: '\u{1F525} Hot',
      score: s,
      confidence: 0.94,
      reasoning: `${lead.name} at ${lead.company} is in ${lead.stage} with a ${dv} deal. High engagement score of ${s} and sourced via ${lead.source}. Recommend immediate outreach.`,
      priority: 'P1',
      recommended_action: 'Schedule demo within 48 hours',
    };
  }
  if (s >= 50) {
    return {
      classification: '\u{1F324}\u{FE0F} Warm',
      score: s,
      confidence: 0.87,
      reasoning: `${lead.name} at ${lead.company} shows interest (${lead.stage}) but needs nurturing. Deal value ${dv} is promising. Source: ${lead.source}.`,
      priority: 'P2',
      recommended_action: 'Send case study + schedule follow-up in 1 week',
    };
  }
  return {
    classification: '\u{2744}\u{FE0F} Cold',
    score: s,
    confidence: 0.91,
    reasoning: `${lead.name} at ${lead.company} is early stage (${lead.stage}). Low engagement score of ${s}. Source: ${lead.source} suggests low intent.`,
    priority: 'P3',
    recommended_action: 'Add to nurture campaign, revisit in 30 days',
  };
}

function buildEmailOutput(lead, scoreOutput) {
  const dv = '$' + lead.deal_value.toLocaleString();
  if (lead.lead_score >= 80) {
    return {
      subject: 'Following up on your interest \u2014 let\'s schedule a walkthrough',
      body: `Hi ${lead.name.split(' ')[0]},\n\nGreat connecting with you! I saw that ${lead.company} is evaluating solutions in the ${lead.stage.toLowerCase()} space, and I think we're a strong fit.\n\nBased on your needs, I've put together a quick overview of how our platform can help your team:\n\n\u2022 Reduce agent deployment time by 80%\n\u2022 Integrate directly with your existing ${lead.source}-sourced pipeline\n\u2022 Full enterprise security with Azure-native infrastructure\n\nWould you be available for a 20-minute walkthrough this Thursday or Friday?\n\nBest regards,\nAlex Morgan\nEnterprise Account Executive`,
      tone: 'direct, high-urgency',
      word_count: 98,
    };
  }
  if (lead.lead_score >= 50) {
    return {
      subject: `${lead.company} + Agent Platform \u2014 a quick resource for your team`,
      body: `Hi ${lead.name.split(' ')[0]},\n\nI noticed ${lead.company} has been exploring AI agent solutions, and I wanted to share a resource that might be helpful.\n\nWe recently published a case study showing how similar ${lead.title.includes('CTO') || lead.title.includes('Engineer') ? 'engineering' : 'operations'} teams reduced manual workflow time by 65% using our platform.\n\nI've attached it here \u2014 no strings attached. If you'd like to chat about how it could apply to your team, I'm happy to set up a quick call next week.\n\nBest,\nAlex Morgan\nEnterprise Account Executive`,
      tone: 'helpful, consultative',
      word_count: 87,
    };
  }
  return {
    subject: `Staying in touch \u2014 AI automation trends for ${lead.company}`,
    body: `Hi ${lead.name.split(' ')[0]},\n\nI hope this finds you well! I wanted to share some trends we're seeing in the ${lead.stage === 'Qualification' ? 'enterprise AI' : 'automation'} space that might be relevant to ${lead.company}.\n\nWe publish a monthly digest covering:\n\u2022 Industry benchmarks for AI agent adoption\n\u2022 Best practices from leading enterprises\n\u2022 New connector integrations and templates\n\nWould you like me to add you to the list? No spam, just genuinely useful content once a month.\n\nCheers,\nAlex Morgan\nEnterprise Account Executive`,
    tone: 'friendly, low-pressure',
    word_count: 92,
  };
}

router.post('/:agentId/run', async (req, res, next) => {
  try {
    const agentId = req.params.agentId;

    // 1. Fetch linked connectors (ordered by connector name for determinism)
    const connectorsResult = await query(
      `SELECT ci.instance_id, c.name as connector_name, c.provider, c.category, c.connector_id
       FROM agent_connectors ac
       JOIN connector_instances ci ON ci.instance_id = ac.instance_id
       JOIN connectors c ON c.connector_id = ci.connector_id
       WHERE ac.agent_id = $1
       ORDER BY c.name`, [agentId]
    );
    const linkedConnectors = connectorsResult.rows;

    // 2. Fetch linked skills (by execution_order)
    const skillsResult = await query(
      `SELECT s.skill_id, s.name, s.category
       FROM agent_skills ags
       JOIN skills s ON s.skill_id = ags.skill_id
       WHERE ags.agent_id = $1
       ORDER BY ags.execution_order`, [agentId]
    );
    const linkedSkills = skillsResult.rows;

    // 3. Create the agent_run record
    const run = await AgentRun.create({
      agent_id: agentId,
      triggered_by: req.body.user_id || null,
      persona_id: req.body.persona_id || null,
      trigger_type: 'manual',
      status: 'running',
      input_payload: JSON.stringify(req.body.input || {}),
      started_at: new Date().toISOString(),
    });

    let totalTokens = 0;
    let totalDuration = 0;
    const steps = [];
    let stepTime = new Date(run.started_at);
    let stepNumber = 0;

    // Shared context — connector outputs feed into skill inputs
    let pulledLead = null;
    let leadScoreOutput = null;

    // 4. Execute connector steps first
    for (const conn of linkedConnectors) {
      stepNumber++;
      const isSalesforce = conn.connector_name.toLowerCase().includes('salesforce');
      const duration = 120 + Math.floor(Math.random() * 230); // 120-350ms
      totalDuration += duration;

      let outputData;
      if (isSalesforce) {
        pulledLead = SALESFORCE_LEADS[Math.floor(Math.random() * SALESFORCE_LEADS.length)];
        outputData = { ...pulledLead };
      } else {
        outputData = { records_fetched: 1 };
      }

      const step = await RunStep.create({
        run_id: run.run_id,
        connector_instance_id: conn.instance_id,
        step_type: 'connector',
        status: 'success',
        input: JSON.stringify({ connector_name: conn.connector_name, action: 'pull' }),
        output: JSON.stringify(outputData),
        tokens_used: 0,
        duration_ms: duration,
        executed_at: stepTime.toISOString(),
      });
      steps.push({ ...step, step_number: stepNumber, name: conn.connector_name });
      stepTime = new Date(stepTime.getTime() + duration);
    }

    // 5. Execute skill steps in order
    for (const skill of linkedSkills) {
      stepNumber++;
      const isLeadScorer = skill.name.toLowerCase().includes('lead scorer');
      const isEmailDrafter = skill.name.toLowerCase().includes('email drafter');

      let outputData;
      let tokens;
      let duration;

      if (isLeadScorer && pulledLead) {
        tokens = 150 + Math.floor(Math.random() * 100); // 150-250
        duration = 300 + Math.floor(Math.random() * 300); // 300-600ms
        outputData = buildLeadScoreOutput(pulledLead);
        leadScoreOutput = outputData;
      } else if (isEmailDrafter && pulledLead) {
        tokens = 250 + Math.floor(Math.random() * 150); // 250-400
        duration = 500 + Math.floor(Math.random() * 400); // 500-900ms
        outputData = buildEmailOutput(pulledLead, leadScoreOutput);
      } else {
        // Generic skill mock
        tokens = 100 + Math.floor(Math.random() * 200);
        duration = 200 + Math.floor(Math.random() * 500);
        outputData = { result: `Executed ${skill.name} successfully`, confidence: +(Math.random() * 0.3 + 0.7).toFixed(2) };
      }

      totalTokens += tokens;
      totalDuration += duration;

      const step = await RunStep.create({
        run_id: run.run_id,
        skill_id: skill.skill_id,
        step_type: 'skill',
        status: 'success',
        input: JSON.stringify(isLeadScorer && pulledLead ? pulledLead : isEmailDrafter && pulledLead ? { lead: pulledLead, classification: leadScoreOutput } : { skill_name: skill.name }),
        output: JSON.stringify(outputData),
        tokens_used: tokens,
        duration_ms: duration,
        executed_at: stepTime.toISOString(),
      });
      steps.push({ ...step, step_number: stepNumber, name: skill.name });
      stepTime = new Date(stepTime.getTime() + duration);
    }

    // Fallback if no linked resources
    if (linkedSkills.length === 0 && linkedConnectors.length === 0) {
      stepNumber++;
      const tokens = 100 + Math.floor(Math.random() * 300);
      const duration = 200 + Math.floor(Math.random() * 800);
      totalTokens += tokens;
      totalDuration += duration;

      const step = await RunStep.create({
        run_id: run.run_id,
        step_type: 'llm_call',
        status: 'success',
        input: JSON.stringify({ prompt: 'Default agent execution' }),
        output: JSON.stringify({ result: 'Agent completed default task' }),
        tokens_used: tokens,
        duration_ms: duration,
        executed_at: stepTime.toISOString(),
      });
      steps.push({ ...step, step_number: stepNumber, name: 'LLM Call' });
    }

    // 6. Update the run with totals
    const completedRun = await AgentRun.update(run.run_id, {
      status: 'completed',
      total_tokens: totalTokens,
      duration_ms: totalDuration,
      cost_usd: +(totalTokens * 0.00003).toFixed(6),
      completed_at: new Date().toISOString(),
      output_payload: JSON.stringify({ steps_count: steps.length }),
    });

    res.status(201).json({ data: { run: completedRun, steps } });
  } catch (err) { next(err); }
});

// GET single agent (placed after all /:agentId/sub-path routes)
router.get('/:id', async (req, res, next) => {
  try {
    const item = await Agent.findById(req.params.id);
    if (!item) return res.status(404).json({ error: { message: 'Not found' } });
    res.json({ data: item });
  } catch (err) { next(err); }
});

module.exports = router;
