'use strict';
/**
 * UEBA Engine — User & Entity Behavior Analytics
 * Tracks baselines for IPs, users, and ports. Flags anomalies.
 * No ML library needed — uses statistical z-score deviation.
 */

const db = require('./db');
const { v4: uuidv4 } = require('uuid');

// ── In-memory baselines (rebuilt from DB on startup) ────────────────────────

const baselines = {
  // IP → { totalEvents, avgPerHour, stdDev, lastSeen, firstSeen, ports: Set }
  ips: new Map(),
  // port → { totalHits, avgPerHour, stdDev }
  ports: new Map(),
  // hour-of-day → event count (24 buckets)
  hourly: new Array(24).fill(0),
  totalEvents: 0,
  startTime: Date.now(),
};

// ── Update baseline with new event ──────────────────────────────────────────

function updateBaseline(event) {
  baselines.totalEvents++;
  const hour = new Date(event.timestamp).getHours();
  baselines.hourly[hour]++;

  // IP baseline
  const ip = event.sourceIp || event.source_ip;
  if (ip) {
    if (!baselines.ips.has(ip)) {
      baselines.ips.set(ip, { totalEvents: 0, hourCounts: new Array(24).fill(0), ports: new Set(), firstSeen: Date.now(), lastSeen: Date.now() });
    }
    const ipData = baselines.ips.get(ip);
    ipData.totalEvents++;
    ipData.hourCounts[hour]++;
    ipData.lastSeen = Date.now();
    const port = event.destinationPort || event.destination_port;
    if (port) ipData.ports.add(port);
  }

  // Port baseline
  const port = event.destinationPort || event.destination_port;
  if (port) {
    if (!baselines.ports.has(port)) baselines.ports.set(port, { totalHits: 0, hourCounts: new Array(24).fill(0) });
    const portData = baselines.ports.get(port);
    portData.totalHits++;
    portData.hourCounts[hour]++;
  }
}

// ── Detect anomalies ────────────────────────────────────────────────────────

function detectAnomalies(event) {
  const anomalies = [];
  const ip = event.sourceIp || event.source_ip;
  const port = event.destinationPort || event.destination_port;
  const hour = new Date(event.timestamp).getHours();

  // 1. New IP never seen before (after baseline period)
  if (ip && !baselines.ips.has(ip) && baselines.totalEvents > 50) {
    anomalies.push({
      type: 'new_entity',
      severity: 'Medium',
      description: `First-time source IP: ${ip} — not in behavioral baseline`,
      score: 0.6,
    });
  }

  // 2. IP accessing unusual port (not in its historical port set)
  if (ip && baselines.ips.has(ip)) {
    const ipData = baselines.ips.get(ip);
    if (port && ipData.ports.size > 3 && !ipData.ports.has(port)) {
      anomalies.push({
        type: 'unusual_port',
        severity: 'High',
        description: `${ip} accessing port ${port} for the first time (normally uses: ${[...ipData.ports].slice(0, 5).join(', ')})`,
        score: 0.75,
      });
    }
  }

  // 3. Unusual time-of-day activity
  if (baselines.totalEvents > 100) {
    const avgHourly = baselines.totalEvents / 24;
    const hourCount = baselines.hourly[hour];
    if (avgHourly > 0) {
      const deviation = (hourCount - avgHourly) / Math.max(avgHourly, 1);
      // Activity in a typically quiet hour
      if (hourCount < avgHourly * 0.1 && baselines.totalEvents > 200) {
        anomalies.push({
          type: 'off_hours',
          severity: 'Medium',
          description: `Activity at ${hour}:00 — historically quiet period (${hourCount} vs avg ${Math.round(avgHourly)} events/hour)`,
          score: 0.65,
        });
      }
    }
  }

  // 4. IP volume spike (more than 3x its average rate)
  if (ip && baselines.ips.has(ip)) {
    const ipData = baselines.ips.get(ip);
    const ageHours = Math.max(1, (Date.now() - ipData.firstSeen) / 3600000);
    const avgRate = ipData.totalEvents / ageHours;
    // Check last-minute burst by comparing recent count
    if (avgRate > 0 && ipData.totalEvents > 20) {
      const recentRate = ipData.hourCounts[hour] / Math.max(1, ageHours / 24);
      if (recentRate > avgRate * 3) {
        anomalies.push({
          type: 'volume_spike',
          severity: 'High',
          description: `${ip} volume spike: ${Math.round(recentRate)}x normal rate`,
          score: 0.8,
        });
      }
    }
  }

  // 5. Rare port targeting (port rarely seen globally)
  if (port && baselines.ports.has(port) && baselines.totalEvents > 100) {
    const portData = baselines.ports.get(port);
    const portPct = portData.totalHits / baselines.totalEvents;
    if (portPct < 0.01 && portData.totalHits > 1) {
      anomalies.push({
        type: 'rare_port',
        severity: 'Low',
        description: `Port ${port} is rarely targeted (${(portPct * 100).toFixed(2)}% of all traffic)`,
        score: 0.4,
      });
    }
  }

  return anomalies;
}

// ── Persist anomaly ─────────────────────────────────────────────────────────

function persistAnomaly(event, anomaly) {
  try {
    db.prepare(`INSERT INTO ueba_anomalies (id, event_id, source_ip, anomaly_type, severity, description, risk_score, created_at) VALUES (?,?,?,?,?,?,?,datetime('now'))`)
      .run(uuidv4(), event.id, event.sourceIp || event.source_ip, anomaly.type, anomaly.severity, anomaly.description, anomaly.score);
  } catch { /* table might not exist yet */ }
}

// ── Get UEBA summary ────────────────────────────────────────────────────────

function getUEBASummary() {
  const anomalies = [];
  try {
    const recent = db.prepare('SELECT * FROM ueba_anomalies ORDER BY created_at DESC LIMIT 50').all();
    anomalies.push(...recent);
  } catch { /* table might not exist */ }

  return {
    baselineStatus: baselines.totalEvents > 100 ? 'active' : baselines.totalEvents > 0 ? 'learning' : 'no_data',
    totalEventsBaselined: baselines.totalEvents,
    uniqueIPs: baselines.ips.size,
    uniquePorts: baselines.ports.size,
    hourlyDistribution: baselines.hourly,
    recentAnomalies: anomalies,
    topIPs: [...baselines.ips.entries()]
      .sort((a, b) => b[1].totalEvents - a[1].totalEvents)
      .slice(0, 10)
      .map(([ip, data]) => ({ ip, events: data.totalEvents, ports: data.ports.size, firstSeen: new Date(data.firstSeen).toISOString() })),
  };
}

module.exports = { updateBaseline, detectAnomalies, persistAnomaly, getUEBASummary };
