'use strict';

/**
 * CHENGETO CTI Platform — Backend Server
 * by Algol Cyber Security
 * 
 * MERGE NOTE: This file preserves the original WebSocket + syslog + nmap
 * code and wraps it with Express HTTP API, authentication, and the
 * enrichment → correlation → CDPA compliance pipeline.
 */

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const dgram = require('dgram');
const { exec } = require('child_process');
const xml2js = require('xml2js');
const ip = require('ip');
const os = require('os');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// ── Internal modules (NEW) ──────────────────────────────────────────────────

const db = require('./db');
const { authenticate, requireRole, logAudit } = require('./auth');
const { parseSyslog } = require('./parsers');
const { enrichWithAfricaThreatIntel, getRegionalThreatSummary } = require('./africaThreatIntel');
const { evaluateRules, getCorrelationStats } = require('./correlationEngine');
const { classifyEvent, recordComplianceEvent } = require('./cdpaEngine');

// ── Route modules (NEW) ────────────────────────────────────────────────────

const authRoutes = require('./routes/authRoutes');
const analyzeRoutes = require('./routes/analyzeRoutes');
const incidentRoutes = require('./routes/incidentRoutes');
const complianceRoutes = require('./routes/complianceRoutes');
const iocRoutes = require('./routes/iocRoutes');
const feedRoutes = require('./routes/feedRoutes');
const adminRoutes = require('./routes/adminRoutes');

// ── Configuration ───────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '8080');
const SYSLOG_PORT = parseInt(process.env.SYSLOG_PORT || '1514');
const SCAN_INTERVAL = parseInt(process.env.SCAN_INTERVAL || '120000');
const ORG_SECTOR = process.env.ORG_SECTOR || 'general';

// ── Express setup (NEW — wraps original WS server) ──────────────────────────

const app = express();
const server = http.createServer(app);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Rate limiting
const apiLimiter = rateLimit({ windowMs: 60_000, max: 200, message: { error: 'Rate limit exceeded' } });
const authLimiter = rateLimit({ windowMs: 60_000, max: 20, message: { error: 'Too many auth attempts' } });
const analyzeLimiter = rateLimit({ windowMs: 60_000, max: 15, message: { error: 'Analysis rate limit exceeded' } });

// ── Health check ────────────────────────────────────────────────────────────

app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    platform: 'Chengeto CTI Platform',
    version: '1.0.0',
    company: 'Algol Cyber Security',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ── Mount API routes (NEW) ──────────────────────────────────────────────────

app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/analyze', authenticate, analyzeLimiter, analyzeRoutes);
app.use('/api/v1/incidents', authenticate, apiLimiter, incidentRoutes);
app.use('/api/v1/compliance', authenticate, apiLimiter, complianceRoutes);
app.use('/api/v1/ioc', authenticate, apiLimiter, iocRoutes);
app.use('/api/v1/feeds', authenticate, apiLimiter, feedRoutes);
app.use('/api/v1/admin', authenticate, requireRole('admin'), apiLimiter, adminRoutes);

// ── Correlation stats endpoint ──────────────────────────────────────────────

app.get('/api/v1/correlation/stats', authenticate, (req, res) => {
  res.json(getCorrelationStats());
});

// ── Live metrics ────────────────────────────────────────────────────────────

let totalLogsIngested = 0;
let logsInLastMinute = 0;
let logsPerMinuteHistory = [];
setInterval(() => {
  logsPerMinuteHistory.push(logsInLastMinute);
  if (logsPerMinuteHistory.length > 60) logsPerMinuteHistory.shift();
  logsInLastMinute = 0;
}, 60_000);

app.get('/api/v1/metrics', authenticate, (req, res) => {
  res.json({
    totalLogsIngested,
    logsPerMinute: logsInLastMinute,
    logsPerMinuteHistory,
    connectedClients: clients.size,
    activeCorrelationWindows: getCorrelationStats().activeWindows,
    uptime: process.uptime(),
  });
});

// ── Regional threat context ─────────────────────────────────────────────────

app.get('/api/v1/regional', authenticate, (req, res) => {
  res.json(getRegionalThreatSummary());
});

// ── Error handling ──────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ═══════════════════════════════════════════════════════════════════════════
// ORIGINAL CODE — WebSocket Server (preserved from your server.js)
// ═══════════════════════════════════════════════════════════════════════════

