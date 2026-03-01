// ============================================================
// Agent Platform — API Server Entry Point
// ============================================================

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// ----- Middleware -----
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(morgan('dev'));

// ----- Health Check -----
app.get('/api/health', async (req, res) => {
  const { query } = require('./config/db');
  try {
    const result = await query('SELECT NOW() as time, current_schema() as schema');
    res.json({ status: 'ok', db: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ----- API Routes -----
// Each route file handles /api/<resource>

app.use('/api/organizations', require('./routes/organizations'));
app.use('/api/workspaces',    require('./routes/workspaces'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/personas',      require('./routes/personas'));
app.use('/api/connectors',    require('./routes/connectors'));
app.use('/api/skills',        require('./routes/skills'));
app.use('/api/agents',        require('./routes/agents'));
app.use('/api/templates',     require('./routes/templates'));
app.use('/api/runs',          require('./routes/runs'));
app.use('/api/dashboard',     require('./routes/dashboard'));

// ----- Error Handling -----
app.use(require('./middleware/errorHandler'));

// ----- Start Server -----
app.listen(PORT, () => {
  console.log(`\n🚀 Agent Platform API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
