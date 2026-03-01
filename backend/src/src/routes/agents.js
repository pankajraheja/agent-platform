const express = require('express');
const router = express.Router();
const { Agent, AgentVersion } = require('../models');
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
// TODO: POST /:agentId/run — trigger a manual run

module.exports = router;
