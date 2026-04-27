/**
 * africaThreatIntel.js
 * ─────────────────────────────────────────────────────────────
 * Regional threat intelligence for Zimbabwe and the SADC region.
 * 
 * In a production deployment this would query live sources:
 *   - CERT.ZW feeds
 *   - AfricaCERT shared intelligence
 *   - MISP instance with African IOC sets
 *   - AfriNIC abuse contact lookups
 * 
 * For now this module provides:
 *   1. Known malicious IP enrichment (with African context)
 *   2. Port-based threat pattern matching
 *   3. Zimbabwe critical infrastructure target detection
 */

'use strict';

// ── Known malicious indicators with African/Zimbabwe context ────────────────
const KNOWN_MALICIOUS_IPS = {
  // Demo scenario IPs (from demo-runner) — enriched for presentation
  '185.220.101.45': {
    threat: 'Tor Exit Node — SSH Scanning',
    confidence: 0.91,
    actor: 'Unknown — commodity scanner',
    tags: ['tor', 'ssh-brute', 'osint'],
    firstSeenAfrica: '2023-08-15',
    campaigns: ['SSH Mass Scanning Campaign Q3 2023'],
    certZwAdvisory: null,
  },
  '194.165.16.11': {
    threat: 'APT-linked Web Application Scanner',
    confidence: 0.87,
    actor: 'Suspected APT — Eastern Europe',
    tags: ['apt', 'web-scan', 'sql-injection'],
    firstSeenAfrica: '2024-01-10',
    campaigns: ['Government Portal Targeting Campaign — East Africa 2024'],
    certZwAdvisory: 'CERT-ZW-2024-003',
  },
  '91.92.109.44': {
    threat: 'APT Proxy — Infrastructure Reconnaissance',
    confidence: 0.83,
    actor: 'Suspected nation-state proxy',
    tags: ['apt', 'recon', 'infrastructure'],
    firstSeenAfrica: '2024-02-01',
    campaigns: ['Telecom Infrastructure Probe — SADC Region 2024'],
    certZwAdvisory: 'CERT-ZW-2024-007',
  },
  '89.248.167.131': {
    threat: 'Shodan/Censys Mass Scanner',
    confidence: 0.75,
    actor: 'Automated scanner (Shodan)',
    tags: ['scanner', 'osint', 'reconnaissance'],
    firstSeenAfrica: '2022-03-01',
    campaigns: [],
    certZwAdvisory: null,
  },
  '45.155.205.233': {
    threat: 'Known C2 Server — Banking Trojan Infrastructure',
    confidence: 0.96,
    actor: 'FIN-affiliated group',
    tags: ['c2', 'banking-trojan', 'financial-crime'],
    firstSeenAfrica: '2023-11-20',
    campaigns: ['SADC Banking Sector Campaign 2023-2024'],
    certZwAdvisory: 'CERT-ZW-2023-019',
  },
  // Legacy demo IP
  '198.51.100.89': {
    threat: 'SQL Injection Campaign',
    confidence: 0.88,
    actor: 'APT-C-35 (associated)',
    tags: ['sql-injection', 'web-exploit', 'osint'],
    firstSeenAfrica: '2023-10-01',
    campaigns: ['SQL Injection Campaign Targeting Web Servers'],
    certZwAdvisory: null,
  },
};

// ── Zimbabwe critical infrastructure IP ranges ──────────────────────────────
// If the DESTINATION IP falls in these ranges, escalate severity
const ZW_CRITICAL_INFRA_RANGES = [
  { prefix: '41.78.96', org: 'Harare ISP Block',         sector: 'Telecommunications' },
  { prefix: '41.57',    org: 'NetOne / Econet ZW',       sector: 'Telecommunications' },
  { prefix: '196.13',   org: 'TelOne Zimbabwe',          sector: 'Telecommunications' },
  { prefix: '196.43',   org: 'ZOL Zimbabwe',             sector: 'Telecommunications' },
  { prefix: '196.37',   org: 'Reserve Bank of Zimbabwe', sector: 'Financial' },
  { prefix: '196.27',   org: 'ZIMRA Revenue Authority',  sector: 'Government' },
];

