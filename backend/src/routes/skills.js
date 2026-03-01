const express = require('express');
const router = express.Router();
const { Skill, SkillVersion } = require('../models');
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

// TODO: POST /:skillId/versions/:versionId/publish — promote draft → published
// TODO: POST /:skillId/test — run a test execution of the skill

module.exports = router;
