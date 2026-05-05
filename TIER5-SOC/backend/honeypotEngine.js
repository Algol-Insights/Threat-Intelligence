'use strict';
/**
 * Deception Engine — Software Honeypots
 * Opens fake service listeners on configurable ports.
 * Any connection = guaranteed malicious (no legitimate traffic expected).
 * High-confidence threat detection with zero false positives.
 */

const net = require('net');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const activeHoneypots = new Map();
let broadcastFn = null;

// ── Honeypot service definitions ────────────────────────────────────────────

const HONEYPOT_SERVICES = [
  { port: 2222, name: 'SSH Honeypot', banner: 'SSH-2.0-OpenSSH_8.9p1 Ubuntu-3ubuntu0.1\r\n', protocol: 'TCP' },
  { port: 8888, name: 'HTTP Honeypot', banner: 'HTTP/1.1 200 OK\r\nServer: Apache/2.4.54\r\nContent-Type: text/html\r\n\r\n<html><head><title>Admin Portal</title></head><body><h1>Login</h1></body></html>', protocol: 'TCP' },
  { port: 4450, name: 'SMB Honeypot', banner: '', protocol: 'TCP' },
  { port: 3380, name: 'RDP Honeypot', banner: '', protocol: 'TCP' },
  { port: 2121, name: 'FTP Honeypot', banner: '220 FTP Server ready.\r\n', protocol: 'TCP' },
];

// ── Start a honeypot listener ───────────────────────────────────────────────

function startHoneypot(config, broadcast) {
  if (broadcastFn === null && broadcast) broadcastFn = broadcast;
  if (activeHoneypots.has(config.port)) return { success: false, error: 'Port already in use' };

  const server = net.createServer((socket) => {
    const remoteIp = socket.remoteAddress?.replace('::ffff:', '') || 'unknown';
    const remotePort = socket.remotePort;

    console.log(`[HONEYPOT] ${config.name} connection from ${remoteIp}:${remotePort}`);

    // Send banner to lure attacker
    if (config.banner) socket.write(config.banner);

    // Collect any data the attacker sends
    let receivedData = '';
    socket.on('data', (data) => {
      receivedData += data.toString('utf8', 0, Math.min(data.length, 1024));
    });

    // Log and close after 5 seconds
    setTimeout(() => {
      const event = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        sourceIp: remoteIp,
        sourcePort: remotePort,
        destinationPort: config.port,
        protocol: config.protocol,
        service: config.name,
        dataReceived: receivedData.slice(0, 512),
        dataLength: receivedData.length,
      };

      // Persist to DB
      persistHoneypotEvent(event);

      // Broadcast to connected clients
      if (broadcastFn) {
        broadcastFn('HONEYPOT_ALERT', {
          ...event,
          severity: 'Critical',
          message: `Honeypot triggered: ${config.name} accessed by ${remoteIp}`,
          confidence: 1.0, // 100% confidence — no legitimate traffic expected
        });
      }

      socket.destroy();
    }, 5000);

    socket.on('error', () => socket.destroy());
  });

  server.on('error', (err) => {
    console.error(`[HONEYPOT] Failed to start ${config.name} on port ${config.port}: ${err.message}`);
  });

  server.listen(config.port, '0.0.0.0', () => {
    console.log(`[HONEYPOT] ${config.name} listening on port ${config.port}`);
    activeHoneypots.set(config.port, { server, config, startedAt: Date.now() });
  });

  return { success: true, port: config.port, name: config.name };
}

// ── Stop a honeypot ─────────────────────────────────────────────────────────

function stopHoneypot(port) {
  const hp = activeHoneypots.get(port);
  if (!hp) return { success: false, error: 'Not running' };
  hp.server.close();
  activeHoneypots.delete(port);
  console.log(`[HONEYPOT] Stopped on port ${port}`);
  return { success: true };
}

// ── Start all default honeypots ─────────────────────────────────────────────

function startAllHoneypots(broadcast) {
  broadcastFn = broadcast;
  const results = [];
  for (const svc of HONEYPOT_SERVICES) {
    results.push(startHoneypot(svc, broadcast));
  }
  return results;
}

// ── Persist honeypot event ──────────────────────────────────────────────────

function persistHoneypotEvent(event) {
  try {
    db.prepare(`INSERT INTO honeypot_events (id, source_ip, source_port, destination_port, protocol, service_name, data_received, data_length, created_at) VALUES (?,?,?,?,?,?,?,?,datetime('now'))`)
      .run(event.id, event.sourceIp, event.sourcePort, event.destinationPort, event.protocol, event.service, event.dataReceived, event.dataLength);
  } catch { /* table might not exist yet */ }
}

// ── Get honeypot status and events ──────────────────────────────────────────

function getHoneypotStatus() {
  let events = [];
  let totalEvents = 0;
  try {
    events = db.prepare('SELECT * FROM honeypot_events ORDER BY created_at DESC LIMIT 50').all();
    const count = db.prepare('SELECT COUNT(*) as count FROM honeypot_events').get();
    totalEvents = count?.count || 0;
  } catch { /* table might not exist */ }

  const uniqueAttackers = new Set(events.map(e => e.source_ip)).size;

  return {
    activeHoneypots: [...activeHoneypots.entries()].map(([port, hp]) => ({
      port,
      name: hp.config.name,
      protocol: hp.config.protocol,
      uptime: Math.round((Date.now() - hp.startedAt) / 60000),
    })),
    totalHoneypots: activeHoneypots.size,
    totalEvents,
    uniqueAttackers,
    recentEvents: events,
    availableServices: HONEYPOT_SERVICES,
  };
}

module.exports = { startHoneypot, stopHoneypot, startAllHoneypots, getHoneypotStatus, HONEYPOT_SERVICES };
