'use strict';
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireRole, logAudit } = require('../auth');

// GET /api/v1/assets
router.get('/', (req, res) => {
  const assets = db.prepare('SELECT * FROM assets ORDER BY criticality DESC, hostname ASC').all();
  res.json({ assets });
});

// POST /api/v1/assets
router.post('/', requireRole('admin', 'analyst'), (req, res) => {
  const { ip_address, hostname, device_type, os, owner, department, criticality, mac_address, notes } = req.body;
  if (!ip_address && !hostname) return res.status(400).json({ error: 'IP address or hostname required' });
  const id = uuidv4();
  db.prepare(`INSERT INTO assets (id, ip_address, hostname, mac_address, device_type, os, owner, department, criticality, notes, last_seen) VALUES (?,?,?,?,?,?,?,?,?,?,datetime('now'))`)
    .run(id, ip_address, hostname, mac_address || null, device_type || 'Workstation', os || null, owner || null, department || null, criticality || 'medium', notes || null);
  logAudit(req.user.id, req.user.username, 'asset_created', 'asset', id, { ip_address, hostname }, req.ip);
  res.status(201).json({ id });
});

// PATCH /api/v1/assets/:id
router.patch('/:id', requireRole('admin', 'analyst'), (req, res) => {
  const fields = []; const values = [];
  for (const [key, val] of Object.entries(req.body)) {
    if (['ip_address', 'hostname', 'mac_address', 'device_type', 'os', 'owner', 'department', 'criticality', 'risk_score', 'notes'].includes(key)) {
      fields.push(`${key} = ?`); values.push(val);
    }
  }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
  fields.push("updated_at = datetime('now')");
  values.push(req.params.id);
  db.prepare(`UPDATE assets SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

// DELETE /api/v1/assets/:id
router.delete('/:id', requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM assets WHERE id = ?').run(req.params.id);
  logAudit(req.user.id, req.user.username, 'asset_deleted', 'asset', req.params.id, null, req.ip);
  res.json({ success: true });
});

module.exports = router;
