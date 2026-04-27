'use strict';

const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'chengeto.db');

// Ensure data directory exists
const fs = require('fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH, { verbose: process.env.NODE_ENV === 'development' ? console.log : null });

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema migration ────────────────────────────────────────────────────────

function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer' CHECK(role IN ('admin','analyst','viewer')),
      display_name TEXT,
      mfa_secret TEXT,
      mfa_enabled INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      actor_id TEXT,
      actor_username TEXT,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      severity TEXT NOT NULL DEFAULT 'Medium' CHECK(severity IN ('Critical','High','Medium','Low','Informational')),
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','triaged','contained','resolved','closed')),
      assignee_id TEXT,
      source_alert_id TEXT,
      source_correlation_rule TEXT,
      cdpa_relevant INTEGER DEFAULT 0,
      cdpa_section TEXT,
      cdpa_deadline TEXT,
      tags TEXT DEFAULT '[]',
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT,
      closed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS incident_timeline (
      id TEXT PRIMARY KEY,
      incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      actor_id TEXT,
      actor_username TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dfir_cases (
      id TEXT PRIMARY KEY,
      incident_id TEXT REFERENCES incidents(id),
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','analysis','reporting','closed')),
      lead_analyst_id TEXT,
      summary TEXT,
      findings TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS dfir_evidence (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL REFERENCES dfir_cases(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      description TEXT,
      hash_sha256 TEXT,
      chain_of_custody TEXT DEFAULT '[]',
      collected_by TEXT,
      collected_at TEXT DEFAULT (datetime('now')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ioc_watchlist (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('ip','domain','hash','url','email')),
      value TEXT NOT NULL,
      threat_type TEXT,
      confidence REAL DEFAULT 0.5,
      source TEXT,
      tags TEXT DEFAULT '[]',
      active INTEGER DEFAULT 1,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_ioc_type_value ON ioc_watchlist(type, value);

    CREATE TABLE IF NOT EXISTS compliance_events (
      id TEXT PRIMARY KEY,
      event_id TEXT,
      source_ip TEXT,
      destination_ip TEXT,
      event_type TEXT NOT NULL,
      cdpa_section TEXT,
      cdpa_classification TEXT CHECK(cdpa_classification IN ('personal_data_breach','infrastructure_incident','reportable_event','informational')),
      severity TEXT,
      notification_required INTEGER DEFAULT 0,
      notification_deadline TEXT,
      notification_sent INTEGER DEFAULT 0,
      notification_sent_at TEXT,
      details TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS threat_feeds (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      url TEXT,
      enabled INTEGER DEFAULT 1,
      last_sync TEXT,
      ioc_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'idle',
      error TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS playbooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      trigger_type TEXT,
      trigger_severity TEXT,
      actions TEXT NOT NULL DEFAULT '[]',
      enabled INTEGER DEFAULT 1,
      execution_count INTEGER DEFAULT 0,
      last_executed TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS playbook_executions (
      id TEXT PRIMARY KEY,
      playbook_id TEXT NOT NULL REFERENCES playbooks(id),
      trigger_event_id TEXT,
      status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running','completed','failed','partial')),
      results TEXT DEFAULT '[]',
      duration_ms INTEGER,
      executed_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS correlation_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      condition_type TEXT NOT NULL,
      threshold INTEGER DEFAULT 5,
      window_seconds INTEGER DEFAULT 60,
      severity TEXT DEFAULT 'High',
      enabled INTEGER DEFAULT 1,
      match_count INTEGER DEFAULT 0,
      last_match TEXT,
      auto_respond INTEGER DEFAULT 0,
      respond_action TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      ip_address TEXT,
      hostname TEXT,
      mac_address TEXT,
      device_type TEXT,
      os TEXT,
      owner TEXT,
      department TEXT,
      criticality TEXT DEFAULT 'medium' CHECK(criticality IN ('critical','high','medium','low')),
      risk_score REAL DEFAULT 0,
      last_seen TEXT,
      services TEXT DEFAULT '[]',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

// ── Seed default data ────────────────────────────────────────────────────────

function seed() {
  const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!adminExists) {
    const adminPassword = process.env.ADMIN_PASSWORD || 'Chengeto@2026!';
    const analystPassword = process.env.ANALYST_PASSWORD || 'Analyst@2026!';
    const viewerPassword = process.env.VIEWER_PASSWORD || 'Viewer@2026!';

    const insertUser = db.prepare(`
      INSERT INTO users (id, username, password_hash, role, display_name) VALUES (?, ?, ?, ?, ?)
    `);

    const seedUsers = db.transaction(() => {
      insertUser.run(uuidv4(), 'admin', bcrypt.hashSync(adminPassword, 12), 'admin', 'System Administrator');
      insertUser.run(uuidv4(), 'analyst', bcrypt.hashSync(analystPassword, 12), 'analyst', 'SOC Analyst');
      insertUser.run(uuidv4(), 'viewer', bcrypt.hashSync(viewerPassword, 12), 'viewer', 'Dashboard Viewer');
    });
    seedUsers();
    console.log('[DB] Default users seeded (admin/analyst/viewer)');
  }

  // Seed default correlation rules
  const rulesExist = db.prepare('SELECT id FROM correlation_rules LIMIT 1').get();
  if (!rulesExist) {
    const insertRule = db.prepare(`
      INSERT INTO correlation_rules (id, name, description, condition_type, threshold, window_seconds, severity, enabled, auto_respond, respond_action)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `);
    const seedRules = db.transaction(() => {
      insertRule.run('rule-001', 'Port scan detection', 'Multiple destination ports from same source in short window', 'port_scan', 10, 10, 'High', 1, 'block_ip');
      insertRule.run('rule-002', 'SSH brute force', 'Repeated SSH connection attempts from same source', 'brute_force_ssh', 5, 60, 'High', 1, 'block_ip');
      insertRule.run('rule-003', 'RDP brute force', 'Repeated RDP connection attempts from same source', 'brute_force_rdp', 5, 60, 'High', 1, 'block_ip');
      insertRule.run('rule-004', 'Known malicious IP', 'Connection from threat-intelligence-flagged IP', 'known_malicious', 1, 1, 'Critical', 1, 'block_ip');
      insertRule.run('rule-005', 'TOR exit node', 'Traffic involving known TOR network infrastructure', 'tor_exit', 1, 1, 'Medium', 0, null);
      insertRule.run('rule-006', 'DNS abuse', 'High volume of blocked DNS queries from single source', 'dns_abuse', 20, 30, 'Medium', 0, null);
      insertRule.run('rule-007', 'C2 beacon pattern', 'Regular interval callbacks to suspicious destination', 'c2_beacon', 3, 300, 'Critical', 1, 'block_ip');
      insertRule.run('rule-008', 'Data exfiltration suspect', 'Large outbound transfer to external IP on unusual port', 'data_exfil', 1, 1, 'Critical', 0, null);
    });
    seedRules();
    console.log('[DB] Default correlation rules seeded');
  }

  // Seed default threat feeds
  const feedsExist = db.prepare('SELECT id FROM threat_feeds LIMIT 1').get();
  if (!feedsExist) {
    const insertFeed = db.prepare(`
      INSERT INTO threat_feeds (id, name, type, url, enabled) VALUES (?, ?, ?, ?, ?)
    `);
    const seedFeeds = db.transaction(() => {
      insertFeed.run(uuidv4(), 'ThreatFox IOCs', 'threatfox', 'https://threatfox-api.abuse.ch/api/v1/', 1);
      insertFeed.run(uuidv4(), 'AbuseIPDB', 'abuseipdb', 'https://api.abuseipdb.com/api/v2/', 1);
      insertFeed.run(uuidv4(), 'URLhaus', 'urlhaus', 'https://urlhaus-api.abuse.ch/v1/', 1);
      insertFeed.run(uuidv4(), 'Feodo Tracker', 'feodo', 'https://feodotracker.abuse.ch/downloads/ipblocklist.json', 1);
      insertFeed.run(uuidv4(), 'Emerging Threats', 'emerging_threats', 'https://rules.emergingthreats.net/blockrules/compromised-ips.txt', 1);
    });
    seedFeeds();
    console.log('[DB] Default threat feeds seeded');
  }

  // Seed default playbooks
  const playbooksExist = db.prepare('SELECT id FROM playbooks LIMIT 1').get();
  if (!playbooksExist) {
    const insertPlaybook = db.prepare(`
      INSERT INTO playbooks (id, name, description, trigger_type, trigger_severity, actions, enabled, created_by)
      VALUES (?, ?, ?, ?, ?, ?, 1, 'system')
    `);
    const seedPlaybooks = db.transaction(() => {
      insertPlaybook.run('pb-001', 'Critical threat auto-response', 'Automatically block IP and create incident for critical correlation hits',
        'correlation_alert', 'Critical',
        JSON.stringify([
          { order: 1, type: 'block_ip', params: { method: 'ufw' } },
          { order: 2, type: 'create_incident', params: { severity: 'Critical' } },
          { order: 3, type: 'send_alert', params: { channel: 'whatsapp' } }
        ])
      );
      insertPlaybook.run('pb-002', 'IOC hit response', 'Enrich and alert on IOC watchlist matches',
        'ioc_hit', 'High',
        JSON.stringify([
          { order: 1, type: 'enrich_ioc', params: {} },
          { order: 2, type: 'create_incident', params: { severity: 'High' } },
          { order: 3, type: 'send_alert', params: { channel: 'dashboard' } }
        ])
      );
      insertPlaybook.run('pb-003', 'CDPA breach workflow', 'Full CDPA compliance workflow for personal data breaches',
        'cdpa_breach', 'Critical',
        JSON.stringify([
          { order: 1, type: 'create_incident', params: { severity: 'Critical', cdpa: true } },
          { order: 2, type: 'send_alert', params: { channel: 'whatsapp' } },
          { order: 3, type: 'send_alert', params: { channel: 'email' } },
          { order: 4, type: 'block_ip', params: { method: 'ufw' } }
        ])
      );
    });
    seedPlaybooks();
    console.log('[DB] Default playbooks seeded');
  }
}

// ── Initialize ───────────────────────────────────────────────────────────────

migrate();
seed();
console.log(`[DB] SQLite database initialized at ${DB_PATH}`);

module.exports = db;
