'use strict';
const router = require('express').Router();
const { getAlertStatus } = require('../alertService');
const { requireRole } = require('../auth');
const db = require('../db');

// GET /api/v1/alerts/config
router.get('/config', (req, res) => {
  res.json(getAlertStatus());
});

// PUT /api/v1/alerts/config — update alert settings
router.put('/config', requireRole('admin'), (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'Key required' });
  db.prepare('INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?')
    .run(key, value, value);
  res.json({ success: true });
});

// POST /api/v1/alerts/test — send a test alert
router.post('/test', requireRole('admin'), async (req, res) => {
  const { sendAlert } = require('../alertService');
  const result = await sendAlert('correlation_alert', {
    severity: 'High',
    ruleName: 'Test Alert',
    sourceIp: '192.168.1.100',
    destinationIp: '10.0.0.1',
    destinationPort: 22,
    description: 'This is a test alert from Chengeto CTI Platform',
    autoRespond: false,
  });
  res.json(result);
});

module.exports = router;
