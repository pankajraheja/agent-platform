const express = require('express');
const router = express.Router();
const { Organization } = require('../models');
const { crudRoutes } = require('./_factory');

// Standard CRUD: GET / POST / PUT / DELETE
router.use('/', crudRoutes(Organization, 'org_id'));

// ----- CUSTOM ENDPOINTS -----
// TODO: GET /:id/stats — org-level dashboard summary
// TODO: GET /:id/workspaces — list workspaces for org

module.exports = router;
