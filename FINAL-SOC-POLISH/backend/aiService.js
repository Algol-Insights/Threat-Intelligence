'use strict';

/**
 * AI Analysis Service — Multi-Model Fallback Chain
 * ═══════════════════════════════════════════════════
 * Chain: Gemini Flash (free) → DeepSeek → Groq → Offline Profiles
 * API keys stay server-side. Frontend never touches them.
 */

// ── Model configuration ─────────────────────────────────────────────────────

const MODELS = {
  gemini: {
    name: 'Gemini 2.5 Flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent',
    keyEnv: 'GEMINI_API_KEY',
  },
  deepseek: {
    name: 'DeepSeek R1',
    endpoint: 'https://api.deepseek.com/chat/completions',
    keyEnv: 'DEEPSEEK_API_KEY',
  },
  groq: {
    name: 'Groq Llama 3.3 70B',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    keyEnv: 'GROQ_API_KEY',
  },
};

// ── Zimbabwe/CDPA-enhanced analysis prompt ──────────────────────────────────

function buildThreatPrompt(log, context) {
  const contextStr = context
    ? `Organizational Context:\n- Industry: ${context.industry}\n- Country: ${context.country || 'Zimbabwe'}\n- Sector: ${context.sector || 'General'}`
    : 'Organizational Context: Zimbabwe-based enterprise, assume CDPA 2021 applies.';

  const enrichmentStr = log.mispContext
    ? `\nThreat Intelligence Match:\n- Threat: ${log.mispContext.threat}\n- Actor: ${log.mispContext.actor}\n- Confidence: ${log.mispContext.confidence}\n- CERT.ZW Advisory: ${log.mispContext.certZwAdvisory || 'None'}`
    : '';

  return `As a senior cybersecurity analyst specializing in the African threat landscape, provide an expert threat analysis of this security event.

${contextStr}
${enrichmentStr}

Security Event:
- Source IP: ${log.sourceIp}
- Destination IP: ${log.destinationIp}
- Destination Port: ${log.destinationPort}
- Protocol: ${log.protocol}
- Action: ${log.action}
- Description: ${log.description}
- Parser: ${log.parserSource || 'unknown'}

Respond ONLY with valid JSON matching this exact structure (no markdown, no backticks):
{
  "threatName": "concise threat name",
  "severity": "Critical|High|Medium|Low|Informational",
  "contextualSeverity": "adjusted severity for this org context",
  "cveId": "CVE-XXXX-XXXXX or N/A",
  "summary": "one paragraph threat summary",
  "mitigation": "recommended mitigation steps",
  "firewallActionAnalysis": "analysis of how the firewall handled this",
  "threatActorDNA": {
    "name": "threat actor or group name",
    "ttps": [{"technique": "MITRE technique name", "id": "TXXXX.XXX"}],
    "commonTools": "tools used by this actor",
    "motivation": "likely motivation"
  },
  "predictiveAnalysis": "forecast of attacker's likely next steps",
  "crossDomainCorrelation": "links to geopolitical events, fraud, or other domains",
  "complianceImpact": "CDPA 2021 impact assessment — reference specific sections (3, 15, 16, 29, 34). For financial sector: include RBZ directive relevance. For telecom: include POTRAZ reporting."
}`;
}

function buildRemediationPrompt(service) {
  return `As a senior cybersecurity engineer working in the SADC region, provide actionable remediation for this insecure service.

Service: ${service.name}
Port: ${service.port}/${service.protocol}
Version: ${service.version}
Risk: ${service.insecurityReason}

Provide markdown-formatted response with: risk overview, numbered remediation steps, and any Zimbabwe/CDPA compliance notes. Be practical — assume the admin has basic Linux skills.`;
}

// ── Gemini API call ─────────────────────────────────────────────────────────

async function callGemini(prompt) {
  const key = process.env[MODELS.gemini.keyEnv];
  if (!key) throw new Error('GEMINI_API_KEY not configured');

  const url = `${MODELS.gemini.endpoint}?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  return text;
}

// ── DeepSeek API call ───────────────────────────────────────────────────────

async function callDeepSeek(prompt) {
  const key = process.env[MODELS.deepseek.keyEnv];
  if (!key) throw new Error('DEEPSEEK_API_KEY not configured');

  const res = await fetch(MODELS.deepseek.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) throw new Error(`DeepSeek ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content;
}

