/**
 * Algol-Insights Demo Runner
 * ─────────────────────────────────────────────────────────────────
 * Sends realistic, staged syslog attack events into the Algol-Insights
 * pipeline over UDP, simulating real cyber incidents against Zimbabwean
 * enterprise targets. Includes an HTTP control server so the presenter
 * can trigger scenarios from the controller UI on any device.
 *
 * Usage:
 *   node demo-runner.js
 *
 * Environment variables (all optional):
 *   SYSLOG_HOST   — IP of your Algol-Insights backend  (default: 127.0.0.1)
 *   SYSLOG_PORT   — UDP syslog port                    (default: 5514)
 *   CONTROL_PORT  — HTTP control server port            (default: 3002)
 *
 * Remote / VPS usage:
 *   SYSLOG_HOST=192.168.1.50 node demo-runner.js
 */

'use strict';

const dgram  = require('dgram');
const http   = require('http');
const fs     = require('fs');
const path   = require('path');

// ── Config ─────────────────────────────────────────────────────────────────
const CFG = {
  syslogHost  : process.env.SYSLOG_HOST  || '127.0.0.1',
  syslogPort  : parseInt(process.env.SYSLOG_PORT  || '1514'),
  controlPort : parseInt(process.env.CONTROL_PORT || '3002'),
};

// ── UDP client ──────────────────────────────────────────────────────────────
const udp = dgram.createSocket('udp4');

/**
 * Send a single RFC-3164 syslog message.
 * @param {string} msg  – raw syslog payload (PRI + header + message)
 */
function sendSyslog(msg) {
  const buf = Buffer.from(msg);
  udp.send(buf, 0, buf.length, CFG.syslogPort, CFG.syslogHost, (err) => {
    if (err) console.error('[UDP ERROR]', err.message);
    else      console.log('[→ SYSLOG]', msg.substring(0, 120));
  });
}

/**
 * Build an RFC-3164 syslog string.
 * @param {object} opts
 * @param {number} opts.pri       – syslog PRI value (e.g. 36 = security warning)
 * @param {string} opts.hostname  – source hostname
 * @param {string} opts.program   – program name (e.g. sshd, kernel, nginx)
 * @param {number} opts.pid       – process ID
 * @param {string} opts.message   – log message body
 */
function syslog({ pri = 36, hostname, program, pid, message }) {
  const now  = new Date();
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];
  const mon  = MONTHS[now.getMonth()];
  const day  = String(now.getDate()).padStart(2, ' ');
  const time = now.toTimeString().substring(0, 8);
  return `<${pri}>${mon} ${day} ${time} ${hostname} ${program}[${pid}]: ${message}`;
}

/** Sleep for ms milliseconds. */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ── Global state ────────────────────────────────────────────────────────────
let running        = false;   // is a scenario currently playing?
let currentScenario = null;   // name of running scenario
let abortController = null;   // AbortController for cancellation
const eventLog     = [];      // rolling log of last 50 events sent

function logEvent(scenario, label, severity) {
  eventLog.unshift({ t: new Date().toISOString(), scenario, label, severity });
  if (eventLog.length > 50) eventLog.pop();
}

// ═══════════════════════════════════════════════════════════════════════════
//  SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Scenario 1 — "Operation Bank Strike"
 * A sophisticated multi-stage attack targeting a Zimbabwean commercial bank.
 * Demonstrates: port scan → SSH brute-force → breach → exfiltration → C2 → block.
 */
