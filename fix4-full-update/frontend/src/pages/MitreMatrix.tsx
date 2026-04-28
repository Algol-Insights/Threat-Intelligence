import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Shield, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

// MITRE ATT&CK Enterprise Tactics with key techniques
const ATTACK_MATRIX = [
  { id: 'TA0043', name: 'Reconnaissance', color: '#6366f1', techniques: [
    { id: 'T1595', name: 'Active Scanning', sub: [{ id: 'T1595.001', name: 'Scanning IP Blocks' }, { id: 'T1595.002', name: 'Vulnerability Scanning' }] },
    { id: 'T1046', name: 'Network Service Discovery', sub: [] },
    { id: 'T1592', name: 'Gather Victim Host Information', sub: [] },
  ]},
  { id: 'TA0001', name: 'Initial Access', color: '#ef4444', techniques: [
    { id: 'T1190', name: 'Exploit Public-Facing Application', sub: [] },
    { id: 'T1078', name: 'Valid Accounts', sub: [{ id: 'T1078.001', name: 'Default Accounts' }, { id: 'T1078.003', name: 'Local Accounts' }] },
    { id: 'T1133', name: 'External Remote Services', sub: [] },
    { id: 'T1566', name: 'Phishing', sub: [{ id: 'T1566.001', name: 'Spearphishing Attachment' }, { id: 'T1566.002', name: 'Spearphishing Link' }] },
  ]},
  { id: 'TA0002', name: 'Execution', color: '#f97316', techniques: [
    { id: 'T1059', name: 'Command and Scripting Interpreter', sub: [{ id: 'T1059.001', name: 'PowerShell' }, { id: 'T1059.003', name: 'Windows Command Shell' }, { id: 'T1059.004', name: 'Unix Shell' }] },
    { id: 'T1204', name: 'User Execution', sub: [] },
  ]},
  { id: 'TA0003', name: 'Persistence', color: '#eab308', techniques: [
    { id: 'T1098', name: 'Account Manipulation', sub: [] },
    { id: 'T1136', name: 'Create Account', sub: [] },
    { id: 'T1053', name: 'Scheduled Task/Job', sub: [] },
  ]},
  { id: 'TA0004', name: 'Privilege Escalation', color: '#f59e0b', techniques: [
    { id: 'T1068', name: 'Exploitation for Privilege Escalation', sub: [] },
    { id: 'T1548', name: 'Abuse Elevation Control Mechanism', sub: [] },
  ]},
  { id: 'TA0005', name: 'Defense Evasion', color: '#84cc16', techniques: [
    { id: 'T1070', name: 'Indicator Removal', sub: [{ id: 'T1070.001', name: 'Clear Windows Event Logs' }, { id: 'T1070.004', name: 'File Deletion' }] },
    { id: 'T1036', name: 'Masquerading', sub: [] },
    { id: 'T1027', name: 'Obfuscated Files or Information', sub: [] },
  ]},
  { id: 'TA0006', name: 'Credential Access', color: '#22c55e', techniques: [
    { id: 'T1110', name: 'Brute Force', sub: [{ id: 'T1110.001', name: 'Password Guessing' }, { id: 'T1110.003', name: 'Password Spraying' }] },
    { id: 'T1003', name: 'OS Credential Dumping', sub: [] },
  ]},
  { id: 'TA0007', name: 'Discovery', color: '#06b6d4', techniques: [
    { id: 'T1046', name: 'Network Service Scanning', sub: [] },
    { id: 'T1082', name: 'System Information Discovery', sub: [] },
    { id: 'T1018', name: 'Remote System Discovery', sub: [] },
  ]},
  { id: 'TA0008', name: 'Lateral Movement', color: '#8b5cf6', techniques: [
    { id: 'T1021', name: 'Remote Services', sub: [{ id: 'T1021.001', name: 'Remote Desktop Protocol' }, { id: 'T1021.004', name: 'SSH' }] },
    { id: 'T1570', name: 'Lateral Tool Transfer', sub: [] },
  ]},
  { id: 'TA0009', name: 'Collection', color: '#ec4899', techniques: [
    { id: 'T1005', name: 'Data from Local System', sub: [] },
    { id: 'T1213', name: 'Data from Information Repositories', sub: [] },
  ]},
  { id: 'TA0011', name: 'Command and Control', color: '#ef4444', techniques: [
    { id: 'T1071', name: 'Application Layer Protocol', sub: [{ id: 'T1071.001', name: 'Web Protocols' }, { id: 'T1071.004', name: 'DNS' }] },
    { id: 'T1041', name: 'Exfiltration Over C2 Channel', sub: [] },
    { id: 'T1573', name: 'Encrypted Channel', sub: [] },
  ]},
  { id: 'TA0010', name: 'Exfiltration', color: '#f43f5e', techniques: [
    { id: 'T1048', name: 'Exfiltration Over Alternative Protocol', sub: [] },
    { id: 'T1041', name: 'Exfiltration Over C2 Channel', sub: [] },
  ]},
  { id: 'TA0040', name: 'Impact', color: '#dc2626', techniques: [
    { id: 'T1486', name: 'Data Encrypted for Impact', sub: [] },
    { id: 'T1490', name: 'Inhibit System Recovery', sub: [] },
    { id: 'T1489', name: 'Service Stop', sub: [] },
  ]},
];

