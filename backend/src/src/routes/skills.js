const express = require('express');
const router = express.Router();
const { Skill, SkillVersion } = require('../models');
const { crudRoutes } = require('./_factory');
const { query } = require('../config/db');

// ============================================================
// Standard CRUD (list, get, create, update, delete)
// ============================================================
router.use('/', crudRoutes(Skill, 'skill_id'));

// ============================================================
// SKILL DETAIL — enriched single skill with versions + usage
// ============================================================
router.get('/:skillId/detail', async (req, res, next) => {
  try {
    const skill = await Skill.findById(req.params.skillId);
    if (!skill) return res.status(404).json({ error: { message: 'Skill not found' } });

    const versions = await SkillVersion.findAll(
      { skill_id: req.params.skillId },
      { orderBy: 'created_at DESC' }
    );

    // Agents using this skill
    const agents = await query(
      `SELECT a.agent_id, a.name, a.status, a.builder_tier, ags.execution_order
       FROM agent_skills ags
       JOIN agents a ON a.agent_id = ags.agent_id
       WHERE ags.skill_id = $1
       ORDER BY a.name`, [req.params.skillId]
    );

    // Composed child skills
    const children = await query(
      `SELECT s.skill_id, s.name, s.category, sc.execution_order
       FROM skill_compositions sc
       JOIN skills s ON s.skill_id = sc.child_skill_id
       WHERE sc.parent_skill_id = $1
       ORDER BY sc.execution_order`, [req.params.skillId]
    );

    // Composed into (parent skills using this one)
    const parents = await query(
      `SELECT s.skill_id, s.name, s.category
       FROM skill_compositions sc
       JOIN skills s ON s.skill_id = sc.parent_skill_id
       WHERE sc.child_skill_id = $1`, [req.params.skillId]
    );

    res.json({
      data: {
        ...skill,
        versions,
        agents_using: agents.rows,
        child_skills: children.rows,
        used_in_skills: parents.rows,
      },
    });
  } catch (err) { next(err); }
});

// ============================================================
// VERSIONS
// ============================================================
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

// Update a version (edit prompt, model settings)
router.put('/:skillId/versions/:versionId', async (req, res, next) => {
  try {
    const item = await SkillVersion.update(req.params.versionId, req.body);
    if (!item) return res.status(404).json({ error: { message: 'Version not found' } });
    res.json({ data: item });
  } catch (err) { next(err); }
});

// Publish a version (draft → published, deprecate previous)
router.post('/:skillId/versions/:versionId/publish', async (req, res, next) => {
  try {
    await query(
      `UPDATE skill_versions SET status = 'deprecated'
       WHERE skill_id = $1 AND status = 'published'`,
      [req.params.skillId]
    );
    const item = await SkillVersion.update(req.params.versionId, { status: 'published' });
    if (!item) return res.status(404).json({ error: { message: 'Version not found' } });
    res.json({ data: item, message: 'Version published' });
  } catch (err) { next(err); }
});

// ============================================================
// TEST — Simulate a skill execution (dry run / prompt studio)
// ============================================================
router.post('/:skillId/test', async (req, res, next) => {
  try {
    const skill = await Skill.findById(req.params.skillId);
    if (!skill) return res.status(404).json({ error: { message: 'Skill not found' } });

    const { input, version_id } = req.body;

    let version;
    if (version_id) {
      version = await SkillVersion.findById(version_id);
    } else {
      const versions = await SkillVersion.findAll(
        { skill_id: req.params.skillId, status: 'published' },
        { limit: 1, orderBy: 'created_at DESC' }
      );
      version = versions[0];
      // Fallback to latest draft if nothing published
      if (!version) {
        const drafts = await SkillVersion.findAll(
          { skill_id: req.params.skillId },
          { limit: 1, orderBy: 'created_at DESC' }
        );
        version = drafts[0];
      }
    }

    if (!version) {
      return res.status(400).json({ error: { message: 'No version found. Create a version first.' } });
    }

    // -------------------------------------------------------
    // TODO: Replace mock with real LLM call
    // Wire to OpenAI / Anthropic / Azure OpenAI using:
    //   - version.prompt_config.system_prompt
    //   - version.prompt_config.user_template
    //   - version.model_settings.model
    //   - version.model_settings.temperature
    //   - version.model_settings.max_tokens
    // -------------------------------------------------------
    const promptConfig = version.prompt_config || {};
    const modelSettings = version.model_settings || {};

    const mockOutput = {
      result: `[Mock] Executed "${skill.name}" (v${version.version_number})\n\nSystem: ${promptConfig.system_prompt || '(none)'}\nInput: ${JSON.stringify(input).substring(0, 300)}\n\n→ This is a simulated response. Connect an LLM provider to get real outputs.`,
      model: modelSettings.model || 'gpt-4o-mini',
      tokens_used: Math.floor(Math.random() * 500) + 100,
      latency_ms: Math.floor(Math.random() * 2000) + 200,
      version_id: version.skill_version_id,
      version_number: version.version_number,
    };

    // Bump usage count
    await Skill.update(skill.skill_id, { usage_count: (skill.usage_count || 0) + 1 });

    // Append to test history on version (keep last 20)
    const history = Array.isArray(version.test_results) ? version.test_results : [];
    const entry = {
      timestamp: new Date().toISOString(),
      input,
      output: mockOutput.result,
      tokens: mockOutput.tokens_used,
      latency_ms: mockOutput.latency_ms,
    };
    await SkillVersion.update(version.skill_version_id, {
      test_results: JSON.stringify([entry, ...history].slice(0, 20)),
    });

    res.json({ data: mockOutput });
  } catch (err) { next(err); }
});