async function scenarioBankStrike(signal) {
  const ATTACKER_IP  = '185.220.101.45';   // Known Tor exit / attack node
  const C2_IP        = '45.155.205.233';   // Known C2 server (public threat intel)
  const TARGET_HOST  = 'cbz-fw-prod-01';   // Zimbabwean bank firewall
  const INTERNAL_SRV = 'cbz-core-db-02';   // Internal database server

  console.log('\n[DEMO] ▶ Scenario 1: Operation Bank Strike\n');

  // ── Phase 1: Reconnaissance (port scan) ───────────────────────────────
  logEvent('bank-strike', 'Port scan detected', 'medium');
  sendSyslog(syslog({
    pri: 36, hostname: TARGET_HOST, program: 'kernel', pid: 1,
    message: `[UFW BLOCK] IN=eth0 OUT= SRC=${ATTACKER_IP} DST=41.78.96.10 LEN=44 PROTO=TCP DPT=22 FLAGS=S`
  }));
  await sleep(1800); if (signal.aborted) return;

  sendSyslog(syslog({
    pri: 36, hostname: TARGET_HOST, program: 'kernel', pid: 1,
    message: `[UFW BLOCK] IN=eth0 OUT= SRC=${ATTACKER_IP} DST=41.78.96.10 LEN=44 PROTO=TCP DPT=3389 FLAGS=S`
  }));
  await sleep(1200); if (signal.aborted) return;

  sendSyslog(syslog({
    pri: 36, hostname: TARGET_HOST, program: 'kernel', pid: 1,
    message: `[UFW BLOCK] IN=eth0 OUT= SRC=${ATTACKER_IP} DST=41.78.96.10 LEN=44 PROTO=TCP DPT=5432 FLAGS=S`
  }));
  await sleep(2000); if (signal.aborted) return;

  // ── Phase 2: SSH Brute-Force ───────────────────────────────────────────
  logEvent('bank-strike', 'SSH brute-force', 'high');
  for (let i = 0; i < 6; i++) {
    sendSyslog(syslog({
      pri: 34, hostname: TARGET_HOST, program: 'sshd', pid: 2847 + i,
      message: `Failed password for invalid user fadmin from ${ATTACKER_IP} port ${51000+i} ssh2`
    }));
    await sleep(600 + Math.random() * 400); if (signal.aborted) return;
  }
  await sleep(1500); if (signal.aborted) return;

  // ── Phase 3: Successful Breach ────────────────────────────────────────
  logEvent('bank-strike', 'Unauthorized access — BREACH', 'critical');
  sendSyslog(syslog({
    pri: 34, hostname: TARGET_HOST, program: 'sshd', pid: 2861,
    message: `Accepted password for sysbackup from ${ATTACKER_IP} port 51890 ssh2`
  }));
  await sleep(800); if (signal.aborted) return;

  sendSyslog(syslog({
    pri: 34, hostname: TARGET_HOST, program: 'sudo', pid: 2862,
    message: `sysbackup : COMMAND=/usr/bin/find / -name "*.sql" -o -name "*.mdb" ; TTY=pts/0 ; PWD=/home/sysbackup`
  }));
  await sleep(1000); if (signal.aborted) return;

  // ── Phase 4: Lateral Movement ─────────────────────────────────────────
  logEvent('bank-strike', 'Lateral movement to DB server', 'critical');
  sendSyslog(syslog({
    pri: 34, hostname: INTERNAL_SRV, program: 'sshd', pid: 1044,
    message: `Accepted publickey for postgres from 41.78.96.10 port 52001 ssh2`
  }));
  await sleep(1200); if (signal.aborted) return;

  sendSyslog(syslog({
    pri: 34, hostname: INTERNAL_SRV, program: 'postgres', pid: 1051,
    message: `LOG: statement: SELECT * FROM customer_accounts WHERE balance > 10000; -- 47,832 rows returned`
  }));
  await sleep(2000); if (signal.aborted) return;

  // ── Phase 5: Data Exfiltration ────────────────────────────────────────
  logEvent('bank-strike', 'Data exfiltration — 2.3 GB outbound', 'critical');
  sendSyslog(syslog({
    pri: 34, hostname: TARGET_HOST, program: 'kernel', pid: 1,
    message: `[UFW ALLOW] IN= OUT=eth0 SRC=41.78.96.10 DST=${ATTACKER_IP} LEN=65535 PROTO=TCP DPT=443 BYTES=2457862144`
  }));
  await sleep(1500); if (signal.aborted) return;

  // ── Phase 6: C2 Beacon ────────────────────────────────────────────────
  logEvent('bank-strike', 'C2 beacon — known malware server', 'critical');
  sendSyslog(syslog({
    pri: 34, hostname: TARGET_HOST, program: 'kernel', pid: 1,
    message: `[UFW ALLOW] IN= OUT=eth0 SRC=41.78.96.10 DST=${C2_IP} LEN=128 PROTO=TCP DPT=8443 FLAGS=PA`
  }));
  await sleep(800); if (signal.aborted) return;

  sendSyslog(syslog({
    pri: 34, hostname: TARGET_HOST, program: 'kernel', pid: 1,
    message: `[UFW ALLOW] IN= OUT=eth0 SRC=41.78.96.10 DST=${C2_IP} LEN=128 PROTO=TCP DPT=8443 FLAGS=PA`
  }));
  await sleep(600); if (signal.aborted) return;

  sendSyslog(syslog({
    pri: 34, hostname: TARGET_HOST, program: 'kernel', pid: 1,
    message: `[UFW ALLOW] IN= OUT=eth0 SRC=41.78.96.10 DST=${C2_IP} LEN=128 PROTO=TCP DPT=8443 FLAGS=PA`
  }));
  await sleep(2500); if (signal.aborted) return;

  // ── Phase 7: Algol-Insights Response ──────────────────────────────────
  logEvent('bank-strike', 'Algol-Insights: auto-block issued', 'resolved');
  sendSyslog(syslog({
    pri: 36, hostname: TARGET_HOST, program: 'algol-soar', pid: 9001,
    message: `[ALGOL-ACTION] BLOCK_ISSUED src=${ATTACKER_IP} severity=CRITICAL confidence=0.97 tactic=TA0011:Command-and-Control approved_by=auto-policy audit_id=AUD-20240315-0042`
  }));

  console.log('\n[DEMO] ✓ Scenario 1 complete.\n');
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scenario 2 — "Ministry Portal Breach"
 * Web application attack against a Zimbabwean government ministry portal.
 * Demonstrates: SQLi → auth bypass → sensitive document access → insider escalation.
 */
async function scenarioMinistryBreach(signal) {
  const ATTACKER_IP = '194.165.16.11';   // Known APT-linked scanner
  const WEB_HOST    = 'moe-webprod-01';  // Ministry of Finance web server
  const APP_HOST    = 'moe-appserver-01';

  console.log('\n[DEMO] ▶ Scenario 2: Ministry Portal Breach\n');

  // ── Phase 1: Web Reconnaissance ───────────────────────────────────────
  logEvent('ministry-breach', 'Web enumeration / scanning', 'medium');
  const paths = ['/admin', '/wp-admin', '/.env', '/config.php', '/backup.sql', '/api/v1/users'];
  for (const p of paths) {
    sendSyslog(syslog({
      pri: 36, hostname: WEB_HOST, program: 'nginx', pid: 1122,
      message: `${ATTACKER_IP} - - "GET ${p} HTTP/1.1" 404 162 "-" "Mozilla/5.0 (compatible; zgrab/0.x)"`
    }));
    await sleep(400 + Math.random() * 300); if (signal.aborted) return;
  }
  await sleep(1500); if (signal.aborted) return;

  // ── Phase 2: SQL Injection Attempts ───────────────────────────────────
  logEvent('ministry-breach', 'SQL injection attempts', 'high');
  sendSyslog(syslog({
    pri: 34, hostname: WEB_HOST, program: 'nginx', pid: 1122,
    message: `${ATTACKER_IP} - - "GET /portal/login?user=admin'+OR+'1'='1'--&pass=x HTTP/1.1" 200 4821`
  }));
  await sleep(900); if (signal.aborted) return;

  sendSyslog(syslog({
    pri: 34, hostname: APP_HOST, program: 'app', pid: 3310,
    message: `[SECURITY] SQL injection pattern detected in request from ${ATTACKER_IP}: param=user val="admin' OR '1'='1'--"`
  }));
  await sleep(1200); if (signal.aborted) return;

  // ── Phase 3: Authentication Bypass ────────────────────────────────────
  logEvent('ministry-breach', 'Authentication bypass — BREACH', 'critical');
  sendSyslog(syslog({
    pri: 34, hostname: APP_HOST, program: 'app', pid: 3310,
    message: `[AUTH] Login SUCCESS user=administrator src=${ATTACKER_IP} method=sql_bypass session=sess_7f3a9c2b1e`
  }));
  await sleep(1000); if (signal.aborted) return;

  // ── Phase 4: Sensitive Document Access ────────────────────────────────
  logEvent('ministry-breach', 'Sensitive documents accessed', 'critical');
  const docs = [
    '/documents/budget_2025_draft_classified.xlsx',
    '/documents/staff_salaries_all_grades_2024.pdf',
    '/documents/national_debt_restructuring_confidential.docx',
  ];
  for (const doc of docs) {
    sendSyslog(syslog({
      pri: 34, hostname: WEB_HOST, program: 'nginx', pid: 1122,
      message: `${ATTACKER_IP} - administrator "GET ${doc} HTTP/1.1" 200 1048576 "-" "python-requests/2.28"`
    }));
    await sleep(700); if (signal.aborted) return;
  }
  await sleep(2000); if (signal.aborted) return;

  // ── Phase 5: Privilege Escalation Attempt ─────────────────────────────
  logEvent('ministry-breach', 'Privilege escalation attempt', 'critical');
  sendSyslog(syslog({
    pri: 34, hostname: APP_HOST, program: 'sudo', pid: 3318,
    message: `www-data : command not allowed ; TTY=pts/1 ; PWD=/var/www ; USER=root ; COMMAND=/bin/bash`
  }));
  await sleep(1500); if (signal.aborted) return;

  // ── Phase 6: Algol-Insights Response ──────────────────────────────────
  logEvent('ministry-breach', 'Algol-Insights: IP blocked + incident raised', 'resolved');
  sendSyslog(syslog({
    pri: 36, hostname: WEB_HOST, program: 'algol-soar', pid: 9001,
    message: `[ALGOL-ACTION] BLOCK_ISSUED src=${ATTACKER_IP} severity=CRITICAL confidence=0.96 tactic=TA0001:Initial-Access,TA0006:Credential-Access incident_id=INC-2024-0089 analyst_review=PENDING`
  }));

  console.log('\n[DEMO] ✓ Scenario 2 complete.\n');
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scenario 3 — "Telecom Infrastructure Probe"
 * Nation-state level reconnaissance against Zimbabwean telecom infrastructure.
 * Demonstrates: ICMP sweep → VoIP scan → BGP manipulation → DNS exfiltration.
 */
async function scenarioTelecomProbe(signal) {
  const ATTACKER_1  = '91.92.109.44';    // Known nation-state linked IP
  const ATTACKER_2  = '89.248.167.131';  // Shodan scanner / secondary actor
  const CORE_ROUTER = 'netone-core-r01'; // Core telecom router
  const BGP_PEER    = 'netone-bgp-peer'; // BGP peer
  const DNS_SERVER  = 'netone-dns-prod'; // Internal DNS

  console.log('\n[DEMO] ▶ Scenario 3: Telecom Infrastructure Probe\n');

  // ── Phase 1: ICMP Network Sweep ───────────────────────────────────────
  logEvent('telecom-probe', 'ICMP network sweep', 'medium');
  for (let i = 1; i <= 8; i++) {
    sendSyslog(syslog({
      pri: 36, hostname: CORE_ROUTER, program: 'kernel', pid: 1,
      message: `[UFW BLOCK] IN=eth0 SRC=${ATTACKER_1} DST=41.57.${i}.1 PROTO=ICMP TYPE=8 CODE=0`
    }));
    await sleep(300); if (signal.aborted) return;
  }
  await sleep(1500); if (signal.aborted) return;

  // ── Phase 2: VoIP Infrastructure Scan ────────────────────────────────
  logEvent('telecom-probe', 'VoIP infrastructure scan (SIP)', 'high');
  sendSyslog(syslog({
    pri: 34, hostname: CORE_ROUTER, program: 'kernel', pid: 1,
    message: `[UFW BLOCK] IN=eth0 SRC=${ATTACKER_1} DST=41.57.10.5 PROTO=UDP DPT=5060 LEN=512`
  }));
  await sleep(800); if (signal.aborted) return;

  sendSyslog(syslog({
    pri: 34, hostname: CORE_ROUTER, program: 'kernel', pid: 1,
    message: `[UFW BLOCK] IN=eth0 SRC=${ATTACKER_1} DST=41.57.10.5 PROTO=UDP DPT=5061 LEN=512`
  }));
  await sleep(800); if (signal.aborted) return;

  sendSyslog(syslog({
    pri: 34, hostname: CORE_ROUTER, program: 'asterisk', pid: 4421,
    message: `NOTICE[4421] chan_sip.c: Registration from '"anonymous" <sip:${ATTACKER_1}>' failed for '${ATTACKER_1}:5060' - No matching peer found`
  }));
  await sleep(2000); if (signal.aborted) return;

  // ── Phase 3: BGP Manipulation Attempt ────────────────────────────────
  logEvent('telecom-probe', 'BGP route manipulation attempt', 'critical');
  sendSyslog(syslog({
    pri: 34, hostname: BGP_PEER, program: 'bgpd', pid: 2201,
    message: `%BGP-3-NOTIFICATION: received from neighbor ${ATTACKER_2} OPEN Error/Unsupported Version Number, data FFFF...`
  }));
  await sleep(1000); if (signal.aborted) return;

  sendSyslog(syslog({
    pri: 34, hostname: BGP_PEER, program: 'bgpd', pid: 2201,
    message: `%BGP-5-ADJCHANGE: neighbor ${ATTACKER_2} Down Peer closed the session -- unauthorized AS path injection attempt detected`
  }));
  await sleep(2000); if (signal.aborted) return;

  // ── Phase 4: DNS Exfiltration via Tunneling ───────────────────────────
  logEvent('telecom-probe', 'DNS tunneling / exfiltration', 'critical');
  const dnsQueries = [
    'dGhpcyBpcyBleGZpbHRyYXRlZC1kYXRh.attacker-c2.ru',
    'aGlnaGx5LWNvbmZpZGVudGlhbC1kb2M=.attacker-c2.ru',
    'bmV0d29yay10b3BvbG9neS1tYXA=.attacker-c2.ru',
  ];
  for (const q of dnsQueries) {
    sendSyslog(syslog({
      pri: 34, hostname: DNS_SERVER, program: 'named', pid: 1821,
      message: `client ${ATTACKER_2}#45821: query: ${q} IN TXT + (41.57.1.1)`
    }));
    await sleep(600); if (signal.aborted) return;
  }
  await sleep(2000); if (signal.aborted) return;

  // ── Phase 5: Algol-Insights Response ──────────────────────────────────
  logEvent('telecom-probe', 'Algol-Insights: nation-state APT alert raised', 'resolved');
  sendSyslog(syslog({
    pri: 34, hostname: CORE_ROUTER, program: 'algol-soar', pid: 9001,
    message: `[ALGOL-ACTION] BLOCK_ISSUED src=${ATTACKER_1} severity=CRITICAL confidence=0.94 tactic=TA0043:Reconnaissance,TA0011:Command-and-Control threat_actor=SUSPECTED_APT incident_id=INC-2024-0091 notify=CERT_ZW`
  }));
  await sleep(800); if (signal.aborted) return;

  sendSyslog(syslog({
    pri: 34, hostname: DNS_SERVER, program: 'algol-soar', pid: 9001,
    message: `[ALGOL-ACTION] BLOCK_ISSUED src=${ATTACKER_2} severity=CRITICAL confidence=0.95 tactic=TA0010:Exfiltration method=DNS_TUNNEL incident_id=INC-2024-0091`
  }));

  console.log('\n[DEMO] ✓ Scenario 3 complete.\n');
}

// ═══════════════════════════════════════════════════════════════════════════
//  SCENARIO REGISTRY
// ═══════════════════════════════════════════════════════════════════════════

const SCENARIOS = {
  'bank-strike'     : { fn: scenarioBankStrike,    name: 'Operation Bank Strike',       duration: 45 },
  'ministry-breach' : { fn: scenarioMinistryBreach, name: 'Ministry Portal Breach',     duration: 35 },
  'telecom-probe'   : { fn: scenarioTelecomProbe,   name: 'Telecom Infrastructure Probe', duration: 40 },
};

async function runScenario(id) {
  if (running) return { ok: false, error: 'A scenario is already running. Stop it first.' };
  const s = SCENARIOS[id];
  if (!s) return { ok: false, error: `Unknown scenario: ${id}` };

  running         = true;
  currentScenario = id;
  abortController = new AbortController();

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ALGOL-INSIGHTS DEMO — ${s.name}`);
  console.log(`  Target: ${CFG.syslogHost}:${CFG.syslogPort}`);
  console.log(`${'═'.repeat(60)}\n`);

  try {
    await s.fn(abortController.signal);
  } catch (err) {
    console.error('[ERROR]', err.message);
  } finally {
    running         = false;
    currentScenario = null;
    abortController = null;
  }

  return { ok: true };
}

function stopScenario() {
  if (!running || !abortController) return { ok: false, error: 'No scenario running.' };
  abortController.abort();
  running         = false;
  currentScenario = null;
  abortController = null;
  console.log('\n[DEMO] ⏹  Scenario stopped by user.\n');
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════
//  HTTP CONTROL SERVER
// ═══════════════════════════════════════════════════════════════════════════

const server = http.createServer((req, res) => {
  // CORS — allow controller to be opened from any origin / device
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  // Serve the controller HTML
  if (req.method === 'GET' && req.url === '/') {
    const html = fs.readFileSync(path.join(__dirname, 'controller.html'), 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.writeHead(200);
    res.end(html);
    return;
  }

  // Status endpoint
  if (req.method === 'GET' && req.url === '/status') {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({
      running,
      currentScenario,
      syslogTarget : `${CFG.syslogHost}:${CFG.syslogPort}`,
      recentEvents : eventLog.slice(0, 10),
      scenarios    : Object.entries(SCENARIOS).map(([id, s]) => ({
        id, name: s.name, duration: s.duration
      })),
    }));
    return;
  }

  // Start scenario
  if (req.method === 'POST' && req.url.startsWith('/run/')) {
    const id = req.url.replace('/run/', '');
    const result = runScenario(id);   // fire-and-forget (async)
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, started: id }));
    return;
  }

  // Stop scenario
  if (req.method === 'POST' && req.url === '/stop') {
    const result = stopScenario();
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    res.end(JSON.stringify(result));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

// ═══════════════════════════════════════════════════════════════════════════
//  STARTUP
// ═══════════════════════════════════════════════════════════════════════════

server.listen(CFG.controlPort, () => {
  console.log('\n' + '═'.repeat(60));
  console.log('  ALGOL-INSIGHTS DEMO RUNNER  ·  Ready');
  console.log('═'.repeat(60));
  console.log(`  Syslog target   → udp://${CFG.syslogHost}:${CFG.syslogPort}`);
  console.log(`  Controller UI   → http://localhost:${CFG.controlPort}`);
  console.log('─'.repeat(60));
  console.log('  Scenarios available:');
  Object.entries(SCENARIOS).forEach(([id, s]) => {
    console.log(`    • ${id.padEnd(20)} ${s.name}`);
  });
  console.log('═'.repeat(60) + '\n');
  console.log('  Open the Controller UI in your browser to run scenarios.\n');
});

process.on('SIGINT', () => {
  console.log('\n[DEMO] Shutting down...');
  stopScenario();
  udp.close();
  server.close();
  process.exit(0);
});
