// ============================================================
// Route Factory — Generates standard CRUD routes for any model
// Usage: router.use('/', crudRoutes(Model, 'resource_id'))
//
// Generates:
//   GET    /              → list all (with ?limit, ?offset, ?filter_field=value)
//   GET    /:id           → get by id
//   POST   /              → create
//   PUT    /:id           → update
//   DELETE /:id           → delete
//
// Extend by adding custom routes BEFORE or AFTER using the factory.
// ============================================================

const express = require('express');

function crudRoutes(model, idParam = 'id') {
  const router = express.Router();

  // LIST
  router.get('/', async (req, res, next) => {
    try {
      const { limit, offset, orderBy, ...filters } = req.query;
      const items = await model.findAll(filters, {
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
        orderBy: orderBy || 'created_at DESC',
      });
      const count = await model.count(filters);
      res.json({ data: items, total: count });
    } catch (err) { next(err); }
  });

  // GET BY ID
  router.get('/:id', async (req, res, next) => {
    try {
      const item = await model.findById(req.params.id);
      if (!item) return res.status(404).json({ error: { message: 'Not found' } });
      res.json({ data: item });
    } catch (err) { next(err); }
  });

  // CREATE
  router.post('/', async (req, res, next) => {
    try {
      const item = await model.create(req.body);
      res.status(201).json({ data: item });
    } catch (err) { next(err); }
  });

  // UPDATE
  router.put('/:id', async (req, res, next) => {
    try {
      const item = await model.update(req.params.id, req.body);
      if (!item) return res.status(404).json({ error: { message: 'Not found' } });
      res.json({ data: item });
    } catch (err) { next(err); }
  });

  // DELETE
  router.delete('/:id', async (req, res, next) => {
    try {
      const item = await model.remove(req.params.id);
      if (!item) return res.status(404).json({ error: { message: 'Not found' } });
      res.json({ data: item, message: 'Deleted' });
    } catch (err) { next(err); }
  });

  return router;
}

module.exports = { crudRoutes };
