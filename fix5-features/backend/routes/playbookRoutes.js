'use strict';
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const db = require('../db');
const { requireRole, logAudit } = require('../auth');
const { sendAlert } = require('../alertService');

// GET /api/v1/playbooks
router.get('/', (req, res) => {
  const playbooks = db.prepare('SELECT * FROM playbooks ORDER BY name').all();
  res.json({ playbooks: playbooks.map(p => ({ ...p, actions: JSON.parse(p.actions || '[]'), enabled: !!p.enabled })) });
});

// GET /api/v1/playbooks/:id
router.get('/:id', (req, res) => {
  const pb = db.prepare('SELECT * FROM playbooks WHERE id = ?').get(req.params.id);
  if (!pb) return res.status(404).json({ error: 'Playbook not found' });
  pb.actions = JSON.parse(pb.actions || '[]');
  const executions = db.prepare('SELECT * FROM playbook_executions WHERE playbook_id = ? ORDER BY created_at DESC LIMIT 20').all(req.params.id);
  res.json({ playbook: pb, executions: executions.map(e => ({ ...e, results: JSON.parse(e.results || '[]') })) });
});

// POST /api/v1/playbooks — create new playbook
router.post('/', requireRole('admin', 'analyst'), (req, res) => {
  const { name, description, trigger_type, trigger_severity, actions, enabled } = req.body;
  if (!name || !actions) return res.status(400).json({ error: 'Name and actions required' });
  const id = `pb-${uuidv4().slice(0, 8)}`;
  db.prepare(`INSERT INTO playbooks (id, name, description, trigger_type, trigger_severity, actions, enabled, created_by) VALUES (?,?,?,?,?,?,?,?)`)
    .run(id, name, description || '', trigger_type || 'manual', trigger_severity || 'High', JSON.stringify(actions), enabled !== false ? 1 : 0, req.user.id);
  logAudit(req.user.id, req.user.username, 'playbook_created', 'playbook', id, { name }, req.ip);
  res.status(201).json({ id });
});

