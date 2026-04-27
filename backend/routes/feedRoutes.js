'use strict';
const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { requireRole, logAudit } = require('../auth');

// GET /api/v1/feeds
router.get('/', (req, res) => {
  res.json({ feeds: db.prepare('SELECT * FROM threat_feeds ORDER BY name').all() });
});

// POST /api/v1/feeds/:id/sync
router.post('/:id/sync', requireRole('admin', 'analyst'), async (req, res) => {
  const feed = db.prepare('SELECT * FROM threat_feeds WHERE id = ?').get(req.params.id);
  if (!feed) return res.status(404).json({ error: 'Feed not found' });

  db.prepare("UPDATE threat_feeds SET status = 'syncing' WHERE id = ?").run(feed.id);

  try {
    let iocCount = 0;

    if (feed.type === 'threatfox') {
      // ThreatFox API sync
      const response = await fetch(feed.url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'get_iocs', days: 7 }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.data && Array.isArray(data.data)) {
          const insert = db.prepare('INSERT OR IGNORE INTO ioc_watchlist (id, type, value, threat_type, confidence, source, tags, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
          const tx = db.transaction(() => {
            for (const ioc of data.data.slice(0, 500)) {
              const type = ioc.ioc_type?.includes('ip') ? 'ip' : ioc.ioc_type?.includes('domain') ? 'domain' : ioc.ioc_type?.includes('url') ? 'url' : 'hash';
              insert.run(uuidv4(), type, ioc.ioc, ioc.threat_type, 0.8, 'ThreatFox', JSON.stringify(ioc.tags || []), 'system');
              iocCount++;
            }
          });
          tx();
        }
      }
    } else if (feed.type === 'feodo') {
      const response = await fetch(feed.url);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const insert = db.prepare('INSERT OR IGNORE INTO ioc_watchlist (id, type, value, threat_type, confidence, source, tags, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
          const tx = db.transaction(() => {
            for (const entry of data.slice(0, 500)) {
              insert.run(uuidv4(), 'ip', entry.ip_address || entry.ip, 'botnet_cc', 0.9, 'Feodo Tracker', '["botnet","c2"]', 'system');
              iocCount++;
            }
          });
          tx();
        }
      }
    }

    db.prepare("UPDATE threat_feeds SET status = 'idle', last_sync = datetime('now'), ioc_count = ?, error = NULL WHERE id = ?")
      .run(iocCount, feed.id);

    logAudit(req.user.id, req.user.username, 'feed_synced', 'feed', feed.id, { name: feed.name, iocs: iocCount }, req.ip);
    res.json({ success: true, iocCount });
  } catch (err) {
    db.prepare("UPDATE threat_feeds SET status = 'error', error = ? WHERE id = ?").run(err.message, feed.id);
    res.status(500).json({ error: 'Feed sync failed', details: err.message });
  }
});

// PATCH /api/v1/feeds/:id
router.patch('/:id', requireRole('admin'), (req, res) => {
  const { enabled } = req.body;
  if (enabled !== undefined) {
    db.prepare('UPDATE threat_feeds SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, req.params.id);
  }
  res.json({ success: true });
});

module.exports = router;
