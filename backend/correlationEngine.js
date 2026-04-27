'use strict';

const { exec } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

// ── In-memory sliding window per source IP ──────────────────────────────────

const eventWindows = new Map(); // sourceIp -> [{ timestamp, port, protocol, action }]
const WINDOW_TTL_MS = 120_000; // 2 minutes

// ── Rule stats tracking ─────────────────────────────────────────────────────

const ruleStats = new Map(); // ruleId -> { matchCount, lastMatch }

// ── Core evaluation ─────────────────────────────────────────────────────────

function addToWindow(log) {
  const key = log.sourceIp;
  if (!eventWindows.has(key)) eventWindows.set(key, []);
  
  const window = eventWindows.get(key);
  const now = Date.now();
  
  window.push({
    timestamp: now,
    port: log.destinationPort,
    protocol: log.protocol,
    action: log.action,
    dstIp: log.destinationIp,
  });

  // Prune expired entries
  const cutoff = now - WINDOW_TTL_MS;
  while (window.length > 0 && window[0].timestamp < cutoff) {
    window.shift();
  }
}

function evaluateRules(log, enrichedLog) {
  addToWindow(log);
  
  const rules = db.prepare('SELECT * FROM correlation_rules WHERE enabled = 1').all();
  const alerts = [];
  const window = eventWindows.get(log.sourceIp) || [];

  for (const rule of rules) {
    let matched = false;
    const windowMs = rule.window_seconds * 1000;
    const cutoff = Date.now() - windowMs;
    const recentEvents = window.filter(e => e.timestamp >= cutoff);

    switch (rule.condition_type) {
      case 'port_scan': {
        const uniquePorts = new Set(recentEvents.map(e => e.port));
        matched = uniquePorts.size >= rule.threshold;
        break;
      }
      case 'brute_force_ssh': {
        const sshAttempts = recentEvents.filter(e => e.port === 22 && e.action === 'BLOCKED');
        matched = sshAttempts.length >= rule.threshold;
        break;
      }
      case 'brute_force_rdp': {
        const rdpAttempts = recentEvents.filter(e => e.port === 3389 && e.action === 'BLOCKED');
        matched = rdpAttempts.length >= rule.threshold;
        break;
      }
      case 'known_malicious': {
        matched = !!(enrichedLog.mispContext && enrichedLog.mispContext.confidence >= 0.7);
        break;
      }
      case 'tor_exit': {
        const torPorts = [9001, 9030, 9050, 9051, 9150];
        matched = torPorts.includes(log.destinationPort) ||
                  (enrichedLog.mispContext?.tags?.includes('tor'));
        break;
      }
      case 'dns_abuse': {
        const dnsEvents = recentEvents.filter(e => e.port === 53 && e.action === 'BLOCKED');
        matched = dnsEvents.length >= rule.threshold;
        break;
      }
      case 'c2_beacon': {
        // Detect regular-interval callbacks (within 10% timing variance)
        const callbackEvents = recentEvents.filter(e => e.dstIp === log.destinationIp);
        if (callbackEvents.length >= rule.threshold) {
          const intervals = [];
          for (let i = 1; i < callbackEvents.length; i++) {
            intervals.push(callbackEvents[i].timestamp - callbackEvents[i - 1].timestamp);
          }
          if (intervals.length >= 2) {
            const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const variance = intervals.every(iv => Math.abs(iv - avg) / avg < 0.15);
            matched = variance;
          }
        }
        break;
      }
      case 'data_exfil': {
        // Flag any outbound connection on unusual high ports to external IPs
        const suspiciousPorts = [4444, 5555, 8888, 31337, 1337, 6667, 6697];
        matched = suspiciousPorts.includes(log.destinationPort) && log.action === 'ALLOWED';
        break;
      }
    }

    if (matched) {
      // Update rule stats in DB
      db.prepare(`
        UPDATE correlation_rules 
        SET match_count = match_count + 1, last_match = datetime('now') 
        WHERE id = ?
      `).run(rule.id);

      // Track in memory too
      const stats = ruleStats.get(rule.id) || { matchCount: 0 };
      stats.matchCount++;
      stats.lastMatch = new Date().toISOString();
      ruleStats.set(rule.id, stats);

      const alert = {
        id: `alert-${uuidv4()}`,
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        sourceIp: log.sourceIp,
        destinationIp: log.destinationIp,
        destinationPort: log.destinationPort,
        protocol: log.protocol,
        description: `${rule.name}: ${rule.description}`,
        eventCount: recentEvents.length,
        timestamp: new Date().toISOString(),
        autoRespond: !!rule.auto_respond,
        respondAction: rule.respond_action,
      };

      alerts.push(alert);

      // Auto-response: execute UFW block for critical rules
      if (rule.auto_respond && rule.respond_action === 'block_ip') {
        executeAutoBlock(log.sourceIp, rule.id, rule.name);
      }

      console.log(`[CORRELATION] Rule ${rule.id} matched: ${rule.name} (source: ${log.sourceIp}, severity: ${rule.severity})`);
    }
  }

  return alerts;
}

// ── Auto-response: UFW block ─────────────────────────────────────────────────

function executeAutoBlock(ip, ruleId, ruleName) {
  // Safety: never block private/local ranges
  if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.') || ip === '127.0.0.1') {
    console.log(`[SOAR] Skipping auto-block for private IP: ${ip}`);
    return;
  }

  const command = `ufw deny from ${ip} to any comment "Chengeto auto-block: ${ruleName}"`;
  console.log(`[SOAR] Auto-blocking IP: ${ip} (rule: ${ruleId})`);

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.warn(`[SOAR] UFW block failed for ${ip}: ${error.message}`);
    } else {
      console.log(`[SOAR] UFW block applied for ${ip}: ${stdout.trim()}`);
    }
  });
}

// ── API helpers ──────────────────────────────────────────────────────────────

function getCorrelationStats() {
  const rules = db.prepare('SELECT * FROM correlation_rules ORDER BY match_count DESC').all();
  return {
    rules: rules.map(r => ({
      ...r,
      enabled: !!r.enabled,
      auto_respond: !!r.auto_respond,
    })),
    totalMatches: rules.reduce((sum, r) => sum + r.match_count, 0),
    activeWindows: eventWindows.size,
  };
}

function getRules() {
  return db.prepare('SELECT * FROM correlation_rules ORDER BY id').all();
}

function updateRule(ruleId, updates) {
  const fields = [];
  const values = [];
  for (const [key, val] of Object.entries(updates)) {
    if (['name', 'description', 'threshold', 'window_seconds', 'severity', 'enabled', 'auto_respond', 'respond_action'].includes(key)) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }
  if (fields.length === 0) return;
  values.push(ruleId);
  db.prepare(`UPDATE correlation_rules SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

// ── Periodic cleanup ─────────────────────────────────────────────────────────

setInterval(() => {
  const cutoff = Date.now() - WINDOW_TTL_MS;
  for (const [key, window] of eventWindows.entries()) {
    const filtered = window.filter(e => e.timestamp >= cutoff);
    if (filtered.length === 0) eventWindows.delete(key);
    else eventWindows.set(key, filtered);
  }
}, 30_000);

module.exports = { evaluateRules, getCorrelationStats, getRules, updateRule };
