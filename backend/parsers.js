'use strict';

const { v4: uuidv4 } = require('uuid');

// ── UFW firewall log parser ─────────────────────────────────────────────────

function parseUfwLog(line) {
  const blockIdx = line.indexOf('[UFW BLOCK]');
  const allowIdx = line.indexOf('[UFW ALLOW]');
  let contentIndex = blockIdx !== -1 ? blockIdx : allowIdx;
  let action = blockIdx !== -1 ? 'BLOCKED' : 'ALLOWED';

  if (contentIndex === -1) return null;

  const content = line.substring(contentIndex);
  const src = content.match(/SRC=([\d.:a-fA-F]+)/);
  const dst = content.match(/DST=([\d.:a-fA-F]+)/);
  const proto = content.match(/PROTO=(\w+)/);
  const dpt = content.match(/DPT=(\d+)/);

  if (!src || !dst || !proto || !dpt) return null;

  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    sourceIp: src[1],
    destinationIp: dst[1],
    destinationPort: parseInt(dpt[1], 10),
    protocol: proto[1].toUpperCase(),
    action,
    description: content.replace(/\[UFW (BLOCK|ALLOW)\]\s*/, '').trim(),
    parserSource: 'ufw',
    rawLog: line,
  };
}

// ── Wazuh JSON event parser ─────────────────────────────────────────────────

function parseWazuhLog(line) {
  let data;
  try {
    data = JSON.parse(line);
  } catch {
    // Try to extract JSON from syslog wrapper
    const jsonStart = line.indexOf('{');
    if (jsonStart === -1) return null;
    try { data = JSON.parse(line.substring(jsonStart)); } catch { return null; }
  }

  // Validate it looks like a Wazuh event
  if (!data.rule && !data.agent) return null;

  const rule = data.rule || {};
  const agent = data.agent || {};
  const srcIp = data.data?.srcip || data.srcip || data.data?.src_ip || '0.0.0.0';
  const dstIp = data.data?.dstip || data.dstip || data.data?.dst_ip || '0.0.0.0';
  const dstPort = parseInt(data.data?.dstport || data.data?.dst_port || '0', 10);

  const level = rule.level || 0;
  let action = 'ALLOWED';
  if (level >= 10) action = 'BLOCKED';
  else if (level >= 6) action = 'ALERT';

  return {
    id: `wazuh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: data.timestamp || new Date().toISOString(),
    sourceIp: srcIp,
    destinationIp: dstIp,
    destinationPort: dstPort,
    protocol: (data.data?.protocol || 'TCP').toUpperCase(),
    action,
    description: rule.description || data.full_log || 'Wazuh event',
    parserSource: 'wazuh',
    wazuhMeta: {
      ruleId: rule.id,
      ruleLevel: level,
      ruleGroups: rule.groups || [],
      agentName: agent.name,
      agentId: agent.id,
      decoderName: data.decoder?.name,
    },
    rawLog: line,
  };
}

// ── osquery JSON event parser ───────────────────────────────────────────────

function parseOsqueryLog(line) {
  let data;
  try {
    data = JSON.parse(line);
  } catch {
    const jsonStart = line.indexOf('{');
    if (jsonStart === -1) return null;
    try { data = JSON.parse(line.substring(jsonStart)); } catch { return null; }
  }

  // Validate it looks like an osquery event
  if (!data.name && !data.action && !data.columns) return null;

  const cols = data.columns || {};
  const srcIp = cols.remote_address || cols.src_ip || cols.address || '0.0.0.0';
  const dstIp = cols.local_address || cols.dst_ip || '0.0.0.0';
  const dstPort = parseInt(cols.local_port || cols.remote_port || cols.port || '0', 10);

  let action = 'ALLOWED';
  if (data.action === 'removed' || data.action === 'blocked') action = 'BLOCKED';
  else if (data.action === 'added' || data.action === 'allowed') action = 'ALLOWED';

  const description = data.name
    ? `${data.name}: ${data.action || 'observed'} — ${cols.path || cols.cmdline || cols.name || ''}`
    : JSON.stringify(cols).slice(0, 200);

  return {
    id: `osquery-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: data.calendarTime || data.unixTime ? new Date(data.unixTime * 1000).toISOString() : new Date().toISOString(),
    sourceIp: srcIp,
    destinationIp: dstIp,
    destinationPort: dstPort,
    protocol: (cols.protocol || 'TCP').toUpperCase(),
    action,
    description: description.trim(),
    parserSource: 'osquery',
    osqueryMeta: {
      queryName: data.name,
      osqueryAction: data.action,
      hostIdentifier: data.hostIdentifier,
      columns: cols,
    },
    rawLog: line,
  };
}

// ── Generic syslog parser (catch-all) ───────────────────────────────────────

function parseGenericSyslog(line) {
  // Extract IP addresses from any log line
  const ips = line.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g) || [];
  const portMatch = line.match(/(?:port|dpt|DPT|dst_port)[=:\s](\d+)/i);

  return {
    id: `syslog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    sourceIp: ips[0] || '0.0.0.0',
    destinationIp: ips[1] || '0.0.0.0',
    destinationPort: portMatch ? parseInt(portMatch[1], 10) : 0,
    protocol: 'TCP',
    action: /deny|drop|block|reject|fail/i.test(line) ? 'BLOCKED' : 'ALLOWED',
    description: line.slice(0, 300),
    parserSource: 'generic_syslog',
    rawLog: line,
  };
}

// ── Main dispatcher ─────────────────────────────────────────────────────────

function parseSyslog(line) {
  if (!line || typeof line !== 'string') return null;
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Try each parser in order of specificity
  let result = parseUfwLog(trimmed);
  if (result) return result;

  result = parseWazuhLog(trimmed);
  if (result) return result;

  result = parseOsqueryLog(trimmed);
  if (result) return result;

  // Fall back to generic parser for any structured syslog
  if (trimmed.length > 10) {
    return parseGenericSyslog(trimmed);
  }

  return null;
}

module.exports = { parseSyslog, parseUfwLog, parseWazuhLog, parseOsqueryLog, parseGenericSyslog };
