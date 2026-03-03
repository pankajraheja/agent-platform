const express = require('express');
const router = express.Router();
const { Template, Agent, AgentVersion } = require('../models');
const { query, getClient } = require('../config/db');

// ========== INLINE CRUD (replaces crudRoutes to allow enriched GET) ==========

// LIST — enriched with embedded skills and connectors
router.get('/', async (req, res, next) => {
  try {
    const { limit, offset, orderBy, ...filters } = req.query;
    const items = await Template.findAll(filters, {
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0,
      orderBy: orderBy || 'created_at DESC',
    });
    const count = await Template.count(filters);

    if (!items.length) return res.json({ data: [], total: 0 });

    const ids = items.map(t => t.template_id);

    const [skillsRes, connectorsRes] = await Promise.all([
      query(
        `SELECT ts.template_id, ts.execution_order, s.skill_id, s.name, s.category
         FROM template_skills ts
         JOIN skills s ON s.skill_id = ts.skill_id
         WHERE ts.template_id = ANY($1)
         ORDER BY ts.execution_order`,
        [ids]
      ),
      query(
        `SELECT tc.template_id, tc.execution_order, c.connector_id, c.name, c.provider, c.category
         FROM template_connectors tc
         JOIN connectors c ON c.connector_id = tc.connector_id
         WHERE tc.template_id = ANY($1)
         ORDER BY tc.execution_order`,
        [ids]
      ),
    ]);

    // Group by template_id
    const skillMap = {};
    const connMap = {};
    for (const r of skillsRes.rows) {
      (skillMap[r.template_id] ||= []).push(r);
    }
    for (const r of connectorsRes.rows) {
      (connMap[r.template_id] ||= []).push(r);
    }

    const enriched = items.map(t => ({
      ...t,
      skills: skillMap[t.template_id] || [],
      connectors: connMap[t.template_id] || [],
    }));

    res.json({ data: enriched, total: count });
  } catch (err) { next(err); }
});

// CREATE
router.post('/', async (req, res, next) => {
  try { res.status(201).json({ data: await Template.create(req.body) }); } catch (err) { next(err); }
});

// UPDATE
router.put('/:id', async (req, res, next) => {
  try {
    const item = await Template.update(req.params.id, req.body);
    if (!item) return res.status(404).json({ error: { message: 'Not found' } });
    res.json({ data: item });
  } catch (err) { next(err); }
});

// DELETE
router.delete('/:id', async (req, res, next) => {
  try {
    const item = await Template.remove(req.params.id);
    if (!item) return res.status(404).json({ error: { message: 'Not found' } });
    res.json({ data: item, message: 'Deleted' });
  } catch (err) { next(err); }
});