// Map correlation rules to MITRE techniques
const RULE_TO_TECHNIQUE: Record<string, string[]> = {
  'rule-001': ['T1595.001', 'T1046'],       // Port scan
  'rule-002': ['T1110.001', 'T1021.004'],    // SSH brute force
  'rule-003': ['T1110.001', 'T1021.001'],    // RDP brute force
  'rule-004': ['T1071'],                      // Known malicious IP
  'rule-005': ['T1573', 'T1071'],            // TOR
  'rule-006': ['T1071.004', 'T1048'],        // DNS abuse
  'rule-007': ['T1071.001', 'T1041'],        // C2 beacon
  'rule-008': ['T1048', 'T1041'],            // Data exfil
};

export default function MitreMatrix() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [expandedTactic, setExpandedTactic] = useState<string | null>(null);
  const [selectedTechnique, setSelectedTechnique] = useState<any>(null);

  useEffect(() => {
    api.getAlerts({ limit: '500' }).then(r => setAlerts(r.alerts)).catch(() => {});
    api.getCorrelationStats().then(setStats).catch(() => {});
  }, []);

  // Build hit map: technique ID -> count
  const hitMap = new Map<string, number>();
  alerts.forEach(alert => {
    const techniques = RULE_TO_TECHNIQUE[alert.ruleId] || [];
    techniques.forEach(t => hitMap.set(t, (hitMap.get(t) || 0) + 1));
  });

  const totalHits = Array.from(hitMap.values()).reduce((a, b) => a + b, 0);
  const techniquesHit = hitMap.size;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">MITRE ATT&CK Matrix</h1>
          <p className="text-soc-muted text-sm">Enterprise tactics and techniques — mapped from real alerts</p>
        </div>
        <div className="flex gap-3">
          <div className="card-compact text-xs flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-400" />
            <span>{techniquesHit} techniques detected</span>
          </div>
          <div className="card-compact text-xs flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span>{totalHits} total hits</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-soc-muted">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-white/5 border border-soc-border" /> No hits</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/30" /> 1-2 hits</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-orange-500/30 border border-orange-500/40" /> 3-5 hits</div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-500/40 border border-red-500/50" /> 5+ hits</div>
      </div>

      {/* Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {ATTACK_MATRIX.map(tactic => {
          const tacticHits = tactic.techniques.reduce((sum, t) => {
            let count = hitMap.get(t.id) || 0;
            t.sub.forEach(s => count += hitMap.get(s.id) || 0);
            return sum + count;
          }, 0);
          const isExpanded = expandedTactic === tactic.id;

          return (
            <div key={tactic.id} className="card p-0 overflow-hidden">
              {/* Tactic header */}
              <button onClick={() => setExpandedTactic(isExpanded ? null : tactic.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-8 rounded-full" style={{ backgroundColor: tactic.color }} />
                  <div className="text-left">
                    <p className="text-sm font-semibold">{tactic.name}</p>
                    <p className="text-[10px] text-soc-muted">{tactic.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {tacticHits > 0 && (
                    <span className="badge bg-red-500/20 text-red-400 text-[10px]">{tacticHits} hits</span>
                  )}
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-soc-muted" /> : <ChevronRight className="w-4 h-4 text-soc-muted" />}
                </div>
              </button>

              {/* Techniques */}
              {isExpanded && (
                <div className="border-t border-soc-border">
                  {tactic.techniques.map(tech => {
                    let hits = hitMap.get(tech.id) || 0;
                    tech.sub.forEach(s => hits += hitMap.get(s.id) || 0);
                    const bg = hits === 0 ? '' : hits <= 2 ? 'bg-yellow-500/10' : hits <= 5 ? 'bg-orange-500/15' : 'bg-red-500/20';

                    return (
                      <div key={tech.id}>
                        <button onClick={() => setSelectedTechnique(selectedTechnique?.id === tech.id ? null : tech)}
                          className={`w-full flex items-center justify-between px-4 py-2 text-xs hover:bg-white/[0.03] transition-colors ${bg}`}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-soc-muted w-16">{tech.id}</span>
                            <span>{tech.name}</span>
                          </div>
                          {hits > 0 && <span className="font-mono text-red-400">{hits}</span>}
                        </button>
                        {/* Sub-techniques */}
                        {selectedTechnique?.id === tech.id && tech.sub.length > 0 && (
                          <div className="bg-white/[0.02]">
                            {tech.sub.map(sub => {
                              const subHits = hitMap.get(sub.id) || 0;
                              return (
                                <div key={sub.id} className="flex items-center justify-between px-6 py-1.5 text-[11px] border-t border-soc-border/30">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-soc-muted/60">{sub.id}</span>
                                    <span className="text-soc-muted">{sub.name}</span>
                                  </div>
                                  {subHits > 0 && <span className="font-mono text-red-400">{subHits}</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reference link */}
      <div className="text-center">
        <a href="https://attack.mitre.org/matrices/enterprise/" target="_blank" rel="noopener noreferrer"
          className="text-xs text-brand-400 hover:text-brand-300 inline-flex items-center gap-1">
          View full MITRE ATT&CK Enterprise Matrix <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
