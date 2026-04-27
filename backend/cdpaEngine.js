'use strict';

const { v4: uuidv4 } = require('uuid');
const db = require('./db');

/**
 * CDPA 2021 Compliance Engine
 * ═══════════════════════════════════════════════════════════════
 * Zimbabwe's Cyber and Data Protection Act (2021) requires:
 * - Section 3:  Definition of personal data and processing
 * - Section 15: Breach notification within 72 hours to POTRAZ
 * - Section 16: Notification to affected data subjects
 * - Section 29: Cross-border data transfer restrictions
 * - Section 34: Security safeguards requirements
 * 
 * This engine evaluates every security event for CDPA relevance
 * and tracks compliance obligations automatically.
 */

// ── Ports/services likely to involve personal data ──────────────────────────

const PERSONAL_DATA_PORTS = {
  3306: { service: 'MySQL', dataRisk: 'high', reason: 'Database likely containing personal records' },
  5432: { service: 'PostgreSQL', dataRisk: 'high', reason: 'Database likely containing personal records' },
  1433: { service: 'MSSQL', dataRisk: 'high', reason: 'Database likely containing personal records' },
  27017: { service: 'MongoDB', dataRisk: 'high', reason: 'Document store may contain personal data' },
  6379: { service: 'Redis', dataRisk: 'medium', reason: 'Cache may contain session data with PII' },
  389: { service: 'LDAP', dataRisk: 'high', reason: 'Directory service with identity data' },
  636: { service: 'LDAPS', dataRisk: 'high', reason: 'Directory service with identity data' },
  21: { service: 'FTP', dataRisk: 'medium', reason: 'File transfer may involve personal data documents' },
  445: { service: 'SMB', dataRisk: 'medium', reason: 'File shares may contain personal data' },
  3389: { service: 'RDP', dataRisk: 'medium', reason: 'Remote access to systems processing personal data' },
  22: { service: 'SSH', dataRisk: 'low', reason: 'Administrative access to data-processing systems' },
  80: { service: 'HTTP', dataRisk: 'medium', reason: 'Unencrypted web traffic may contain personal data' },
  8080: { service: 'HTTP-alt', dataRisk: 'medium', reason: 'Application server may process personal data' },
  443: { service: 'HTTPS', dataRisk: 'low', reason: 'Encrypted web traffic — lower exfiltration risk' },
};

// ── Zimbabwe critical infrastructure sectors ────────────────────────────────

const ZW_SECTORS = {
  financial: { cdpaWeight: 1.5, rbzRelevant: true, label: 'Financial Services (RBZ regulated)' },
  government: { cdpaWeight: 1.3, rbzRelevant: false, label: 'Government / Parastatal' },
  telecom: { cdpaWeight: 1.4, rbzRelevant: false, label: 'Telecommunications (POTRAZ regulated)' },
  healthcare: { cdpaWeight: 1.5, rbzRelevant: false, label: 'Healthcare' },
  education: { cdpaWeight: 1.0, rbzRelevant: false, label: 'Education' },
  general: { cdpaWeight: 1.0, rbzRelevant: false, label: 'General Enterprise' },
};

// ── Cross-border transfer risk countries ─────────────────────────────────────

const HIGH_RISK_ORIGINS = {
  'RU': 'Russia — elevated cyber threat, CDPA Section 29 transfer concerns',
  'CN': 'China — data sovereignty implications under CDPA Section 29',
  'KP': 'North Korea — sanctioned nation, automatic escalation',
  'IR': 'Iran — sanctioned nation, automatic escalation',
  'NG': 'Nigeria — SilverTerrier BEC and financial fraud region',
};

// ── Main classification function ─────────────────────────────────────────────

