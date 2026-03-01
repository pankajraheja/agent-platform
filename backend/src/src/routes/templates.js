const express = require('express');
const router = express.Router();
const { Template, Agent } = require('../models');
const { crudRoutes } = require('./_factory');

router.use('/', crudRoutes(Template, 'template_id'));

// ----- FORK: Create agent from template -----
router.post('/:templateId/fork', async (req, res, next) => {
  try {
    const template = await Template.findById(req.params.templateId);
    if (!template) return res.status(404).json({ error: { message: 'Template not found' } });

    // Create agent from blueprint
    const agent = await Agent.create({
      workspace_id: req.body.workspace_id,
      name: req.body.name || `${template.name} (copy)`,
      description: template.description,
      builder_tier: template.builder_tier,
      metadata: { forked_from: template.template_id, blueprint: template.agent_blueprint },
      created_by: req.body.user_id,
    });

    // Increment fork count
    await Template.update(template.template_id, { fork_count: (template.fork_count || 0) + 1 });

    res.status(201).json({ data: agent });
  } catch (err) { next(err); }
});

module.exports = router;