// ============================================================
// DUPLICATE — Clone a skill
// ============================================================
router.post('/:skillId/duplicate', async (req, res, next) => {
  try {
    const original = await Skill.findById(req.params.skillId);
    if (!original) return res.status(404).json({ error: { message: 'Skill not found' } });

    const clone = await Skill.create({
      workspace_id: req.body.workspace_id || original.workspace_id,
      name: `${original.name} (copy)`,
      description: original.description,
      category: original.category,
      visibility: 'private',
      input_schema: JSON.stringify(original.input_schema),
      output_schema: JSON.stringify(original.output_schema),
      created_by: req.body.user_id || original.created_by,
    });

    // Clone latest published version
    const versions = await SkillVersion.findAll(
      { skill_id: req.params.skillId, status: 'published' },
      { limit: 1, orderBy: 'created_at DESC' }
    );
    if (versions[0]) {
      await SkillVersion.create({
        skill_id: clone.skill_id,
        version_number: '1.0.0',
        prompt_config: JSON.stringify(versions[0].prompt_config),
        model_settings: JSON.stringify(versions[0].model_settings),
        status: 'draft',
      });
    }

    res.status(201).json({ data: clone });
  } catch (err) { next(err); }
});

// ============================================================
// COMPOSITION — Manage child skills (skill chaining)
// ============================================================
router.get('/:skillId/children', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT s.*, sc.execution_order
       FROM skill_compositions sc
       JOIN skills s ON s.skill_id = sc.child_skill_id
       WHERE sc.parent_skill_id = $1
       ORDER BY sc.execution_order`, [req.params.skillId]
    );
    res.json({ data: result.rows });
  } catch (err) { next(err); }
});

router.post('/:skillId/children', async (req, res, next) => {
  try {
    const { child_skill_id, execution_order = 0 } = req.body;
    if (child_skill_id === req.params.skillId) {
      return res.status(400).json({ error: { message: 'A skill cannot compose itself' } });
    }
    await query(
      `INSERT INTO skill_compositions (parent_skill_id, child_skill_id, execution_order)
       VALUES ($1, $2, $3)
       ON CONFLICT (parent_skill_id, child_skill_id) DO UPDATE SET execution_order = $3`,
      [req.params.skillId, child_skill_id, execution_order]
    );
    res.status(201).json({ message: 'Child skill linked' });
  } catch (err) { next(err); }
});

router.delete('/:skillId/children/:childId', async (req, res, next) => {
  try {
    await query(
      `DELETE FROM skill_compositions WHERE parent_skill_id = $1 AND child_skill_id = $2`,
      [req.params.skillId, req.params.childId]
    );
    res.json({ message: 'Child skill removed' });
  } catch (err) { next(err); }
});

// ============================================================
// STATS — Skill-level execution analytics
// ============================================================
router.get('/:skillId/stats', async (req, res, next) => {
  try {
    const agentCount = await query(
      `SELECT COUNT(DISTINCT agent_id)::int as count FROM agent_skills WHERE skill_id = $1`,
      [req.params.skillId]
    );
    const runSteps = await query(
      `SELECT COUNT(*)::int as total_executions,
              ROUND(AVG(duration_ms))::int as avg_latency_ms,
              ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'success') / NULLIF(COUNT(*), 0), 1) as success_rate,
              COALESCE(SUM(tokens_used), 0)::int as total_tokens
       FROM run_steps WHERE skill_id = $1`,
      [req.params.skillId]
    );
    res.json({
      data: {
        agents_using: agentCount.rows[0]?.count || 0,
        ...(runSteps.rows[0] || {}),
      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