// ========== FORK: Create fully-wired agent from template ==========
router.post('/:templateId/fork', async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Fetch template
    const tplRes = await client.query(
      'SELECT * FROM templates WHERE template_id = $1', [req.params.templateId]
    );
    const template = tplRes.rows[0];
    if (!template) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: { message: 'Template not found' } });
    }

    // 2. Create agent
    const agentRes = await client.query(
      `INSERT INTO agents (workspace_id, name, description, builder_tier, metadata, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft') RETURNING *`,
      [
        req.body.workspace_id,
        req.body.name || template.name,
        template.description,
        template.builder_tier,
        JSON.stringify({ forked_from: template.template_id }),
        req.body.user_id || null,
      ]
    );
    const agent = agentRes.rows[0];

    // 3. Create agent_version (1.0.0 draft)
    const verRes = await client.query(
      `INSERT INTO agent_versions (agent_id, version_number, status, builder_tier, agent_config)
       VALUES ($1, '1.0.0', 'draft', $2, $3) RETURNING *`,
      [agent.agent_id, agent.builder_tier, JSON.stringify(template.agent_blueprint || {})]
    );
    const version = verRes.rows[0];

    // 4. Copy template_skills → agent_skills
    const tplSkills = await client.query(
      `SELECT skill_id, execution_order FROM template_skills WHERE template_id = $1 ORDER BY execution_order`,
      [template.template_id]
    );
    for (const s of tplSkills.rows) {
      await client.query(
        `INSERT INTO agent_skills (agent_id, skill_id, execution_order) VALUES ($1, $2, $3)`,
        [agent.agent_id, s.skill_id, s.execution_order]
      );
    }

    // 5. Resolve template_connectors → connector_instances → agent_connectors
    const tplConns = await client.query(
      `SELECT tc.connector_id, tc.execution_order, c.name as connector_name
       FROM template_connectors tc
       JOIN connectors c ON c.connector_id = tc.connector_id
       WHERE tc.template_id = $1 ORDER BY tc.execution_order`,
      [template.template_id]
    );

    // Look up org_id from workspace
    const wsRes = await client.query(
      'SELECT org_id FROM workspaces WHERE workspace_id = $1', [req.body.workspace_id]
    );
    const orgId = req.body.org_id || wsRes.rows[0]?.org_id;

    if (orgId) {
      for (const tc of tplConns.rows) {
        // Find existing active instance for this connector in the org
        const existing = await client.query(
          `SELECT instance_id FROM connector_instances
           WHERE connector_id = $1 AND org_id = $2 AND status = 'active' LIMIT 1`,
          [tc.connector_id, orgId]
        );

        let instanceId;
        if (existing.rows.length) {
          instanceId = existing.rows[0].instance_id;
        } else {
          // Auto-provision a placeholder instance
          const inst = await client.query(
            `INSERT INTO connector_instances (connector_id, org_id, name, status)
             VALUES ($1, $2, $3, 'active') RETURNING instance_id`,
            [tc.connector_id, orgId, `${tc.connector_name} (auto-provisioned)`]
          );
          instanceId = inst.rows[0].instance_id;
        }

        await client.query(
          `INSERT INTO agent_connectors (agent_id, instance_id, purpose)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [agent.agent_id, instanceId, `From template: ${template.name}`]
        );
      }
    }

    // 6. Increment fork count
    await client.query(
      'UPDATE templates SET fork_count = COALESCE(fork_count, 0) + 1 WHERE template_id = $1',
      [template.template_id]
    );

    await client.query('COMMIT');

    // 7. Fetch enriched response
    const [agentSkills, agentConns] = await Promise.all([
      query(
        `SELECT s.*, ags.execution_order
         FROM agent_skills ags JOIN skills s ON s.skill_id = ags.skill_id
         WHERE ags.agent_id = $1 ORDER BY ags.execution_order`,
        [agent.agent_id]
      ),
      query(
        `SELECT ci.*, ac.purpose, c.name as connector_name, c.provider, c.category, c.connector_id
         FROM agent_connectors ac
         JOIN connector_instances ci ON ci.instance_id = ac.instance_id
         JOIN connectors c ON c.connector_id = ci.connector_id
         WHERE ac.agent_id = $1`,
        [agent.agent_id]
      ),
    ]);

    res.status(201).json({
      data: {
        ...agent,
        version,
        skills: agentSkills.rows,
        connectors: agentConns.rows,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    next(err);
  } finally {
    client.release();
  }
});

// GET single template — enriched (placed LAST to avoid catching sub-paths)
router.get('/:id', async (req, res, next) => {
  try {
    const item = await Template.findById(req.params.id);
    if (!item) return res.status(404).json({ error: { message: 'Not found' } });

    const [skillsRes, connectorsRes] = await Promise.all([
      query(
        `SELECT ts.execution_order, s.skill_id, s.name, s.category
         FROM template_skills ts JOIN skills s ON s.skill_id = ts.skill_id
         WHERE ts.template_id = $1 ORDER BY ts.execution_order`,
        [item.template_id]
      ),
      query(
        `SELECT tc.execution_order, c.connector_id, c.name, c.provider, c.category
         FROM template_connectors tc JOIN connectors c ON c.connector_id = tc.connector_id
         WHERE tc.template_id = $1 ORDER BY tc.execution_order`,
        [item.template_id]
      ),
    ]);

    res.json({ data: { ...item, skills: skillsRes.rows, connectors: connectorsRes.rows } });
  } catch (err) { next(err); }
});

module.exports = router;
