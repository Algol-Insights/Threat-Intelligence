'use strict';
const router = require('express').Router();
const db = require('../db');
const { getAuditLog, logAudit } = require('../auth');
const { getRules, updateRule, getCorrelationStats } = require('../correlationEngine');

// GET /api/v1/admin/audit
router.get('/audit', (req, res) => {
  const { limit = 100, offset = 0, action, actor, since } = req.query;
  res.json({ entries: getAuditLog(parseInt(limit), parseInt(offset), { action, actor, since }) });
});

// GET /api/v1/admin/config
router.get('/config', (req, res) => {
  const configs = db.prepare('SELECT * FROM config').all();
  const result = {};
  configs.forEach(c => { result[c.key] = c.value; });
  res.json({ config: result });
});

// PUT /api/v1/admin/config
router.put('/config', (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'Key required' });
  db.prepare('INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime(\'now\')')
    .run(key, value, value);
  logAudit(req.user.id, req.user.username, 'config_updated', 'config', key, { value }, req.ip);
  res.json({ success: true });
});

// GET /api/v1/admin/correlation/rules
router.get('/correlation/rules', (req, res) => {
  res.json({ rules: getRules() });
});

// PATCH /api/v1/admin/correlation/rules/:id
router.patch('/correlation/rules/:id', (req, res) => {
  updateRule(req.params.id, req.body);
  logAudit(req.user.id, req.user.username, 'rule_updated', 'correlation_rule', req.params.id, req.body, req.ip);
  res.json({ success: true });
});

// GET /api/v1/admin/correlation/stats
router.get('/correlation/stats', (req, res) => {
  res.json(getCorrelationStats());
});

// GET /api/v1/admin/assets
router.get('/assets', (req, res) => {
  res.json({ assets: db.prepare('SELECT * FROM assets ORDER BY last_seen DESC').all() });
});

// GET /api/v1/admin/playbooks
router.get('/playbooks', (req, res) => {
  res.json({ playbooks: db.prepare('SELECT * FROM playbooks ORDER BY name').all() });
});

// GET /api/v1/admin/playbooks/:id/executions
router.get('/playbooks/:id/executions', (req, res) => {
  res.json({ executions: db.prepare('SELECT * FROM playbook_executions WHERE playbook_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.id) });
});

module.exports = router;