function classifyEvent(log, enrichedLog, orgSector = 'general') {
  const result = {
    cdpaRelevant: false,
    classification: 'informational',
    sections: [],
    severity: 'low',
    notificationRequired: false,
    notificationDeadline: null,
    details: [],
    riskScore: 0,
  };

  const port = log.destinationPort;
  const portInfo = PERSONAL_DATA_PORTS[port];
  const sectorConfig = ZW_SECTORS[orgSector] || ZW_SECTORS.general;
  let riskScore = 0;

  // ── Check 1: Does this event involve personal data systems? ──────────────

  if (portInfo) {
    result.cdpaRelevant = true;
    result.sections.push('Section 3 — Personal data processing system targeted');
    result.details.push(`${portInfo.service} on port ${port}: ${portInfo.reason}`);

    if (portInfo.dataRisk === 'high') riskScore += 30;
    else if (portInfo.dataRisk === 'medium') riskScore += 15;
    else riskScore += 5;
  }

  // ── Check 2: Was the connection successful (data breach potential)? ───────

  if (log.action === 'ALLOWED' && portInfo && portInfo.dataRisk !== 'low') {
    riskScore += 25;
    result.sections.push('Section 15 — Potential personal data breach (connection allowed)');
    result.details.push('Inbound connection was ALLOWED to a personal data system — potential breach');
    result.classification = 'personal_data_breach';
    result.notificationRequired = true;

    // 72-hour deadline from detection
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + 72);
    result.notificationDeadline = deadline.toISOString();
  }

  // ── Check 3: Known malicious source? ──────────────────────────────────────

  if (enrichedLog.mispContext) {
    riskScore += 20;
    result.cdpaRelevant = true;
    result.sections.push('Section 34 — Security safeguard incident (known threat actor)');
    result.details.push(`Source IP flagged by threat intelligence: ${enrichedLog.mispContext.threat}`);

    if (log.action === 'ALLOWED') {
      riskScore += 30;
      result.classification = 'personal_data_breach';
      result.notificationRequired = true;
      const deadline = new Date();
      deadline.setHours(deadline.getHours() + 72);
      result.notificationDeadline = deadline.toISOString();
    } else {
      if (result.classification === 'informational') {
        result.classification = 'infrastructure_incident';
      }
    }
  }

  // ── Check 4: Critical infrastructure target? ──────────────────────────────

  if (enrichedLog.criticalInfraTarget) {
    riskScore += 15;
    result.cdpaRelevant = true;
    result.sections.push('Section 34 — Critical infrastructure security incident');
    result.details.push(`Target: ${enrichedLog.criticalInfraTarget.org} (${enrichedLog.criticalInfraTarget.sector})`);
    if (result.classification === 'informational') {
      result.classification = 'infrastructure_incident';
    }
  }

  // ── Check 5: Cross-border data concern? ───────────────────────────────────
  // (Would need GeoIP — for now check enriched data)

  if (enrichedLog.mispContext?.actor) {
    const actor = enrichedLog.mispContext.actor.toLowerCase();
    for (const [code, desc] of Object.entries(HIGH_RISK_ORIGINS)) {
      if (actor.includes(code.toLowerCase()) || actor.includes(desc.split(' — ')[0].toLowerCase())) {
        riskScore += 10;
        result.sections.push(`Section 29 — Cross-border transfer risk (${code})`);
        result.details.push(desc);
        break;
      }
    }
  }

  // ── Apply sector multiplier ───────────────────────────────────────────────

  riskScore = Math.round(riskScore * sectorConfig.cdpaWeight);
  
  if (sectorConfig.rbzRelevant && riskScore > 20) {
    result.sections.push('RBZ Directive — Financial sector incident reporting required');
    result.details.push('Reserve Bank of Zimbabwe cybersecurity directive applies');
  }

  // ── Final severity ────────────────────────────────────────────────────────

  if (riskScore >= 60) result.severity = 'critical';
  else if (riskScore >= 40) result.severity = 'high';
  else if (riskScore >= 20) result.severity = 'medium';
  else result.severity = 'low';

  result.riskScore = Math.min(riskScore, 100);

  return result;
}

// ── Persist compliance event ─────────────────────────────────────────────────

