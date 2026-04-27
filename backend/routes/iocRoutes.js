'use strict';
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireRole, logAudit } = require('../auth');

// GET /api/v1/ioc
router.get('/', (req, res) => {
  const { type, active = '1', limit = 100 } = req.query;
  let query = 'SELECT * FROM ioc_watchlist WHERE active = ?';
  const params = [parseInt(active)];
  if (type) { query += ' AND type = ?'; params.push(type); }
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  res.json({ iocs: db.prepare(query).all(...params) });
});

// POST /api/v1/ioc
router.post('/', requireRole('admin', 'analyst'), (req, res) => {
  const { type, value, threat_type, confidence, source, tags } = req.body;
  if (!type || !value) return res.status(400).json({ error: 'Type and value required' });
  const id = uuidv4();
  try {
    db.prepare('INSERT INTO ioc_watchlist (id, type, value, threat_type, confidence, source, tags, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, type, value, threat_type, confidence || 0.5, source, JSON.stringify(tags || []), req.user.id);
    logAudit(req.user.id, req.user.username, 'ioc_added', 'ioc', id, { type, value }, req.ip);
    res.status(201).json({ id });
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(409).json({ error: 'IOC already exists' });
    throw err;
  }
});

// DELETE /api/v1/ioc/:id
router.delete('/:id', requireRole('admin', 'analyst'), (req, res) => {
  db.prepare('UPDATE ioc_watchlist SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /api/v1/ioc/bulk
router.post('/bulk', requireRole('admin', 'analyst'), (req, res) => {
  const { iocs } = req.body;
  if (!Array.isArray(iocs)) return res.status(400).json({ error: 'Array of IOCs required' });
  const insert = db.prepare('INSERT OR IGNORE INTO ioc_watchlist (id, type, value, threat_type, confidence, source, tags, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const tx = db.transaction(() => {
    let added = 0;
    for (const ioc of iocs) {
      const result = insert.run(uuidv4(), ioc.type || 'ip', ioc.value, ioc.threat_type, ioc.confidence || 0.5, ioc.source || 'manual', JSON.stringify(ioc.tags || []), req.user.id);
      if (result.changes > 0) added++;
    }
    return added;
  });
  const added = tx();
  res.json({ added, total: iocs.length });
});

module.exports = router;
