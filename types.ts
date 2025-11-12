export interface FirewallLog {
  id: string;
  timestamp: string;
  sourceIp: string;
  destinationIp: string;
  destinationPort: number;
  protocol: 'TCP' | 'UDP' | 'ICMP';
  action: 'BLOCKED' | 'ALLOWED';
  description: string;
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
    ttps: string; // Tactics, Techniques, and Procedures
    commonTools: string;
    motivation: string;
  };
  predictiveAnalysis: string;
  crossDomainCorrelation: string;
  complianceImpact: string;
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
  services: RunningService[];
}