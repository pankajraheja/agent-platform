const express = require('express');
const router = express.Router();
const { AgentRun, RunStep, HumanReview } = require('../models');
const { crudRoutes } = require('./_factory');

router.use('/', crudRoutes(AgentRun, 'run_id'));

// ----- STEPS for a run -----
router.get('/:runId/steps', async (req, res, next) => {
  try {
    const items = await RunStep.findAll(
      { run_id: req.params.runId },
      { orderBy: 'executed_at ASC' }
    );
    res.json({ data: items });
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

    // If approved/rejected, update the run status
    if (req.body.decision === 'approved' || req.body.decision === 'rejected') {
      await AgentRun.update(req.params.runId, {
        status: req.body.decision === 'approved' ? 'running' : 'failed',
      });
    }

    res.status(201).json({ data: review });
  } catch (err) { next(err); }
});

module.exports = router;
