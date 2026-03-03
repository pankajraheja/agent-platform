const express = require('express');
const router = express.Router();
const { AgentRun, RunStep, HumanReview } = require('../models');
const { crudRoutes } = require('./_factory');
const { query } = require('../config/db');

router.use('/', crudRoutes(AgentRun, 'run_id'));

// ----- STEPS for a run (with skill/connector names) -----
router.get('/:runId/steps', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT rs.*,
              s.name AS skill_name,
              c.name AS connector_name
       FROM run_steps rs
       LEFT JOIN skills s ON s.skill_id = rs.skill_id
       LEFT JOIN connector_instances ci ON ci.instance_id = rs.connector_instance_id
       LEFT JOIN connectors c ON c.connector_id = ci.connector_id
       WHERE rs.run_id = $1
       ORDER BY rs.executed_at ASC`,
      [req.params.runId]
    );
    // Add a derived "name" field for convenience
    const steps = result.rows.map((row, idx) => ({
      ...row,
      name: row.skill_name || row.connector_name || 'LLM Call',
      step_number: idx + 1,
    }));
    res.json({ data: steps });
  } catch (err) { next(err); }
});

// ----- HUMAN REVIEW -----
router.get('/:runId/review', async (req, res, next) => {
  try {
    const items = await HumanReview.findAll({ run_id: req.params.runId });
    res.json({ data: items });
  } catch (err) { next(err); }
});

router.post('/:runId/review', async (req, res, next) => {
  try {
    const review = await HumanReview.create({ run_id: req.params.runId, ...req.body });

    if (req.body.decision === 'approved' || req.body.decision === 'rejected') {
      await AgentRun.update(req.params.runId, {
        status: req.body.decision === 'approved' ? 'running' : 'failed',
      });
    }

    res.status(201).json({ data: review });
  } catch (err) { next(err); }
});

module.exports = router;
