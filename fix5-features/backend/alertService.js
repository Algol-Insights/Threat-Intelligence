'use strict';

/**
 * Alert Service — WhatsApp, SMS, and Email notifications
 * Uses Africa's Talking API (popular in SADC region)
 * Falls back to console logging when credentials aren't configured
 */

const db = require('./db');
const { v4: uuidv4 } = require('uuid');

// ── Configuration ───────────────────────────────────────────────────────────

function getConfig() {
  const getVal = (key, fallback = '') => {
    const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key);
    return row ? row.value : (process.env[key.toUpperCase().replace(/\./g, '_')] || fallback);
  };
  return {
    whatsapp: {
      enabled: getVal('alerts.whatsapp.enabled', 'false') === 'true',
      apiKey: getVal('alerts.africastalking.apikey', ''),
      username: getVal('alerts.africastalking.username', 'sandbox'),
      recipients: getVal('alerts.whatsapp.recipients', '').split(',').filter(Boolean),
    },
    sms: {
      enabled: getVal('alerts.sms.enabled', 'false') === 'true',
      recipients: getVal('alerts.sms.recipients', '').split(',').filter(Boolean),
    },
    email: {
      enabled: getVal('alerts.email.enabled', 'false') === 'true',
      smtpHost: getVal('alerts.smtp.host', ''),
      smtpPort: getVal('alerts.smtp.port', '587'),
      smtpUser: getVal('alerts.smtp.user', ''),
      smtpPass: getVal('alerts.smtp.pass', ''),
      from: getVal('alerts.email.from', 'chengeto@algolcyber.co.zw'),
      recipients: getVal('alerts.email.recipients', '').split(',').filter(Boolean),
    },
    thresholdSeverity: getVal('alerts.threshold', 'Critical'),
  };
}

// ── Alert templates ─────────────────────────────────────────────────────────

function formatAlert(type, data) {
  const timestamp = new Date().toLocaleString('en-ZW');
  if (type === 'correlation_alert') {
    return {
      subject: `⚠️ CHENGETO: ${data.severity} — ${data.ruleName}`,
      body: `CHENGETO SECURITY ALERT\n━━━━━━━━━━━━━━━━━━━━\nSeverity: ${data.severity}\nRule: ${data.ruleName}\nSource: ${data.sourceIp}\nTarget: ${data.destinationIp}:${data.destinationPort}\nTime: ${timestamp}\n\nDescription: ${data.description}\n${data.autoRespond ? '\n✅ Auto-response executed: ' + data.respondAction : ''}\n\nLogin to investigate: ${process.env.PLATFORM_URL || 'http://localhost:3000'}`,
      short: `⚠️ ${data.severity}: ${data.ruleName} from ${data.sourceIp} — ${timestamp}`,
    };
  }
  if (type === 'cdpa_breach') {
    const deadline = data.classification?.notificationDeadline ? new Date(data.classification.notificationDeadline).toLocaleString('en-ZW') : 'N/A';
    return {
      subject: `🔴 CHENGETO: CDPA Breach Detected — 72h notification required`,
      body: `CHENGETO CDPA BREACH ALERT\n━━━━━━━━━━━━━━━━━━━━━━━━\nClassification: ${data.classification?.classification?.replace(/_/g, ' ')}\nSource: ${data.log?.sourceIp}\nTarget: ${data.log?.destinationIp}:${data.log?.destinationPort}\nPOTRAZ Deadline: ${deadline}\nTime: ${timestamp}\n\nCDPA Sections: ${data.classification?.sections?.join(', ')}\n\nIMMEDIATE ACTION REQUIRED\nLogin: ${process.env.PLATFORM_URL || 'http://localhost:3000/compliance'}`,
      short: `🔴 CDPA BREACH: ${data.classification?.classification?.replace(/_/g, ' ')} — Deadline: ${deadline}`,
    };
  }
  if (type === 'ioc_hit') {
    return {
      subject: `🟠 CHENGETO: IOC Watchlist Hit — ${data.ioc?.value}`,
      body: `CHENGETO IOC ALERT\n━━━━━━━━━━━━━━━━\nIOC: ${data.ioc?.value} (${data.ioc?.type})\nThreat: ${data.ioc?.threat_type}\nSource: ${data.log?.sourceIp}\nTime: ${timestamp}`,
      short: `🟠 IOC HIT: ${data.ioc?.value} from ${data.log?.sourceIp}`,
    };
  }
  return { subject: 'Chengeto Alert', body: JSON.stringify(data), short: 'Security alert triggered' };
}

// ── Send via Africa's Talking ───────────────────────────────────────────────

async function sendSMS(config, message) {
  if (!config.sms.enabled || config.sms.recipients.length === 0) return { sent: false, reason: 'SMS not configured' };
  try {
    const params = new URLSearchParams({
      username: config.whatsapp.username,
      to: config.sms.recipients.join(','),
      message: message.short,
    });
    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'apiKey': config.whatsapp.apiKey, 'Accept': 'application/json' },
      body: params.toString(),
    });
    const data = await res.json();
    console.log('[ALERTS] SMS sent:', JSON.stringify(data));
    return { sent: true, response: data };
  } catch (err) {
    console.error('[ALERTS] SMS failed:', err.message);
    return { sent: false, error: err.message };
  }
}

// ── Log alert to database ───────────────────────────────────────────────────

function logAlert(type, severity, message, channels, results) {
  try {
    db.prepare(`
      INSERT INTO audit_log (id, actor_id, actor_username, action, target_type, target_id, details, ip_address)
      VALUES (?, 'system', 'system', 'alert_sent', ?, ?, ?, 'system')
    `).run(uuidv4(), type, severity, JSON.stringify({ message: message.subject, channels, results }));
  } catch { /* non-critical */ }
}

// ── Main dispatch function ──────────────────────────────────────────────────

async function sendAlert(type, data) {
  const config = getConfig();
  const severityOrder = ['Informational', 'Low', 'Medium', 'High', 'Critical'];
  const alertSeverity = data.severity || data.classification?.severity || 'Medium';

  // Check threshold
  if (severityOrder.indexOf(alertSeverity) < severityOrder.indexOf(config.thresholdSeverity)) {
    return { dispatched: false, reason: 'Below severity threshold' };
  }

  const message = formatAlert(type, data);
  const results = {};
  const channels = [];

  // SMS via Africa's Talking
  if (config.sms.enabled) {
    channels.push('sms');
    results.sms = await sendSMS(config, message);
  }

  // Console log (always — for audit)
  console.log(`[ALERTS] ${message.subject}`);
  channels.push('console');

  logAlert(type, alertSeverity, message, channels, results);

  return { dispatched: true, channels, results };
}

// ── Get alert configuration status ──────────────────────────────────────────

function getAlertStatus() {
  const config = getConfig();
  return {
    whatsapp: { enabled: config.whatsapp.enabled, recipientCount: config.whatsapp.recipients.length },
    sms: { enabled: config.sms.enabled, recipientCount: config.sms.recipients.length },
    email: { enabled: config.email.enabled, recipientCount: config.email.recipients.length },
    thresholdSeverity: config.thresholdSeverity,
  };
}

module.exports = { sendAlert, getAlertStatus, formatAlert };
