'use strict';

// ── UEBA Routes ─────────────────────────────────────────────────────────────
const uebaRouter = require('express').Router();
const { getUEBASummary } = require('../uebaEngine');

uebaRouter.get('/summary', (req, res) => {
  res.json(getUEBASummary());
});

uebaRouter.get('/anomalies', (req, res) => {
  const db = require('../db');
  const { limit = 50, severity } = req.query;
  let query = 'SELECT * FROM ueba_anomalies WHERE 1=1';
  const params = [];
  if (severity) { query += ' AND severity = ?'; params.push(severity); }
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  try {
    const anomalies = db.prepare(query).all(...params);
    res.json({ anomalies });
  } catch { res.json({ anomalies: [] }); }
});

// ── Honeypot Routes ─────────────────────────────────────────────────────────
const honeypotRouter = require('express').Router();
const { getHoneypotStatus, startHoneypot, stopHoneypot, HONEYPOT_SERVICES } = require('../honeypotEngine');

honeypotRouter.get('/status', (req, res) => {
  res.json(getHoneypotStatus());
});

honeypotRouter.post('/start', (req, res) => {
  const { requireRole } = require('../auth');
  const { port } = req.body;
  const svc = HONEYPOT_SERVICES.find(s => s.port === port);
  if (!svc) return res.status(400).json({ error: 'Unknown honeypot port' });
  const result = startHoneypot(svc);
  res.json(result);
});

honeypotRouter.post('/stop', (req, res) => {
  const { port } = req.body;
  const result = stopHoneypot(port);
  res.json(result);
});

honeypotRouter.get('/events', (req, res) => {
  const db = require('../db');
  const { limit = 50 } = req.query;
  try {
    const events = db.prepare('SELECT * FROM honeypot_events ORDER BY created_at DESC LIMIT ?').all(parseInt(limit));
    const total = db.prepare('SELECT COUNT(*) as count FROM honeypot_events').get();
    res.json({ events, total: total?.count || 0 });
  } catch { res.json({ events: [], total: 0 }); }
});

// ── Threat Hunting Routes ───────────────────────────────────────────────────
const huntRouter = require('express').Router();
const db = require('../db');
const { v4: uuidv4 } = require('uuid');

// Save a hunt hypothesis
huntRouter.post('/hypotheses', (req, res) => {
  const { title, description, query_params, status } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  const id = uuidv4();
  try {
    db.prepare('INSERT INTO hunt_hypotheses (id, title, description, query_params, status, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,datetime("now"),datetime("now"))')
      .run(id, title, description || '', JSON.stringify(query_params || {}), status || 'open', req.user.id);
    res.status(201).json({ id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// List hypotheses
huntRouter.get('/hypotheses', (req, res) => {
  try {
    const hypotheses = db.prepare('SELECT * FROM hunt_hypotheses ORDER BY created_at DESC').all();
    res.json({ hypotheses: hypotheses.map(h => ({ ...h, query_params: JSON.parse(h.query_params || '{}') })) });
  } catch { res.json({ hypotheses: [] }); }
});

// Update hypothesis
huntRouter.patch('/hypotheses/:id', (req, res) => {
  const { status, findings, query_params } = req.body;
  const fields = []; const values = [];
  if (status) { fields.push('status = ?'); values.push(status); }
  if (findings) { fields.push('findings = ?'); values.push(findings); }
  if (query_params) { fields.push('query_params = ?'); values.push(JSON.stringify(query_params)); }
  if (fields.length === 0) return res.status(400).json({ error: 'Nothing to update' });
  fields.push('updated_at = datetime("now")');
  values.push(req.params.id);
  db.prepare(`UPDATE hunt_hypotheses SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

// Advanced event search for hunting
huntRouter.post('/search', (req, res) => {
  const { source_ip, destination_ip, port_min, port_max, action, protocol, time_from, time_to, cdpa_only, limit = 100 } = req.body;
  let query = 'SELECT * FROM events WHERE 1=1';
  const params = [];

  if (source_ip) { query += ' AND source_ip LIKE ?'; params.push(`%${source_ip}%`); }
  if (destination_ip) { query += ' AND destination_ip LIKE ?'; params.push(`%${destination_ip}%`); }
  if (port_min) { query += ' AND destination_port >= ?'; params.push(parseInt(port_min)); }
  if (port_max) { query += ' AND destination_port <= ?'; params.push(parseInt(port_max)); }
  if (action) { query += ' AND action = ?'; params.push(action); }
  if (protocol) { query += ' AND protocol = ?'; params.push(protocol); }
  if (time_from) { query += ' AND created_at >= ?'; params.push(time_from); }
  if (time_to) { query += ' AND created_at <= ?'; params.push(time_to); }
  if (cdpa_only) { query += ' AND cdpa_relevant = 1'; }

  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));

  try {
    const events = db.prepare(query).all(...params);
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count').replace(/ORDER BY.*$/, '');
    res.json({ events, total: events.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = { uebaRouter, honeypotRouter, huntRouter };