const wss = new WebSocketServer({ server, path: '/ws' });
const clients = new Set();

let scanIntervalId = null;

wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.add(ws);

  // Send initial context (NEW)
  ws.send(JSON.stringify({ type: 'REGIONAL_THREAT_SUMMARY', payload: getRegionalThreatSummary() }));
  ws.send(JSON.stringify({ type: 'CONNECTION_ACK', payload: { platform: 'Chengeto', connectedAt: new Date().toISOString() } }));

  // If this is the first client, start scanning. (ORIGINAL)
  if (clients.size === 1 && !scanIntervalId) {
    console.log('First client connected, starting network scans.');
    performNetworkScan();
    scanIntervalId = setInterval(performNetworkScan, SCAN_INTERVAL);
  }

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
    if (clients.size === 0 && scanIntervalId) {
      console.log('Last client disconnected, stopping network scans.');
      clearInterval(scanIntervalId);
      scanIntervalId = null;
    }
  });

  ws.on('error', (err) => console.error('[WS] Error:', err.message));
});

function broadcast(type, payload) {
  const msg = JSON.stringify({ type, payload });
  clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// ORIGINAL CODE — Syslog Server (preserved, ENHANCED with pipeline)
// ═══════════════════════════════════════════════════════════════════════════

const syslogServer = dgram.createSocket('udp4');

syslogServer.on('error', (err) => {
  console.error(`Syslog server error:\n${err.stack}`);
  syslogServer.close();
});

syslogServer.on('listening', () => {
  const address = syslogServer.address();
  console.log(`[SYSLOG] Listening for UFW/Wazuh/osquery logs on ${address.address}:${address.port}`);
});

syslogServer.on('message', (msg, rinfo) => {
  const logLine = msg.toString('utf8');

  // ENHANCED: Try all parsers via parsers.js (was: only parseUfwLog)
  const logObject = parseSyslog(logLine);
  if (!logObject) return;

  totalLogsIngested++;
  logsInLastMinute++;

  // ── PIPELINE (NEW) ─────────────────────────────────────────────────────

  // Step 1: Enrich with Africa/Zimbabwe threat intel (replaces old enrichWithMisp)
  const enrichedLog = enrichWithAfricaThreatIntel(logObject);

  // Step 2: Check IOC watchlist (NEW)
  const iocHit = checkIocWatchlist(enrichedLog.sourceIp);
  if (iocHit) {
    enrichedLog.iocHit = iocHit;
    broadcast('IOC_HIT', { log: enrichedLog, ioc: iocHit });
  }

  // Step 3: Run correlation rules (NEW — replaces ALERTING_RULES stub)
  const alerts = evaluateRules(logObject, enrichedLog);

  // Step 4: CDPA compliance classification (NEW)
  const cdpaClassification = classifyEvent(logObject, enrichedLog, ORG_SECTOR);
  if (cdpaClassification.cdpaRelevant) {
    enrichedLog.cdpa = cdpaClassification;
    recordComplianceEvent(logObject, cdpaClassification);
    if (cdpaClassification.notificationRequired) {
      broadcast('CDPA_BREACH', { log: enrichedLog, classification: cdpaClassification });
    }
  }

  // Step 5: Broadcast to all connected clients (ORIGINAL, preserved)
  broadcast('NEW_LOG', enrichedLog);

  // Step 6: Broadcast correlation alerts (NEW)
  for (const alert of alerts) {
    broadcast('CORRELATION_ALERT', alert);
  }
});

syslogServer.bind(SYSLOG_PORT);

// ── IOC watchlist check (NEW) ───────────────────────────────────────────────

function checkIocWatchlist(ipAddress) {
  const ioc = db.prepare(
    'SELECT * FROM ioc_watchlist WHERE type = \'ip\' AND value = ? AND active = 1'
  ).get(ipAddress);
  return ioc || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// ORIGINAL CODE — Network Scanning (preserved exactly from your server.js)
// ═══════════════════════════════════════════════════════════════════════════

function getLocalNetworkCidr() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                const subnet = ip.subnet(net.address, '255.255.255.0');
                return subnet.cidrSubnet;
            }
        }
    }
    console.warn("Could not determine local network CIDR automatically. Falling back to 192.168.1.0/24.");
    return '192.168.1.0/24';
}

