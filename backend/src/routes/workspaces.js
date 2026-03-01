const express = require('express');
const router = express.Router();
const { Workspace } = require('../models');
const { crudRoutes } = require('./_factory');

router.use('/', crudRoutes(Workspace, 'workspace_id'));

// TODO: GET /:id/agents — list agents in workspace
// TODO: GET /:id/skills — list skills in workspace

module.exports = router;
