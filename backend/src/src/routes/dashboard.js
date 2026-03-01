const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

// ============================================================
// Dashboard — Leadership-facing metrics
// These are the numbers that make senior leaders nod
// ============================================================

// GET /api/dashboard/summary?org_id=...
router.get('/summary', async (req, res, next) => {
  try {
    const { org_id } = req.query;
    if (!org_id) return res.status(400).json({ error: { message: 'org_id required' } });

    const [agents, skills, connectors, users, runs] = await Promise.all([
      query(`SELECT COUNT(*)::int as count, status FROM agents a
             JOIN workspaces w ON w.workspace_id = a.workspace_id
             WHERE w.org_id = $1 GROUP BY status`, [org_id]),
      query(`SELECT COUNT(*)::int as count FROM skills s
             JOIN workspaces w ON w.workspace_id = s.workspace_id
             WHERE w.org_id = $1`, [org_id]),
      query(`SELECT COUNT(*)::int as count FROM connector_instances WHERE org_id = $1`, [org_id]),
      query(`SELECT COUNT(*)::int as count FROM users WHERE org_id = $1`, [org_id]),
      query(`SELECT COUNT(*)::int as total_runs,
                    COALESCE(SUM(total_tokens), 0)::int as total_tokens,
                    COALESCE(SUM(cost_usd), 0)::float as total_cost,
                    ROUND(AVG(duration_ms))::int as avg_duration_ms,
                    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'completed') / NULLIF(COUNT(*), 0), 1) as success_rate
             FROM agent_runs ar
             JOIN agents a ON a.agent_id = ar.agent_id
             JOIN workspaces w ON w.workspace_id = a.workspace_id
             WHERE w.org_id = $1
               AND ar.started_at >= NOW() - INTERVAL '30 days'`, [org_id]),
    ]);

    res.json({
      data: {
        agents_by_status: agents.rows,
        total_skills: skills.rows[0]?.count || 0,
        total_connectors: connectors.rows[0]?.count || 0,
        total_users: users.rows[0]?.count || 0,
        last_30_days: runs.rows[0] || {},
      },
    });
  } catch (err) { next(err); }
});

// GET /api/dashboard/persona-adoption?org_id=...
router.get('/persona-adoption', async (req, res, next) => {
  try {
    const { org_id } = req.query;
    const result = await query(
      `SELECT p.name as persona, p.department, p.icon,
              COUNT(DISTINCT u.user_id)::int as users,
              COUNT(DISTINCT a.agent_id)::int as agents_created,
              COUNT(DISTINCT ar.run_id)::int as total_runs
       FROM personas p
       LEFT JOIN users u ON u.persona_id = p.persona_id
       LEFT JOIN agents a ON a.created_by = u.user_id
       LEFT JOIN agent_runs ar ON ar.agent_id = a.agent_id
       WHERE p.org_id = $1 OR p.org_id IS NULL
       GROUP BY p.persona_id, p.name, p.department, p.icon
       ORDER BY total_runs DESC`, [org_id]
    );
    res.json({ data: result.rows });
  } catch (err) { next(err); }
});

// GET /api/dashboard/skill-reuse?org_id=...
router.get('/skill-reuse', async (req, res, next) => {
  try {
    const { org_id } = req.query;
    const result = await query(
      `SELECT s.skill_id, s.name, s.category, s.usage_count, s.avg_rating,
              COUNT(DISTINCT ags.agent_id)::int as agents_using
       FROM skills s
       JOIN workspaces w ON w.workspace_id = s.workspace_id
       LEFT JOIN agent_skills ags ON ags.skill_id = s.skill_id
       WHERE w.org_id = $1
       GROUP BY s.skill_id
       ORDER BY agents_using DESC, s.usage_count DESC
       LIMIT 20`, [org_id]
    );
    res.json({ data: result.rows });
  } catch (err) { next(err); }
});

module.exports = router;
