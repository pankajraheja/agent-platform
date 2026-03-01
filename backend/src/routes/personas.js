const express = require('express');
const router = express.Router();
const { Persona, PersonaOnboarding, PersonaContext } = require('../models');
const { crudRoutes } = require('./_factory');
const { query } = require('../config/db');

router.use('/', crudRoutes(Persona, 'persona_id'));

// ----- CUSTOM: Get persona with full context -----
router.get('/:id/full', async (req, res, next) => {
  try {
    const persona = await Persona.findById(req.params.id);
    if (!persona) return res.status(404).json({ error: { message: 'Persona not found' } });

    const onboarding = await PersonaOnboarding.findAll(
      { persona_id: req.params.id },
      { orderBy: 'step_order ASC' }
    );
    const contexts = await PersonaContext.findAll({ persona_id: req.params.id });

    // Get recommended skills, templates, connectors via join tables
    const skills = await query(
      `SELECT s.*, ps.is_default FROM persona_skills ps
       JOIN skills s ON s.skill_id = ps.skill_id
       WHERE ps.persona_id = $1`, [req.params.id]
    );
    const templates = await query(
      `SELECT t.*, pt.is_featured FROM persona_templates pt
       JOIN templates t ON t.template_id = pt.template_id
       WHERE pt.persona_id = $1`, [req.params.id]
    );
    const connectors = await query(
      `SELECT c.*, pc.is_default FROM persona_connectors pc
       JOIN connectors c ON c.connector_id = pc.connector_id
       WHERE pc.persona_id = $1`, [req.params.id]
    );

    res.json({
      data: {
        ...persona,
        onboarding,
        contexts,
        recommended_skills: skills.rows,
        recommended_templates: templates.rows,
        default_connectors: connectors.rows,
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