function recordComplianceEvent(log, classification) {
  if (!classification.cdpaRelevant) return null;

  const id = uuidv4();
  db.prepare(`
    INSERT INTO compliance_events 
    (id, event_id, source_ip, destination_ip, event_type, cdpa_section, cdpa_classification, 
     severity, notification_required, notification_deadline, details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, log.id, log.sourceIp, log.destinationIp,
    log.parserSource || 'unknown',
    classification.sections.join('; '),
    classification.classification,
    classification.severity,
    classification.notificationRequired ? 1 : 0,
    classification.notificationDeadline,
    JSON.stringify(classification.details)
  );

  return id;
}

// ── Dashboard metrics ────────────────────────────────────────────────────────

function getComplianceMetrics(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const total = db.prepare(`
    SELECT COUNT(*) as count FROM compliance_events WHERE created_at >= ?
  `).get(sinceStr);

  const byClassification = db.prepare(`
    SELECT cdpa_classification, COUNT(*) as count 
    FROM compliance_events WHERE created_at >= ?
    GROUP BY cdpa_classification
  `).all(sinceStr);

  const bySeverity = db.prepare(`
    SELECT severity, COUNT(*) as count 
    FROM compliance_events WHERE created_at >= ?
    GROUP BY severity
  `).all(sinceStr);

  const pendingNotifications = db.prepare(`
    SELECT * FROM compliance_events 
    WHERE notification_required = 1 AND notification_sent = 0 
    AND created_at >= ?
    ORDER BY notification_deadline ASC
  `).all(sinceStr);

  const overdueNotifications = db.prepare(`
    SELECT * FROM compliance_events 
    WHERE notification_required = 1 AND notification_sent = 0 
    AND notification_deadline < datetime('now')
    AND created_at >= ?
  `).all(sinceStr);

  const recentEvents = db.prepare(`
    SELECT * FROM compliance_events 
    WHERE created_at >= ?
    ORDER BY created_at DESC LIMIT 50
  `).all(sinceStr);

  // Compliance score: percentage of breaches with timely notification
  const totalBreaches = db.prepare(`
    SELECT COUNT(*) as count FROM compliance_events 
    WHERE notification_required = 1 AND created_at >= ?
  `).get(sinceStr);

  const timelyNotifications = db.prepare(`
    SELECT COUNT(*) as count FROM compliance_events 
    WHERE notification_required = 1 AND notification_sent = 1 
    AND notification_sent_at <= notification_deadline
    AND created_at >= ?
  `).get(sinceStr);

  const complianceScore = totalBreaches.count > 0
    ? Math.round((timelyNotifications.count / totalBreaches.count) * 100)
    : 100; // No breaches = 100% compliant

  return {
    period: { days, since: sinceStr },
    totalEvents: total.count,
    byClassification,
    bySeverity,
    pendingNotifications: pendingNotifications.length,
    overdueNotifications: overdueNotifications.length,
    pendingDetails: pendingNotifications,
    overdueDetails: overdueNotifications,
    recentEvents,
    complianceScore,
    breachCount: totalBreaches.count,
  };
}

// ── Mark notification as sent ────────────────────────────────────────────────

function markNotificationSent(eventId) {
  db.prepare(`
    UPDATE compliance_events 
    SET notification_sent = 1, notification_sent_at = datetime('now')
    WHERE id = ?
  `).run(eventId);
}

// ── Get CDPA report data for export ──────────────────────────────────────────

function generateComplianceReport(startDate, endDate) {
  const events = db.prepare(`
    SELECT * FROM compliance_events 
    WHERE created_at >= ? AND created_at <= ?
    ORDER BY created_at ASC
  `).all(startDate, endDate);

  const breaches = events.filter(e => e.cdpa_classification === 'personal_data_breach');
  const infraIncidents = events.filter(e => e.cdpa_classification === 'infrastructure_incident');

  return {
    reportTitle: 'CDPA 2021 Compliance Report',
    generatedBy: 'Chengeto CTI Platform — Algol Cyber Security',
    generatedAt: new Date().toISOString(),
    period: { start: startDate, end: endDate },
    summary: {
      totalSecurityEvents: events.length,
      personalDataBreaches: breaches.length,
      infrastructureIncidents: infraIncidents.length,
      notificationsSent: events.filter(e => e.notification_sent).length,
      notificationsPending: events.filter(e => e.notification_required && !e.notification_sent).length,
    },
    sections: {
      section3: { personalDataSystemsTargeted: events.filter(e => e.cdpa_section?.includes('Section 3')).length },
      section15: { breachNotifications: breaches.length },
      section29: { crossBorderConcerns: events.filter(e => e.cdpa_section?.includes('Section 29')).length },
      section34: { securityIncidents: events.filter(e => e.cdpa_section?.includes('Section 34')).length },
    },
    breachTimeline: breaches.map(b => ({
      id: b.id,
      detectedAt: b.created_at,
      sourceIp: b.source_ip,
      classification: b.cdpa_classification,
      notificationDeadline: b.notification_deadline,
      notificationSent: !!b.notification_sent,
      details: JSON.parse(b.details || '[]'),
    })),
    regulatoryNotes: [
      'This report is generated for CDPA 2021 compliance tracking purposes.',
      'Breach notifications must be submitted to POTRAZ within 72 hours of detection (Section 15).',
      'Affected data subjects must be notified without undue delay (Section 16).',
      'All incidents involving cross-border data transfers require additional assessment (Section 29).',
      'Financial sector entities: RBZ cybersecurity directive reporting applies in addition to CDPA.',
    ],
  };
}

module.exports = {
  classifyEvent, recordComplianceEvent,
  getComplianceMetrics, markNotificationSent, generateComplianceReport,
};
