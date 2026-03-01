const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { crudRoutes } = require('./_factory');

router.use('/', crudRoutes(User, 'user_id'));

// TODO: GET /:id/agents — agents created by user
// TODO: PUT /:id/persona — assign persona to user

module.exports = router;
