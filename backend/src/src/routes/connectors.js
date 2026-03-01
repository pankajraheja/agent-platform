const express = require('express');
const router = express.Router();
const { Connector, ConnectorInstance } = require('../models');
const { crudRoutes } = require('./_factory');

// Connector catalog (blueprints)
router.use('/', crudRoutes(Connector, 'connector_id'));

// ----- INSTANCES (org-level provisioned connections) -----
router.get('/:connectorId/instances', async (req, res, next) => {
  try {
    const items = await ConnectorInstance.findAll({ connector_id: req.params.connectorId });
    res.json({ data: items });
  } catch (err) { next(err); }
});

router.post('/:connectorId/instances', async (req, res, next) => {
  try {
    const item = await ConnectorInstance.create({
      connector_id: req.params.connectorId,
      ...req.body,
    });
    res.status(201).json({ data: item });
  } catch (err) { next(err); }
});

// TODO: POST /:connectorId/instances/:id/test — health check a connection

module.exports = router;
