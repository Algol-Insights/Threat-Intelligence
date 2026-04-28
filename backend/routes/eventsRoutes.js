'use strict';
const router = require('express').Router();
const db = require('../db');

// GET /api/v1/events — fetch historical events with filters
router.get('/', (req, res) => {
  const { action, source_ip, parser_source, cdpa, limit = 200, offset = 0, since } = req.query;
  let query = 'SELECT * FROM events WHERE 1=1';
  const params = [];

  if (action) { query += ' AND action = ?'; params.push(action); }
  if (source_ip) { query += ' AND source_ip = ?'; params.push(source_ip); }
  if (parser_source) { query += ' AND parser_source = ?'; params.push(parser_source); }
  if (cdpa === '1') { query += ' AND cdpa_relevant = 1'; }
  if (since) { query += ' AND created_at >= ?'; params.push(since); }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const events = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as count FROM events').get();

  // Parse JSON fields back to objects
  const parsed = events.map(e => ({
    id: e.id,
    timestamp: e.timestamp,
    sourceIp: e.source_ip,
    destinationIp: e.destination_ip,
    destinationPort: e.destination_port,
    protocol: e.protocol,
    action: e.action,
    description: e.description,
    parserSource: e.parser_source,
    rawLog: e.raw_log,
    mispContext: e.misp_context ? JSON.parse(e.misp_context) : undefined,
    iocHit: e.ioc_hit ? JSON.parse(e.ioc_hit) : undefined,
    cdpa: e.cdpa_relevant ? {
      cdpaRelevant: true,
      classification: e.cdpa_classification,
      riskScore: e.cdpa_risk_score,
    } : undefined,
    enrichment: e.enrichment ? JSON.parse(e.enrichment) : undefined,
  }));

  res.json({ events: parsed, total: total.count });
});

// GET /api/v1/events/stats — event statistics
router.get('/stats', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM events').get();
  const blocked = db.prepare("SELECT COUNT(*) as count FROM events WHERE action = 'BLOCKED'").get();
  const allowed = db.prepare("SELECT COUNT(*) as count FROM events WHERE action = 'ALLOWED'").get();
  const cdpaRelevant = db.prepare('SELECT COUNT(*) as count FROM events WHERE cdpa_relevant = 1').get();
  const byParser = db.prepare('SELECT parser_source, COUNT(*) as count FROM events GROUP BY parser_source').all();
  const last24h = db.prepare("SELECT COUNT(*) as count FROM events WHERE created_at >= datetime('now', '-1 day')").get();

  // Events per hour for last 24h
  const hourly = db.prepare(`
    SELECT strftime('%Y-%m-%d %H:00', created_at) as hour, COUNT(*) as count
    FROM events WHERE created_at >= datetime('now', '-1 day')
    GROUP BY hour ORDER BY hour
  `).all();

  res.json({ total: total.count, blocked: blocked.count, allowed: allowed.count, cdpaRelevant: cdpaRelevant.count, byParser, last24h: last24h.count, hourly });
});

// GET /api/v1/alerts — fetch correlation alerts
router.get('/alerts', (req, res) => {
  const { severity, limit = 100, offset = 0 } = req.query;
  let query = 'SELECT * FROM alerts WHERE 1=1';
  const params = [];
  if (severity) { query += ' AND severity = ?'; params.push(severity); }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const alerts = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as count FROM alerts').get();

  const parsed = alerts.map(a => ({
    id: a.id,
    ruleId: a.rule_id,
    ruleName: a.rule_name,
    severity: a.severity,
    sourceIp: a.source_ip,
    destinationIp: a.destination_ip,
    destinationPort: a.destination_port,
    protocol: a.protocol,
    description: a.description,
    eventCount: a.event_count,
    autoRespond: !!a.auto_responded,
    respondAction: a.respond_action,
    timestamp: a.created_at,
  }));

  res.json({ alerts: parsed, total: total.count });
});

module.exports = router;