// POST /api/v1/playbooks/:id/execute
router.post('/:id/execute', requireRole('admin', 'analyst'), async (req, res) => {
  const pb = db.prepare('SELECT * FROM playbooks WHERE id = ?').get(req.params.id);
  if (!pb) return res.status(404).json({ error: 'Playbook not found' });
  
  const actions = JSON.parse(pb.actions || '[]');
  const { triggerEvent } = req.body;
  const execId = uuidv4();
  const startTime = Date.now();
  const results = [];

  db.prepare(`INSERT INTO playbook_executions (id, playbook_id, trigger_event_id, status, executed_by) VALUES (?,?,?,?,?)`)
    .run(execId, pb.id, triggerEvent?.id || null, 'running', req.user.id);

  for (const action of actions.sort((a, b) => a.order - b.order)) {
    const actionStart = Date.now();
    let result = { order: action.order, type: action.type, status: 'success', message: '', durationMs: 0 };

    try {
      switch (action.type) {
        case 'block_ip': {
          const ip = triggerEvent?.sourceIp || action.params?.ip;
          if (!ip) { result.status = 'skipped'; result.message = 'No IP to block'; break; }
          if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip === '127.0.0.1') {
            result.status = 'skipped'; result.message = `Skipped private IP: ${ip}`; break;
          }
          await new Promise((resolve, reject) => {
            exec(`ufw deny from ${ip} to any comment "Chengeto playbook: ${pb.name}"`, (err, stdout) => {
              if (err) { result.status = 'warning'; result.message = `UFW: ${err.message}`; }
              else { result.message = `Blocked ${ip} via UFW`; }
              resolve(null);
            });
          });
          break;
        }
        case 'send_alert': {
          const channel = action.params?.channel || 'dashboard';
          const alertResult = await sendAlert('correlation_alert', {
            severity: triggerEvent?.severity || 'High',
            ruleName: `Playbook: ${pb.name}`,
            sourceIp: triggerEvent?.sourceIp || 'N/A',
            destinationIp: triggerEvent?.destinationIp || 'N/A',
            destinationPort: triggerEvent?.destinationPort || 0,
            description: `Playbook ${pb.name} triggered alert via ${channel}`,
          });
          result.message = `Alert sent via: ${alertResult.channels?.join(', ') || 'console'}`;
          break;
        }
        case 'create_incident': {
          const incId = uuidv4();
          const severity = action.params?.severity || triggerEvent?.severity || 'High';
          const cdpa = action.params?.cdpa || false;
          let cdpaDeadline = null;
          if (cdpa) { const d = new Date(); d.setHours(d.getHours() + 72); cdpaDeadline = d.toISOString(); }
          db.prepare(`INSERT INTO incidents (id, title, description, severity, source_alert_id, cdpa_relevant, cdpa_deadline, created_by) VALUES (?,?,?,?,?,?,?,?)`)
            .run(incId, `[Auto] ${pb.name}`, `Created by playbook execution`, severity, triggerEvent?.id || null, cdpa ? 1 : 0, cdpaDeadline, 'system');
          result.message = `Incident created: ${incId.slice(0, 8)}`;
          break;
        }
        case 'enrich_ioc': {
          const ip = triggerEvent?.sourceIp;
          if (ip) {
            db.prepare('INSERT OR IGNORE INTO ioc_watchlist (id, type, value, threat_type, confidence, source, tags, created_by) VALUES (?,?,?,?,?,?,?,?)')
              .run(uuidv4(), 'ip', ip, 'playbook_flagged', 0.8, `playbook:${pb.name}`, '["auto"]', 'system');
            result.message = `IOC added: ${ip}`;
          } else { result.status = 'skipped'; result.message = 'No IP to enrich'; }
          break;
        }
        case 'quarantine_host': {
          result.status = 'logged';
          result.message = `Quarantine requested for ${triggerEvent?.sourceIp || 'unknown'} — requires EDR integration`;
          break;
        }
        case 'update_firewall': {
          result.status = 'logged';
          result.message = 'Firewall rule update queued — requires vendor adapter';
          break;
        }
        case 'notify_email': {
          result.status = 'logged';
          result.message = 'Email notification queued — configure SMTP in Settings';
          break;
        }
        case 'run_script': {
          result.status = 'logged';
          result.message = `Script execution logged — allowlist not configured`;
          break;
        }
        default:
          result.status = 'unknown';
          result.message = `Unknown action type: ${action.type}`;
      }
    } catch (err) {
      result.status = 'failed';
      result.message = err.message;
    }

    result.durationMs = Date.now() - actionStart;
    results.push(result);
  }

  const totalDuration = Date.now() - startTime;
  const finalStatus = results.every(r => r.status === 'success' || r.status === 'logged') ? 'completed'
    : results.some(r => r.status === 'failed') ? 'partial' : 'completed';

  db.prepare(`UPDATE playbook_executions SET status = ?, results = ?, duration_ms = ? WHERE id = ?`)
    .run(finalStatus, JSON.stringify(results), totalDuration, execId);
  db.prepare(`UPDATE playbooks SET execution_count = execution_count + 1, last_executed = datetime('now') WHERE id = ?`).run(pb.id);

  logAudit(req.user.id, req.user.username, 'playbook_executed', 'playbook', pb.id, { execId, status: finalStatus, durationMs: totalDuration }, req.ip);

  res.json({ executionId: execId, status: finalStatus, results, durationMs: totalDuration });
});

// PATCH /api/v1/playbooks/:id
router.patch('/:id', requireRole('admin'), (req, res) => {
  const { name, description, actions, enabled, trigger_type, trigger_severity } = req.body;
  const fields = []; const values = [];
  if (name) { fields.push('name = ?'); values.push(name); }
  if (description !== undefined) { fields.push('description = ?'); values.push(description); }
  if (actions) { fields.push('actions = ?'); values.push(JSON.stringify(actions)); }
  if (enabled !== undefined) { fields.push('enabled = ?'); values.push(enabled ? 1 : 0); }
  if (trigger_type) { fields.push('trigger_type = ?'); values.push(trigger_type); }
  if (trigger_severity) { fields.push('trigger_severity = ?'); values.push(trigger_severity); }
  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
  fields.push("updated_at = datetime('now')");
  values.push(req.params.id);
  db.prepare(`UPDATE playbooks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

// DELETE /api/v1/playbooks/:id
router.delete('/:id', requireRole('admin'), (req, res) => {
  db.prepare('DELETE FROM playbooks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