// ── Groq API call ───────────────────────────────────────────────────────────

async function callGroq(prompt) {
  const key = process.env[MODELS.groq.keyEnv];
  if (!key) throw new Error('GROQ_API_KEY not configured');

  const res = await fetch(MODELS.groq.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) throw new Error(`Groq ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content;
}

// ── Offline fallback profiles ───────────────────────────────────────────────

const OFFLINE_PROFILES = {
  ssh_brute: {
    threatName: 'SSH Brute-Force Attack',
    severity: 'High', contextualSeverity: 'High', cveId: 'N/A',
    summary: 'Repeated SSH authentication attempts detected from external IP. This pattern indicates automated credential stuffing or brute-force attack targeting SSH services.',
    mitigation: 'Implement fail2ban, enforce key-based SSH authentication, restrict SSH access to known IP ranges via UFW/firewall rules.',
    firewallActionAnalysis: 'The firewall correctly blocked these attempts, preventing unauthorized access.',
    threatActorDNA: { name: 'Commodity SSH Scanner', ttps: [{ technique: 'Brute Force: Password Spraying', id: 'T1110.003' }, { technique: 'Valid Accounts', id: 'T1078' }], commonTools: 'Hydra, Medusa, custom scripts', motivation: 'Initial Access for further exploitation' },
    predictiveAnalysis: 'If successful, attacker would likely deploy cryptocurrency miners, establish persistence via cron jobs, or pivot to internal network reconnaissance.',
    crossDomainCorrelation: 'SSH scanning campaigns are often linked to botnet infrastructure. Source IP may be part of a larger compromised network.',
    complianceImpact: 'CDPA 2021 Section 34: Security safeguard incident. If SSH grants access to systems processing personal data, Section 15 breach notification may apply.',
  },
  sql_injection: {
    threatName: 'SQL Injection Attempt',
    severity: 'Critical', contextualSeverity: 'Critical', cveId: 'N/A',
    summary: 'Web application attack attempting to inject SQL commands. If successful, could lead to unauthorized database access and personal data exfiltration.',
    mitigation: 'Deploy WAF rules, implement parameterized queries, conduct application security audit, enable database activity monitoring.',
    firewallActionAnalysis: 'Network-level blocking provides first defense but application-layer protection (WAF) is essential for complete mitigation.',
    threatActorDNA: { name: 'Web Application Attacker', ttps: [{ technique: 'Exploit Public-Facing Application', id: 'T1190' }, { technique: 'Data from Information Repositories', id: 'T1213' }], commonTools: 'SQLMap, Burp Suite, custom payloads', motivation: 'Data theft, financial fraud' },
    predictiveAnalysis: 'Successful injection leads to data exfiltration, privilege escalation within the database, and potential lateral movement to application servers.',
    crossDomainCorrelation: 'SQL injection campaigns targeting African financial institutions have increased. CERT.ZW has issued advisories on web application attacks targeting banking portals.',
    complianceImpact: 'CDPA 2021 Section 15: If database contains personal data, this constitutes a notifiable breach attempt. Section 3 personal data at risk. POTRAZ notification within 72 hours if breach confirmed.',
  },
  c2_communication: {
    threatName: 'Command & Control Communication',
    severity: 'Critical', contextualSeverity: 'Critical', cveId: 'N/A',
    summary: 'Outbound connection to suspected C2 infrastructure detected. This indicates a compromised internal host communicating with attacker-controlled servers.',
    mitigation: 'Immediately isolate affected host, conduct forensic analysis, block C2 IP at perimeter, scan all endpoints for similar indicators.',
    firewallActionAnalysis: 'Blocking this connection disrupts the C2 channel but the compromised host requires immediate investigation and remediation.',
    threatActorDNA: { name: 'Unknown APT / Banking Trojan Operator', ttps: [{ technique: 'Application Layer Protocol', id: 'T1071' }, { technique: 'Exfiltration Over C2 Channel', id: 'T1041' }], commonTools: 'Cobalt Strike, custom RAT, banking trojans', motivation: 'Financial crime, espionage, or ransomware deployment' },
    predictiveAnalysis: 'Active C2 suggests attacker has established foothold. Next steps: lateral movement, privilege escalation, data staging, and exfiltration or ransomware deployment.',
    crossDomainCorrelation: 'C2 infrastructure targeting SADC banking sector has been linked to FIN-affiliated groups. SADC Banking Sector Campaign 2023-2024 reference.',
    complianceImpact: 'CDPA 2021 Section 15: Active compromise with C2 channel — high probability of personal data breach. Mandatory 72-hour notification to POTRAZ. Section 34 security safeguard failure. RBZ directive: immediate reporting for financial institutions.',
  },
  port_scan: {
    threatName: 'Network Reconnaissance — Port Scan',
    severity: 'Medium', contextualSeverity: 'Medium', cveId: 'N/A',
    summary: 'Systematic port scanning detected from external source. This is typically the first phase of an attack chain — the attacker is mapping exposed services.',
    mitigation: 'Review and minimize exposed services, ensure all public-facing services are patched, implement port knocking or VPN for administrative services.',
    firewallActionAnalysis: 'Firewall is correctly blocking probes on closed ports. Verify no responses leaked on open ports.',
    threatActorDNA: { name: 'Automated Scanner / Reconnaissance', ttps: [{ technique: 'Active Scanning: Port Scanning', id: 'T1595.001' }, { technique: 'Network Service Discovery', id: 'T1046' }], commonTools: 'Nmap, Masscan, ZMap, Shodan', motivation: 'Reconnaissance for vulnerability exploitation' },
    predictiveAnalysis: 'After identifying open ports, attacker will probe for vulnerabilities in discovered services, attempt authentication bypass, or launch service-specific exploits.',
    crossDomainCorrelation: 'Port scanning of African infrastructure has increased, particularly targeting government and telecom sectors in the SADC region.',
    complianceImpact: 'CDPA 2021 Section 34: Proactive detection demonstrates security safeguard compliance. No breach notification required for blocked scans.',
  },
  ransomware_indicator: {
    threatName: 'Ransomware Indicator Detected',
    severity: 'Critical', contextualSeverity: 'Critical', cveId: 'N/A',
    summary: 'Network behavior matching known ransomware communication patterns detected. This could indicate active ransomware deployment or lateral movement.',
    mitigation: 'Immediately isolate affected network segment, activate incident response plan, verify backup integrity, engage forensic analysis team.',
    firewallActionAnalysis: 'Network blocking is critical but insufficient alone — endpoint isolation and forensic response required.',
    threatActorDNA: { name: 'Ransomware Operator', ttps: [{ technique: 'Data Encrypted for Impact', id: 'T1486' }, { technique: 'Inhibit System Recovery', id: 'T1490' }, { technique: 'Lateral Tool Transfer', id: 'T1570' }], commonTools: 'LockBit, BlackCat, Royal ransomware variants', motivation: 'Financial extortion' },
    predictiveAnalysis: 'Ransomware operators typically exfiltrate data before encryption (double extortion). Expect ransom demand within hours of encryption. Recovery without backups is extremely difficult.',
    crossDomainCorrelation: 'Ransomware attacks on African organizations have increased 300% since 2022. Several Zimbabwean organizations have been targeted by LockBit affiliates.',
    complianceImpact: 'CDPA 2021 Section 15: Ransomware with data exfiltration is a mandatory reportable breach. 72-hour POTRAZ notification. Section 16: affected data subjects must be notified. RBZ directive: immediate reporting for financial sector.',
  },
  rdp_attack: {
    threatName: 'RDP Exploitation Attempt',
    severity: 'High', contextualSeverity: 'High', cveId: 'CVE-2019-0708',
    summary: 'Remote Desktop Protocol attack detected. RDP is a primary vector for ransomware delivery and unauthorized access to Windows systems.',
    mitigation: 'Disable RDP where not required, enforce NLA, use VPN for remote access, apply BlueKeep and related patches, implement account lockout policies.',
    firewallActionAnalysis: 'Blocking external RDP access is critical. Verify RDP is not exposed on any public-facing interface.',
    threatActorDNA: { name: 'RDP Brute-Force / Exploit Operator', ttps: [{ technique: 'Remote Services: Remote Desktop Protocol', id: 'T1021.001' }, { technique: 'Brute Force', id: 'T1110' }], commonTools: 'Shodan, Crowbar, custom RDP exploits', motivation: 'Initial access for ransomware or cryptomining' },
    predictiveAnalysis: 'Successful RDP access leads to interactive session, privilege escalation, lateral movement, and typically ransomware deployment within hours.',
    crossDomainCorrelation: 'RDP remains the most common initial access vector globally and in Africa. Many Zimbabwean organizations still expose RDP to the internet.',
    complianceImpact: 'CDPA 2021 Section 34: RDP exposure is a security safeguard deficiency. If RDP provides access to personal data systems, Section 15 applies on successful breach.',
  },
  dns_tunneling: {
    threatName: 'DNS Tunneling / Exfiltration Suspect',
    severity: 'High', contextualSeverity: 'High', cveId: 'N/A',
    summary: 'Abnormal DNS query patterns suggest DNS tunneling for data exfiltration or C2 communication. Attackers encode data in DNS queries to bypass traditional security controls.',
    mitigation: 'Implement DNS filtering, monitor for unusually long DNS queries, deploy DNS security solution, block direct DNS to external resolvers.',
    firewallActionAnalysis: 'DNS-based exfiltration often bypasses firewall rules as DNS is typically allowed. Deep packet inspection of DNS traffic recommended.',
    threatActorDNA: { name: 'Advanced Persistent Threat', ttps: [{ technique: 'Application Layer Protocol: DNS', id: 'T1071.004' }, { technique: 'Exfiltration Over Alternative Protocol', id: 'T1048' }], commonTools: 'Iodine, DNScat2, custom tools', motivation: 'Covert data exfiltration or persistent C2' },
    predictiveAnalysis: 'DNS tunneling indicates established access and active exfiltration. Attacker is likely extracting sensitive data slowly to avoid detection.',
    crossDomainCorrelation: 'DNS-based attacks are increasingly used against African telecom providers for infrastructure reconnaissance.',
    complianceImpact: 'CDPA 2021 Section 15: Active data exfiltration via DNS constitutes a personal data breach if personal data is involved. Mandatory POTRAZ notification.',
  },
  web_attack: {
    threatName: 'Web Application Attack',
    severity: 'High', contextualSeverity: 'High', cveId: 'N/A',
    summary: 'Malicious web traffic targeting application layer vulnerabilities detected. This includes potential XSS, directory traversal, or API abuse attempts.',
    mitigation: 'Deploy Web Application Firewall (WAF), conduct penetration testing, implement input validation, enable HTTPS everywhere, review access logs.',
    firewallActionAnalysis: 'Network firewall provides limited protection against application-layer attacks. WAF deployment is essential.',
    threatActorDNA: { name: 'Web Application Attacker', ttps: [{ technique: 'Exploit Public-Facing Application', id: 'T1190' }, { technique: 'Server-Side Request Forgery', id: 'T1659' }], commonTools: 'Burp Suite, OWASP ZAP, Nikto, custom scripts', motivation: 'Data theft, website defacement, or pivot to internal network' },
    predictiveAnalysis: 'Successful web exploitation leads to web shell deployment, database access, and potential pivot to internal infrastructure.',
    crossDomainCorrelation: 'Government portal targeting campaigns across East and Southern Africa have used web application attacks as primary vector.',
    complianceImpact: 'CDPA 2021 Section 3/15: If web application processes personal data (forms, accounts), successful attack is a notifiable breach.',
  },
};

function getOfflineProfile(log) {
  // Return honest unavailable response instead of canned data
  return {
    threatName: "AI Analysis Unavailable",
    severity: "Unknown",
    cveId: "N/A",
    summary: "AI threat analysis requires an API key. Configure GEMINI_API_KEY, DEEPSEEK_API_KEY, or GROQ_API_KEY in your .env file to enable real-time AI analysis.",
    mitigation: "Configure an AI API key to receive specific mitigation guidance for this event.",
    firewallActionAnalysis: log.action === "BLOCKED" ? "The firewall correctly blocked this connection." : "This connection was allowed — review if this is expected behaviour.",
    threatActorDNA: { name: "Unknown", ttps: [], commonTools: "N/A", motivation: "N/A" },
    predictiveAnalysis: "Enable AI analysis for predictive threat assessment.",
    crossDomainCorrelation: "N/A",
    complianceImpact: "Enable AI analysis for CDPA compliance impact assessment.",
    _model: "unavailable"
  };
  const port = log.destinationPort;
  const desc = (log.description || '').toLowerCase();

  if (port === 22) return { ...OFFLINE_PROFILES.ssh_brute, _model: 'offline' };
  if (port === 3389) return { ...OFFLINE_PROFILES.rdp_attack, _model: 'offline' };
  if (port === 53) return { ...OFFLINE_PROFILES.dns_tunneling, _model: 'offline' };
  if ([80, 443, 8080, 8443].includes(port)) {
    if (desc.includes('sql')) return { ...OFFLINE_PROFILES.sql_injection, _model: 'offline' };
    return { ...OFFLINE_PROFILES.web_attack, _model: 'offline' };
  }
  if ([445, 139].includes(port)) return { ...OFFLINE_PROFILES.ransomware_indicator, _model: 'offline' };
  if ([4444, 5555, 31337, 1337].includes(port)) return { ...OFFLINE_PROFILES.c2_communication, _model: 'offline' };
  if (log.mispContext?.tags?.includes('c2')) return { ...OFFLINE_PROFILES.c2_communication, _model: 'offline' };
  
  return { ...OFFLINE_PROFILES.port_scan, _model: 'offline' };
}

// ── Main analysis function with fallback chain ──────────────────────────────

async function analyzeThreat(log, context = null) {
  const prompt = buildThreatPrompt(log, context);
  const chain = ['gemini', 'deepseek', 'groq'];
  const callers = { gemini: callGemini, deepseek: callDeepSeek, groq: callGroq };

  for (const model of chain) {
    const key = process.env[MODELS[model].keyEnv];
    if (!key) continue; // Skip if no API key configured

    try {
      console.log(`[AI] Attempting analysis via ${MODELS[model].name}...`);
      const raw = await callers[model](prompt);
      const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const result = JSON.parse(cleaned);

      // Validate required fields
      if (!result.threatName || !result.severity || !result.threatActorDNA) {
        throw new Error('Missing required fields in AI response');
      }

      result._model = model;
      console.log(`[AI] Analysis complete via ${MODELS[model].name}: ${result.threatName} (${result.severity})`);
      return result;
    } catch (err) {
      console.warn(`[AI] ${MODELS[model].name} failed: ${err.message}`);
    }
  }

  // All models failed — use offline profile
  console.log('[AI] All models failed or unconfigured. Using offline fallback profile.');
  return getOfflineProfile(log);
}

async function getRemediation(service) {
  const prompt = buildRemediationPrompt(service);
  const chain = ['gemini', 'deepseek', 'groq'];
  const callers = { gemini: callGemini, deepseek: callDeepSeek, groq: callGroq };

  for (const model of chain) {
    const key = process.env[MODELS[model].keyEnv];
    if (!key) continue;

    try {
      const result = await callers[model](prompt);
      return { content: result, _model: model };
    } catch (err) {
      console.warn(`[AI] Remediation via ${MODELS[model].name} failed: ${err.message}`);
    }
  }

  return {
    content: `### Remediation for ${service.name} on port ${service.port}\n\n**Risk:** ${service.insecurityReason}\n\n**Steps:**\n1. Disable the insecure service if not required\n2. If required, upgrade to encrypted alternative\n3. Restrict access via firewall rules to known IPs only\n4. Monitor for unauthorized access attempts\n5. Document remediation for CDPA 2021 compliance (Section 34)`,
    _model: 'offline',
  };
}

module.exports = { analyzeThreat, getRemediation };
