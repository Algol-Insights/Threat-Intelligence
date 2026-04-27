'use strict';
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { logAudit, requireRole } = require('../auth');

// GET /api/v1/incidents
router.get('/', (req, res) => {
  const { status, severity, limit = 50, offset = 0 } = req.query;
  let query = 'SELECT * FROM incidents WHERE 1=1';
  const params = [];
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (severity) { query += ' AND severity = ?'; params.push(severity); }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  const incidents = db.prepare(query).all(...params);
  const total = db.prepare('SELECT COUNT(*) as count FROM incidents').get();
  res.json({ incidents, total: total.count });
});

// GET /api/v1/incidents/:id
router.get('/:id', (req, res) => {
  const incident = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id);
  if (!incident) return res.status(404).json({ error: 'Incident not found' });
  const timeline = db.prepare('SELECT * FROM incident_timeline WHERE incident_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json({ incident, timeline });
});

// POST /api/v1/incidents
router.post('/', requireRole('admin', 'analyst'), (req, res) => {
  const { title, description, severity, source_alert_id, source_correlation_rule, cdpa_relevant, cdpa_section, tags } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const id = uuidv4();
  let cdpaDeadline = null;
  if (cdpa_relevant) {
    const d = new Date(); d.setHours(d.getHours() + 72);
    cdpaDeadline = d.toISOString();
  }

  db.prepare(`
    INSERT INTO incidents (id, title, description, severity, source_alert_id, source_correlation_rule, cdpa_relevant, cdpa_section, cdpa_deadline, tags, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, description || '', severity || 'Medium', source_alert_id, source_correlation_rule,
    cdpa_relevant ? 1 : 0, cdpa_section, cdpaDeadline, JSON.stringify(tags || []), req.user.id);

  // Add timeline entry
  db.prepare(`INSERT INTO incident_timeline (id, incident_id, action, actor_id, actor_username, details) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(uuidv4(), id, 'created', req.user.id, req.user.username, `Incident created with severity: ${severity || 'Medium'}`);

  logAudit(req.user.id, req.user.username, 'incident_created', 'incident', id, { title, severity }, req.ip);
  res.status(201).json({ id, title, severity: severity || 'Medium', status: 'open' });
});

// PATCH /api/v1/incidents/:id/status
router.patch('/:id/status', requireRole('admin', 'analyst'), (req, res) => {
  const { status } = req.body;
  const validStatuses = ['open', 'triaged', 'contained', 'resolved', 'closed'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const updates = { status, updated_at: new Date().toISOString() };
  if (status === 'resolved') updates.resolved_at = updates.updated_at;
  if (status === 'closed') updates.closed_at = updates.updated_at;

  db.prepare(`UPDATE incidents SET status = ?, updated_at = datetime('now')${status === 'resolved' ? ", resolved_at = datetime('now')" : ''}${status === 'closed' ? ", closed_at = datetime('now')" : ''} WHERE id = ?`)
    .run(status, req.params.id);

  db.prepare(`INSERT INTO incident_timeline (id, incident_id, action, actor_id, actor_username, details) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(uuidv4(), req.params.id, 'status_changed', req.user.id, req.user.username, `Status changed to: ${status}`);

  logAudit(req.user.id, req.user.username, 'incident_status_changed', 'incident', req.params.id, { status }, req.ip);
  res.json({ success: true, status });
});

// PATCH /api/v1/incidents/:id
router.patch('/:id', requireRole('admin', 'analyst'), (req, res) => {
  const { title, description, severity, assignee_id, tags } = req.body;
  const fields = []; const values = [];
  if (title) { fields.push('title = ?'); values.push(title); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (severity) { fields.push('severity = ?'); values.push(severity); }
  if (assignee_id !== undefined) { fields.push('assignee_id = ?'); values.push(assignee_id); }
  if (tags) { fields.push('tags = ?'); values.push(JSON.stringify(tags)); }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  fields.push("updated_at = datetime('now')");
  values.push(req.params.id);
  db.prepare(`UPDATE incidents SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

// DELETE /api/v1/incidents/:id
router.delete('/:id', requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM incidents WHERE id = ?').run(req.params.id);
  logAudit(req.user.id, req.user.username, 'incident_deleted', 'incident', req.params.id, null, req.ip);
  res.json({ success: true });
});

// ── DFIR sub-routes ─────────────────────────────────────────────────────────

// GET /api/v1/incidents/:id/dfir
router.get('/:id/dfir', (req, res) => {
  const cases = db.prepare('SELECT * FROM dfir_cases WHERE incident_id = ?').all(req.params.id);
  res.json({ cases });
});

// POST /api/v1/incidents/:id/dfir
router.post('/:id/dfir', requireRole('admin', 'analyst'), (req, res) => {
  const { title, summary } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO dfir_cases (id, incident_id, title, summary, lead_analyst_id) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.params.id, title, summary || '', req.user.id);
  res.status(201).json({ id });
});

// POST /api/v1/incidents/dfir/:caseId/evidence
router.post('/dfir/:caseId/evidence', requireRole('admin', 'analyst'), (req, res) => {
  const { name, type, description, hash_sha256 } = req.body;
  const id = uuidv4();
  const custody = JSON.stringify([{ actor: req.user.username, action: 'collected', at: new Date().toISOString() }]);
  db.prepare('INSERT INTO dfir_evidence (id, case_id, name, type, description, hash_sha256, chain_of_custody, collected_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.params.caseId, name, type, description, hash_sha256, custody, req.user.id);
  res.status(201).json({ id });
});

module.exports = router;
