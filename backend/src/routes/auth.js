// ============================================================
// Auth Routes — Local JWT login for prototype
// Will be replaced by Azure Entra ID in Step 9
// ============================================================

const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { query } = require('../config/db');
const { verifyToken } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: { message: 'Email is required' } });
    }

    // Look up user with their role and persona
    const userResult = await query(
      `SELECT u.*, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON r.role_id = u.role_id
       WHERE u.email = $1`,
      [email]
    );

    if (!userResult.rows.length) {
      return res.status(401).json({ error: { message: 'User not found' } });
    }

    const user = userResult.rows[0];

    // Get the user's default workspace
    const wsResult = await query(
      `SELECT workspace_id FROM workspaces WHERE org_id = $1 ORDER BY created_at ASC LIMIT 1`,
      [user.org_id]
    );
    const workspace_id = wsResult.rows[0]?.workspace_id || null;

    // Get persona details if assigned
    let persona = null;
    if (user.persona_id) {
      const personaResult = await query(
        `SELECT * FROM personas WHERE persona_id = $1`,
        [user.persona_id]
      );
      persona = personaResult.rows[0] || null;
    }

    // Build JWT payload
    const payload = {
      user_id: user.user_id,
      org_id: user.org_id,
      workspace_id,
      persona_id: user.persona_id,
      role: user.role_name,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // Update last_active
    await query(`UPDATE users SET last_active = NOW() WHERE user_id = $1`, [user.user_id]);

    res.json({
      data: {
        token,
        user: {
          user_id: user.user_id,
          email: user.email,
          display_name: user.display_name,
          org_id: user.org_id,
          workspace_id,
          persona_id: user.persona_id,
          role: user.role_name,
          preferred_tier: user.preferred_tier,
        },
        persona,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/me
router.post('/me', verifyToken, async (req, res, next) => {
  try {
    const userResult = await query(
      `SELECT u.*, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON r.role_id = u.role_id
       WHERE u.user_id = $1`,
      [req.user.user_id]
    );

    if (!userResult.rows.length) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    const user = userResult.rows[0];

    let persona = null;
    if (user.persona_id) {
      const personaResult = await query(
        `SELECT * FROM personas WHERE persona_id = $1`,
        [user.persona_id]
      );
      persona = personaResult.rows[0] || null;
    }

    res.json({
      data: {
        user: {
          user_id: user.user_id,
          email: user.email,
          display_name: user.display_name,
          org_id: user.org_id,
          workspace_id: req.user.workspace_id,
          persona_id: user.persona_id,
          role: user.role_name,
          preferred_tier: user.preferred_tier,
        },
        persona,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
