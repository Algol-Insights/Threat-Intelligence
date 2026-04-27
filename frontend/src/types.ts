// ═══════════════════════════════════════════════════════════════════════════
// ORIGINAL TYPES — preserved exactly from your types.ts
// ═══════════════════════════════════════════════════════════════════════════

export interface FirewallLog {
  id: string;
  timestamp: string;
  sourceIp: string;
  destinationIp: string;
  destinationPort: number;
  protocol: 'TCP' | 'UDP' | 'ICMP';
  action: 'BLOCKED' | 'ALLOWED' | 'ALERT';
  description: string;
  // NEW: optional enrichment fields added by pipeline
  parserSource?: string;
  rawLog?: string;
  mispContext?: MISPContext;
  iocHit?: IOCEntry;
  cdpa?: CDPAClassification;
  wazuhMeta?: { ruleId: string; ruleLevel: number; ruleGroups: string[]; agentName: string; };
  osqueryMeta?: { queryName: string; osqueryAction: string; hostIdentifier: string; };
}

export enum Severity {
  Critical = 'Critical',
  High = 'High',
  Medium = 'Medium',
  Low = 'Low',
  Informational = 'Informational',
}

export interface ThreatAnalysis {
  threatName: string;
  severity: Severity;
  contextualSeverity?: Severity;
  cveId: string;
  summary: string;
  mitigation: string;
  firewallActionAnalysis: string;
  threatActorDNA: {
    name: string;
    ttps: { technique: string; id: string; }[];
    commonTools: string;
    motivation: string;
  };
  predictiveAnalysis: string;
  crossDomainCorrelation: string;
  complianceImpact: string;
  _model?: string; // NEW: which AI model produced this
}

export interface GeolocatedThreat extends FirewallLog {
  lat: number;
  lng: number;
  city: string;
}

export interface Alert {
  id: string;
  message: string;
  timestamp: string;
  logId: string;
}

export interface OrganizationalContext {
  industry: string;
  country: string;
}

// Types for Network Monitoring
export enum DeviceType {
  Server = 'Server',
  Workstation = 'Workstation',
  Mobile = 'Mobile',
}

export interface RunningService {
  id: string;
  name: string;
  port: number;
  protocol: 'TCP' | 'UDP';
  version: string;
  status: 'Running';
  isInsecure: boolean;
  insecurityReason?: string;
}

export interface NetworkDevice {
  id: string;
  ipAddress: string;
  hostname: string;
  macAddress: string;
  type: DeviceType;
  status: 'Online' | 'Offline';
  os?: string;
  services: RunningService[];
}

// ═══════════════════════════════════════════════════════════════════════════
// NEW TYPES — added for Chengeto platform features
// ═══════════════════════════════════════════════════════════════════════════

// ── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string; username: string; role: 'admin' | 'analyst' | 'viewer'; displayName: string;
}
export interface AuthState { user: User | null; token: string | null; isAuthenticated: boolean; }

// ── MISP / Threat Intel Context ──────────────────────────────────────────────
export interface MISPContext {
  threat: string; actor: string; confidence: number; certZwAdvisory?: string;
  tags?: string[];
  // Original MISP fields kept for compatibility
  eventId?: number; eventName?: string; threatLevel?: string;
  relatedIndicators?: number; firstSeen?: string;
}

// ── Correlation ──────────────────────────────────────────────────────────────
export interface CorrelationAlert {
  id: string; ruleId: string; ruleName: string; severity: Severity;
  sourceIp: string; destinationIp: string; destinationPort: number; protocol: string;
  description: string; eventCount: number; timestamp: string;
  autoRespond: boolean; respondAction?: string;
}

export interface CorrelationRule {
  id: string; name: string; description: string; condition_type: string;
  threshold: number; window_seconds: number; severity: Severity;
  enabled: boolean; match_count: number; last_match: string | null;
  auto_respond: boolean; respond_action: string | null;
}

// ── Incidents ────────────────────────────────────────────────────────────────
export interface Incident {
  id: string; title: string; description: string; severity: Severity;
  status: 'open' | 'triaged' | 'contained' | 'resolved' | 'closed';
  assignee_id?: string; source_alert_id?: string; source_correlation_rule?: string;
  cdpa_relevant: boolean; cdpa_section?: string; cdpa_deadline?: string;
  tags: string[]; created_by: string;
  created_at: string; updated_at: string; resolved_at?: string; closed_at?: string;
}

export interface IncidentTimeline {
  id: string; incident_id: string; action: string; actor_id: string;
  actor_username: string; details: string; created_at: string;
}

// ── CDPA Compliance ──────────────────────────────────────────────────────────
export interface CDPAClassification {
  cdpaRelevant: boolean;
  classification: 'personal_data_breach' | 'infrastructure_incident' | 'reportable_event' | 'informational';
  sections: string[]; severity: string; notificationRequired: boolean;
  notificationDeadline: string | null; details: string[]; riskScore: number;
}

export interface ComplianceMetrics {
  period: { days: number; since: string };
  totalEvents: number;
  byClassification: { cdpa_classification: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
  pendingNotifications: number; overdueNotifications: number;
  pendingDetails: ComplianceEvent[]; overdueDetails: ComplianceEvent[];
  recentEvents: ComplianceEvent[];
  complianceScore: number; breachCount: number;
}

export interface ComplianceEvent {
  id: string; event_id: string; source_ip: string; destination_ip: string;
  event_type: string; cdpa_section: string; cdpa_classification: string;
  severity: string; notification_required: number; notification_deadline: string;
  notification_sent: number; details: string; created_at: string;
}

// ── IOC Watchlist ────────────────────────────────────────────────────────────
export interface IOCEntry {
  id: string; type: 'ip' | 'domain' | 'hash' | 'url' | 'email';
  value: string; threat_type: string; confidence: number;
  source: string; tags: string[]; active: boolean; created_at: string;
}

// ── Threat Feeds ─────────────────────────────────────────────────────────────
export interface ThreatFeed {
  id: string; name: string; type: string; url: string; enabled: boolean;
  last_sync: string | null; ioc_count: number; status: string; error: string | null;
}

// ── Audit ────────────────────────────────────────────────────────────────────
export interface AuditEntry {
  id: string; actor_id: string; actor_username: string; action: string;
  target_type: string; target_id: string; details: string; ip_address: string;
  created_at: string;
}

// ── WebSocket messages ───────────────────────────────────────────────────────
export type WSMessageType = 'NEW_LOG' | 'CORRELATION_ALERT' | 'IOC_HIT' | 'CDPA_BREACH' | 'NETWORK_UPDATE' | 'REGIONAL_THREAT_SUMMARY' | 'CONNECTION_ACK';
export interface WSMessage { type: WSMessageType; payload: any; }
