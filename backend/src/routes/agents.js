const express = require('express');
const router = express.Router();
const { Agent, AgentVersion, AgentRun, RunStep } = require('../models');
const { crudRoutes } = require('./_factory');
const { query } = require('../config/db');

router.use('/', crudRoutes(Agent, 'agent_id'));

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

// ----- LINKED CONNECTORS -----
router.get('/:agentId/connectors', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT ci.*, ac.purpose, c.name as connector_name, c.provider, c.category
       FROM agent_connectors ac
       JOIN connector_instances ci ON ci.instance_id = ac.instance_id
       JOIN connectors c ON c.connector_id = ci.connector_id
       WHERE ac.agent_id = $1`, [req.params.agentId]
    );
    res.json({ data: result.rows });
  } catch (err) { next(err); }
});

// TODO: POST /:agentId/deploy — publish active version

// ----- RUN AGENT (simulator) -----
router.post('/:agentId/run', async (req, res, next) => {
  try {
    const agentId = req.params.agentId;

    // 1. Fetch linked skills
    const skillsResult = await query(
      `SELECT s.skill_id, s.name, s.category
       FROM agent_skills ags
       JOIN skills s ON s.skill_id = ags.skill_id
       WHERE ags.agent_id = $1
       ORDER BY ags.execution_order`, [agentId]
    );
    const linkedSkills = skillsResult.rows;

    // 2. Fetch linked connectors
    const connectorsResult = await query(
      `SELECT ci.instance_id, c.name as connector_name, c.provider, c.category
       FROM agent_connectors ac
       JOIN connector_instances ci ON ci.instance_id = ac.instance_id
       JOIN connectors c ON c.connector_id = ci.connector_id
       WHERE ac.agent_id = $1`, [agentId]
    );
    const linkedConnectors = connectorsResult.rows;

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

    // 4. Simulate steps for each skill
    let totalTokens = 0;
    let totalDuration = 0;
    const steps = [];
    let stepTime = new Date(run.started_at);

    for (const skill of linkedSkills) {
      const tokens = Math.floor(Math.random() * 401) + 100; // 100-500
      const duration = Math.floor(Math.random() * 1801) + 200; // 200-2000ms
      totalTokens += tokens;
      totalDuration += duration;

      const step = await RunStep.create({
        run_id: run.run_id,
        skill_id: skill.skill_id,
        step_type: 'skill',
        status: 'success',
        input: JSON.stringify({ skill_name: skill.name, category: skill.category }),
        output: JSON.stringify({ result: `Executed ${skill.name} successfully`, confidence: +(Math.random() * 0.3 + 0.7).toFixed(2) }),
        tokens_used: tokens,
        duration_ms: duration,
        executed_at: stepTime.toISOString(),
      });
      steps.push({ ...step, name: skill.name });
      stepTime = new Date(stepTime.getTime() + duration);
    }

    // 5. Simulate steps for each connector
    for (const conn of linkedConnectors) {
      const tokens = Math.floor(Math.random() * 201) + 50; // 50-250
      const duration = Math.floor(Math.random() * 801) + 100; // 100-900ms
      totalTokens += tokens;
      totalDuration += duration;

      const step = await RunStep.create({
        run_id: run.run_id,
        connector_instance_id: conn.instance_id,
        step_type: 'connector',
        status: 'success',
        input: JSON.stringify({ connector_name: conn.connector_name, provider: conn.provider }),
        output: JSON.stringify({ result: `${conn.connector_name} call completed`, records: Math.floor(Math.random() * 50) + 1 }),
        tokens_used: tokens,
        duration_ms: duration,
        executed_at: stepTime.toISOString(),
      });
      steps.push({ ...step, name: conn.connector_name });
      stepTime = new Date(stepTime.getTime() + duration);
    }

    // If no skills or connectors, create a single LLM call step
    if (linkedSkills.length === 0 && linkedConnectors.length === 0) {
      const tokens = Math.floor(Math.random() * 401) + 100;
      const duration = Math.floor(Math.random() * 1801) + 200;
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
      steps.push({ ...step, name: 'LLM Call' });
    }

    // 6. Update the run with totals
    const completedRun = await AgentRun.update(run.run_id, {
      status: 'completed',
      total_tokens: totalTokens,
      duration_ms: totalDuration,
      cost_usd: +(totalTokens * 0.00003).toFixed(6),
      completed_at: new Date().toISOString(),
      output_payload: JSON.stringify({ steps_count: steps.length, summary: 'All steps completed successfully' }),
    });

    res.status(201).json({ data: { run: completedRun, steps } });
  } catch (err) { next(err); }
});

module.exports = router;
