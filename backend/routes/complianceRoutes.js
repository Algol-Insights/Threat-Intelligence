'use strict';
const router = require('express').Router();
const { getComplianceMetrics, markNotificationSent, generateComplianceReport } = require('../cdpaEngine');
const { logAudit } = require('../auth');

// GET /api/v1/compliance/metrics
router.get('/metrics', (req, res) => {
  const days = parseInt(req.query.days || '30');
  res.json(getComplianceMetrics(days));
});

// GET /api/v1/compliance/report
router.get('/report', (req, res) => {
  const { start, end } = req.query;
  const startDate = start || new Date(Date.now() - 30 * 86400000).toISOString();
  const endDate = end || new Date().toISOString();
  const report = generateComplianceReport(startDate, endDate);
  logAudit(req.user.id, req.user.username, 'compliance_report_generated', 'compliance', null, { start: startDate, end: endDate }, req.ip);
  res.json(report);
});

// POST /api/v1/compliance/:id/notify
router.post('/:id/notify', (req, res) => {
  markNotificationSent(req.params.id);
  logAudit(req.user.id, req.user.username, 'notification_sent', 'compliance', req.params.id, null, req.ip);
  res.json({ success: true });
});

module.exports = router;
