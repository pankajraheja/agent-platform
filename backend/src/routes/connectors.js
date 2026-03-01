const express = require('express');
const router = express.Router();
const { Connector, ConnectorInstance } = require('../models');
const { crudRoutes } = require('./_factory');
const { query } = require('../config/db');

// Connector catalog (blueprints)
router.use('/', crudRoutes(Connector, 'connector_id'));

// ----- DETAIL: connector + instances for a workspace -----
router.get('/:connectorId/detail', async (req, res, next) => {
  try {
    const connector = await Connector.findById(req.params.connectorId);
    if (!connector) return res.status(404).json({ error: { message: 'Connector not found' } });

    const { org_id } = req.query;
    let instances = [];
    if (org_id) {
      instances = await ConnectorInstance.findAll({
        connector_id: req.params.connectorId,
        org_id,
      });
    }

    res.json({ data: { ...connector, instances } });
  } catch (err) { next(err); }
});

// ----- INSTANCES (org-level provisioned connections) -----
router.get('/:connectorId/instances', async (req, res, next) => {
  try {
    const filters = { connector_id: req.params.connectorId };
    if (req.query.org_id) filters.org_id = req.query.org_id;
    const items = await ConnectorInstance.findAll(filters);
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

router.put('/:connectorId/instances/:instanceId', async (req, res, next) => {
  try {
    const item = await ConnectorInstance.update(req.params.instanceId, req.body);
    if (!item) return res.status(404).json({ error: { message: 'Instance not found' } });
    res.json({ data: item });
  } catch (err) { next(err); }
});

router.delete('/:connectorId/instances/:instanceId', async (req, res, next) => {
  try {
    const item = await ConnectorInstance.remove(req.params.instanceId);
    if (!item) return res.status(404).json({ error: { message: 'Instance not found' } });
    res.json({ data: item, message: 'Disconnected' });
  } catch (err) { next(err); }
});

module.exports = router;