function performNetworkScan() {
    const cidr = getLocalNetworkCidr();
    const command = `nmap -sV -O ${cidr} -oX - --host-timeout 30s`;
    console.log(`[NMAP] Scanning: ${cidr}`);

    exec(command, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`[NMAP] Scan error: ${error.message}`);
            return;
        }

        xml2js.parseString(stdout, (err, result) => {
            if (err) {
                console.error('[NMAP] XML parse error:', err);
                return;
            }
            const devices = parseNmapResult(result);
            broadcast('NETWORK_UPDATE', devices);
            console.log(`[NMAP] Found ${devices.length} devices`);
        });
    });
}

// ═══════════════════════════════════════════════════════════════════════════
// ORIGINAL CODE — Parsers (preserved from your server.js)
// Note: These are kept for reference. The main parsing is now in parsers.js
// which includes these plus Wazuh, osquery, and generic syslog parsers.
// ═══════════════════════════════════════════════════════════════════════════

// Original parseUfwLog preserved in parsers.js with same regex patterns

// Original enrichWithMisp replaced by africaThreatIntel.js enrichment
// (africaThreatIntel covers 8 known malicious IPs vs original 1)

// ═══════════════════════════════════════════════════════════════════════════
// ORIGINAL CODE — Nmap result parsing (preserved exactly)
// ═══════════════════════════════════════════════════════════════════════════

function getDeviceType(osMatch) {
    if (!osMatch) return 'Workstation';
    const s = osMatch.toLowerCase();
    if (s.includes('linux')) return 'Server';
    if (s.includes('windows server')) return 'Server';
    if (s.includes('ios') || s.includes('android')) return 'Mobile';
    if (s.includes('router') || s.includes('switch')) return 'Network';
    if (s.includes('windows') || s.includes('mac os')) return 'Workstation';
    return 'Workstation';
}

function parseNmapResult(nmapData) {
    if (!nmapData || !nmapData.nmaprun || !nmapData.nmaprun.host) {
        return [];
    }

    const hosts = nmapData.nmaprun.host;

    return hosts.map((host, index) => {
        const status = host.status[0].$.state;
        if (status !== 'up') return null;

        const addresses = host.address.reduce((acc, addr) => {
            acc[addr.$.addrtype] = addr.$.addr;
            return acc;
        }, {});

        const osMatch = host.os?.[0]?.osmatch?.[0]?.$?.name;

        const services = host.ports?.[0]?.port?.map((p, s_idx) => {
            if (p.state[0].$.state !== 'open') return null;
            const service = p.service?.[0]?.$ ?? {};
            const serviceName = service.name || 'Unknown';
            let reason = null;
            if (serviceName === 'http' && p.$.portid !== '443') reason = 'Unencrypted web traffic';
            if (serviceName === 'ftp') reason = 'Unencrypted file transfer';
            if (serviceName === 'telnet') reason = 'Unencrypted remote access';

            return {
                id: `srv-${index}-${s_idx}`,
                name: serviceName,
                port: parseInt(p.$.portid, 10),
                protocol: p.$.protocol.toUpperCase(),
                version: service.product || 'N/A',
                status: 'Running',
                isInsecure: !!reason,
                insecurityReason: reason || undefined
            };
        }).filter(Boolean) ?? [];

        return {
            id: `dev-${index}-${addresses.mac || addresses.ipv4}`,
            ipAddress: addresses.ipv4,
            hostname: host.hostnames?.[0]?.hostname?.[0]?.$?.name || addresses.ipv4,
            macAddress: addresses.mac || 'N/A',
            type: getDeviceType(osMatch),
            status: 'Online',
            os: osMatch || 'Unknown',
            services: services
        };
    }).filter(Boolean);
}

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER (was: wss standalone, now: Express + WS on same port)
// ═══════════════════════════════════════════════════════════════════════════

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════════╗');
  console.log('  ║        CHENGETO CTI Platform — v1.0.0               ║');
  console.log('  ║        by Algol Cyber Security                      ║');
  console.log('  ╠══════════════════════════════════════════════════════╣');
  console.log(`  ║  HTTP API:    http://0.0.0.0:${PORT}                   ║`);
  console.log(`  ║  WebSocket:   ws://0.0.0.0:${PORT}/ws                  ║`);
  console.log(`  ║  Syslog UDP:  0.0.0.0:${SYSLOG_PORT}                       ║`);
  console.log('  ╚══════════════════════════════════════════════════════╝');
  console.log('');
});

module.exports = { app, server, broadcast };
