const express = require('express');
const router = express.Router();
const { Connector, ConnectorInstance } = require('../models');
const { crudRoutes } = require('./_factory');
const { query } = require('../config/db');

// Connector catalog (blueprints)
router.use('/', crudRoutes(Connector, 'connector_id'));

// ----- DETAIL: connector + instances + agent usage count -----
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

    // Count agents using any instance of this connector
    const agentCountRes = await query(
      `SELECT COUNT(DISTINCT ac.agent_id)::int AS count
       FROM agent_connectors ac
       JOIN connector_instances ci ON ci.instance_id = ac.instance_id
       WHERE ci.connector_id = $1`,
      [req.params.connectorId]
    );
    const agent_count = agentCountRes.rows[0]?.count || 0;

    res.json({ data: { ...connector, instances, agent_count } });
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
      status: req.body.status || 'active',
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

// ----- TEST CONNECTION -----
router.post('/:connectorId/instances/:instanceId/test', async (req, res, next) => {
  try {
    const connector = await Connector.findById(req.params.connectorId);
    if (!connector) return res.status(404).json({ error: { message: 'Connector not found' } });

    const instance = await ConnectorInstance.findById(req.params.instanceId);
    if (!instance) return res.status(404).json({ error: { message: 'Instance not found' } });

    // Simulate latency
    const latency = 80 + Math.floor(Math.random() * 120);
    await new Promise((r) => setTimeout(r, latency));

    const isSalesforce = connector.name.toLowerCase().includes('salesforce');

    res.json({
      data: {
        status: 'connected',
        latency_ms: latency,
        message: isSalesforce
          ? 'Successfully authenticated to Salesforce (sandbox)'
          : `Successfully connected to ${connector.name}`,
        tested_at: new Date().toISOString(),
      },
    });
  } catch (err) { next(err); }
});

// ----- PULL DATA -----
const SALESFORCE_LEADS = [
  { name: 'Sarah Chen', company: 'Meridian Health Systems', title: 'VP of Operations', email: 's.chen@meridianhealth.com', deal_value: 185000, stage: 'Negotiation', lead_score: 87, last_activity: '2026-02-25', source: 'Webinar' },
  { name: 'Marcus Johnson', company: 'TechForge Industries', title: 'CTO', email: 'mjohnson@techforge.io', deal_value: 340000, stage: 'Discovery', lead_score: 62, last_activity: '2026-02-27', source: 'LinkedIn' },
  { name: 'Emily Nakamura', company: 'Pacific Retail Group', title: 'Director of Digital', email: 'e.nakamura@pacificretail.com', deal_value: 95000, stage: 'Proposal Sent', lead_score: 78, last_activity: '2026-02-20', source: 'Referral' },
  { name: 'David Okafor', company: 'Atlas Financial Partners', title: 'Head of Strategy', email: 'dokafor@atlasfinancial.com', deal_value: 520000, stage: 'Qualification', lead_score: 45, last_activity: '2026-02-28', source: 'Cold Outreach' },
  { name: 'Rachel Kim', company: 'Vertex Cloud Solutions', title: 'VP Engineering', email: 'rkim@vertexcloud.com', deal_value: 275000, stage: 'Closed Won', lead_score: 95, last_activity: '2026-02-18', source: 'Inbound Demo' },
  { name: 'James Whitfield', company: 'Beacon Logistics', title: 'COO', email: 'jwhitfield@beaconlogistics.com', deal_value: 150000, stage: 'Negotiation', lead_score: 71, last_activity: '2026-02-26', source: 'Trade Show' },
  { name: 'Aisha Patel', company: 'Horizon Edtech', title: 'CEO', email: 'apatel@horizonedtech.com', deal_value: 420000, stage: 'Discovery', lead_score: 58, last_activity: '2026-02-24', source: 'Partner Referral' },
  { name: 'Carlos Rivera', company: 'Summit Manufacturing', title: 'IT Director', email: 'crivera@summitmfg.com', deal_value: 210000, stage: 'Proposal Sent', lead_score: 82, last_activity: '2026-02-22', source: 'Webinar' },
  { name: 'Nina Volkov', company: 'Crestline Media Group', title: 'CMO', email: 'nvolkov@crestlinemedia.com', deal_value: 165000, stage: 'Qualification', lead_score: 39, last_activity: '2026-02-15', source: 'Google Ads' },
  { name: 'Thomas Brennan', company: 'Ironclad Insurance', title: 'VP Partnerships', email: 'tbrennan@ironcladins.com', deal_value: 390000, stage: 'Closed Won', lead_score: 91, last_activity: '2026-02-19', source: 'Inbound Demo' },
];

function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

router.post('/:connectorId/instances/:instanceId/pull', async (req, res, next) => {
  try {
    const connector = await Connector.findById(req.params.connectorId);
    if (!connector) return res.status(404).json({ error: { message: 'Connector not found' } });

    const instance = await ConnectorInstance.findById(req.params.instanceId);
    if (!instance) return res.status(404).json({ error: { message: 'Instance not found' } });

    // Simulate latency
    await new Promise((r) => setTimeout(r, 200 + Math.floor(Math.random() * 300)));

    const isSalesforce = connector.name.toLowerCase().includes('salesforce');

    if (isSalesforce) {
      res.json({
        data: {
          records: pickRandom(SALESFORCE_LEADS, 5),
          total_count: 847,
          pulled_at: new Date().toISOString(),
          source: 'Salesforce Sandbox',
        },
      });
    } else {
      res.json({
        data: {
          records: [{ id: 1, data: 'Sample record' }],
          total_count: 1,
          pulled_at: new Date().toISOString(),
          source: connector.name,
        },
      });
    }
  } catch (err) { next(err); }
});

module.exports = router;