// ── High-risk port patterns with regional context ───────────────────────────
const HIGH_RISK_PORTS = {
  22:    { name: 'SSH',            risk: 'Brute-force / unauthorized access',   cdpa: true  },
  3389:  { name: 'RDP',            risk: 'Remote desktop exploitation',          cdpa: true  },
  5900:  { name: 'VNC',            risk: 'Unencrypted remote desktop',           cdpa: true  },
  23:    { name: 'Telnet',         risk: 'Unencrypted session hijacking',        cdpa: false },
  21:    { name: 'FTP',            risk: 'Credential theft / data exfiltration', cdpa: true  },
  445:   { name: 'SMB',            risk: 'Ransomware / lateral movement (WannaCry)', cdpa: true },
  1433:  { name: 'MSSQL',          risk: 'Database exfiltration',               cdpa: true  },
  3306:  { name: 'MySQL',          risk: 'Database exfiltration',               cdpa: true  },
  5432:  { name: 'PostgreSQL',     risk: 'Database exfiltration',               cdpa: true  },
  6379:  { name: 'Redis',          risk: 'Unauthenticated cache access',        cdpa: true  },
  27017: { name: 'MongoDB',        risk: 'Unauthenticated database access',     cdpa: true  },
  53:    { name: 'DNS',            risk: 'DNS tunneling / exfiltration',        cdpa: true  },
  8443:  { name: 'HTTPS-alt',      risk: 'C2 communication on non-standard port', cdpa: false },
  4444:  { name: 'Metasploit-C2',  risk: 'Known Metasploit default C2 port',   cdpa: false },
  31337: { name: 'Back Orifice',   risk: 'Legacy RAT communication',           cdpa: false },
};

/**
 * Enrich a parsed log object with Africa/Zimbabwe threat intelligence.
 * @param {object} logObject - Parsed log from parseUfwLog()
 * @returns {object} Enriched log object
 */
function enrichWithAfricaThreatIntel(logObject) {
  const enriched = { ...logObject };

  // 1. Check source IP against known malicious indicators
  const ipIntel = KNOWN_MALICIOUS_IPS[logObject.sourceIp];
  if (ipIntel) {
    enriched.mispContext = {
      source: 'Algol-Africa-TI',
      threat: ipIntel.threat,
      confidence: ipIntel.confidence,
      actor: ipIntel.actor,
      tags: ipIntel.tags,
      firstSeenAfrica: ipIntel.firstSeenAfrica,
      campaigns: ipIntel.campaigns,
      certZwAdvisory: ipIntel.certZwAdvisory,
      enrichedAt: new Date().toISOString(),
    };
    console.log(`[Africa-TI] Enriched ${logObject.sourceIp}: ${ipIntel.threat} (confidence: ${ipIntel.confidence})`);
  }

  // 2. Check if destination is Zimbabwe critical infrastructure
  const dstIp = logObject.destinationIp || '';
  for (const range of ZW_CRITICAL_INFRA_RANGES) {
    if (dstIp.startsWith(range.prefix)) {
      enriched.criticalInfraTarget = {
        org: range.org,
        sector: range.sector,
        cdpaRelevant: true,
        note: `Target is Zimbabwe critical infrastructure (${range.sector} sector). CDPA 2021 Section 15 incident reporting may apply.`,
      };
      console.log(`[Africa-TI] Critical infra target detected: ${range.org}`);
      break;
    }
  }

  // 3. Enrich based on destination port risk
  const port = logObject.destinationPort;
  if (port && HIGH_RISK_PORTS[port]) {
    const portInfo = HIGH_RISK_PORTS[port];
    enriched.portRisk = {
      service: portInfo.name,
      risk: portInfo.risk,
      cdpaDataRisk: portInfo.cdpa,
      note: portInfo.cdpa
        ? `Port ${port} (${portInfo.name}): If exploited, may constitute a personal data breach reportable under CDPA 2021.`
        : `Port ${port} (${portInfo.name}): ${portInfo.risk}`,
    };
  }

  return enriched;
}

/**
 * Get a summary of current regional threat posture.
 * Returns stats for the metrics dashboard.
 */
function getRegionalThreatSummary() {
  return {
    activeCampaigns: [
      'SADC Banking Sector Targeting — Q1 2025',
      'Government Portal SQLi Sweep — East/Southern Africa',
      'Telecom BGP Infrastructure Probing — SADC',
    ],
    certZwAdvisories: 3,
    criticalInfraAlerts: 1,
    topTargetedSectors: ['Banking', 'Government', 'Telecommunications'],
    lastUpdated: new Date().toISOString(),
  };
}

module.exports = { enrichWithAfricaThreatIntel, getRegionalThreatSummary };
