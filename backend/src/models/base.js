// ============================================================
// Base Model — Reusable CRUD helpers
// All queries target the prototype_builder schema (set via pool)
// ============================================================

const { query } = require('../config/db');

/**
 * Generic CRUD factory for any table
 * Usage: const orgModel = createModel('organizations', 'org_id');
 */
function createModel(tableName, primaryKey) {
  return {

    // GET all rows (with optional filters)
    async findAll(filters = {}, options = {}) {
      const { limit = 50, offset = 0, orderBy = 'created_at DESC' } = options;
      const keys = Object.keys(filters);
      const where = keys.length
        ? 'WHERE ' + keys.map((k, i) => `${k} = $${i + 1}`).join(' AND ')
        : '';
      const values = Object.values(filters);

      const sql = `SELECT * FROM ${tableName} ${where} ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`;
      const result = await query(sql, values);
      return result.rows;
    },

    // GET single row by primary key
    async findById(id) {
      const sql = `SELECT * FROM ${tableName} WHERE ${primaryKey} = $1`;
      const result = await query(sql, [id]);
      return result.rows[0] || null;
    },

    // INSERT a new row
    async create(data) {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const columns = keys.join(', ');

      const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;
      const result = await query(sql, values);
      return result.rows[0];
    },

    // UPDATE row by primary key
    async update(id, data) {
      const keys = Object.keys(data);
      const values = Object.values(data);
      const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

      const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${primaryKey} = $${keys.length + 1} RETURNING *`;
      const result = await query(sql, [...values, id]);
      return result.rows[0] || null;
    },

    // DELETE row by primary key
    async remove(id) {
      const sql = `DELETE FROM ${tableName} WHERE ${primaryKey} = $1 RETURNING *`;
      const result = await query(sql, [id]);
      return result.rows[0] || null;
    },

    // COUNT rows (with optional filters)
    async count(filters = {}) {
      const keys = Object.keys(filters);
      const where = keys.length
        ? 'WHERE ' + keys.map((k, i) => `${k} = $${i + 1}`).join(' AND ')
        : '';
      const values = Object.values(filters);

      const sql = `SELECT COUNT(*)::int as count FROM ${tableName} ${where}`;
      const result = await query(sql, values);
      return result.rows[0].count;
    },

    // Raw query escape hatch
    async raw(sql, params = []) {
      const result = await query(sql, params);
      return result.rows;
    },
  };
}

module.exports = { createModel };
