// ============================================================
// Auth Middleware — JWT verification
// Local strategy for prototype; will swap for Azure Entra ID later
// ============================================================

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: { message: 'No token provided' } });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      user_id: decoded.user_id,
      org_id: decoded.org_id,
      workspace_id: decoded.workspace_id,
      persona_id: decoded.persona_id,
      role: decoded.role,
    };
    next();
  } catch (err) {
    return res.status(403).json({ error: { message: 'Invalid or expired token' } });
  }
}

module.exports = { verifyToken };
