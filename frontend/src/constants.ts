import { FirewallLog } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// ORIGINAL DATA — preserved exactly from your constants.ts
// ═══════════════════════════════════════════════════════════════════════════

export const MOCK_LOGS: FirewallLog[] = [
  {
    id: 'log-001',
    timestamp: '2023-10-27T14:35:11Z',
    sourceIp: '198.51.100.54',
    destinationIp: '203.0.113.10',
    destinationPort: 22,
    protocol: 'TCP',
    action: 'BLOCKED',
    description: 'Multiple failed SSH login attempts',
  },
  {
    id: 'log-002',
    timestamp: '2023-10-27T14:36:02Z',
    sourceIp: '192.0.2.14',
    destinationIp: '203.0.113.15',
    destinationPort: 4444,
    protocol: 'TCP',
    action: 'BLOCKED',
    description: 'Connection attempt to known C2 port',
  },
  {
    id: 'log-003',
    timestamp: '2023-10-27T14:38:20Z',
    sourceIp: '198.51.100.89',
    destinationIp: '203.0.113.22',
    destinationPort: 80,
    protocol: 'TCP',
    action: 'BLOCKED',
    description: 'HTTP GET request with SQL injection pattern',
  },
  {
    id: 'log-004',
    timestamp: '2023-10-27T14:39:05Z',
    sourceIp: '192.0.2.77',
    destinationIp: '203.0.113.10',
    destinationPort: 53,
    protocol: 'UDP',
    action: 'BLOCKED',
    description: 'Anomalous DNS query (possible tunneling)',
  },
];

export const IP_GEOLOCATIONS: Record<string, { lat: number; lng: number; city: string; }> = {
  // Original entries
  '198.51.100.54': { lat: 34.0522, lng: -118.2437, city: 'Los Angeles, USA' },
  '192.0.2.14': { lat: 52.3676, lng: 4.9041, city: 'Amsterdam, NL' },
  '198.51.100.89': { lat: 51.5074, lng: -0.1278, city: 'London, UK' },
  '192.0.2.77': { lat: 35.6895, lng: 139.6917, city: 'Tokyo, JP' },
  '198.51.100.112': { lat: 40.7128, lng: -74.0060, city: 'New York, USA' },
  '192.0.2.199': { lat: -33.8688, lng: 151.2093, city: 'Sydney, AU' },
  '198.51.100.201': { lat: 48.8566, lng: 2.3522, city: 'Paris, FR' },
  '203.0.113.88': { lat: 55.7558, lng: 37.6173, city: 'Moscow, RU' },
  '192.0.2.210': { lat: 39.9042, lng: 116.4074, city: 'Beijing, CN' },
  '203.0.113.42': { lat: 28.6139, lng: 77.2090, city: 'New Delhi, IN' },
  '203.0.113.111': { lat: 4.86, lng: -1.88, city: 'Axim, GH' },
  // NEW: Zimbabwe and SADC region
  '196.43.100.10': { lat: -17.8292, lng: 31.0522, city: 'Harare, ZW' },
  '196.43.100.22': { lat: -20.1500, lng: 28.5833, city: 'Bulawayo, ZW' },
  '196.43.100.33': { lat: -20.0654, lng: 30.8327, city: 'Masvingo, ZW' },
  '41.191.200.5': { lat: -1.2921, lng: 36.8219, city: 'Nairobi, KE' },
  '41.79.68.10': { lat: -15.4167, lng: 28.2833, city: 'Lusaka, ZM' },
  '41.222.196.20': { lat: -24.6282, lng: 25.9231, city: 'Gaborone, BW' },
  '41.76.108.15': { lat: -25.9655, lng: 32.5832, city: 'Maputo, MZ' },
  '154.0.14.10': { lat: -33.9249, lng: 18.4241, city: 'Cape Town, ZA' },
  '154.0.14.25': { lat: -26.2041, lng: 28.0473, city: 'Johannesburg, ZA' },
  '185.220.101.8': { lat: 52.5200, lng: 13.4050, city: 'Berlin, DE (TOR exit)' },
  '45.154.255.10': { lat: 6.5244, lng: 3.3792, city: 'Lagos, NG' },
};

export const TRAINING_SCENARIO = {
  title: "The Suspicious Data Exfiltration",
  description: "An analyst observes a series of alerts over a 30-minute window. First, a high-volume of DNS queries to a non-standard domain are blocked. Minutes later, a successful TCP connection on port 53 is made to the same IP address resolved from the DNS queries. Finally, a large outbound data transfer is blocked from an internal database server to this external IP.",
  expertAnalysis: "This pattern is highly indicative of DNS Tunneling. The attacker uses DNS queries not for resolution, but to encode and exfiltrate data, bypassing standard firewall rules that might block large outbound transfers on typical HTTP/FTP ports. The successful TCP connection on port 53 (typically UDP for DNS queries) was likely the command-and-control channel. The firewall correctly blocked the final, large data transfer. This is likely a sophisticated attacker attempting data theft."
};

// ═══════════════════════════════════════════════════════════════════════════
// EXTENDED DATA — Zimbabwe/CDPA context added for Chengeto
// ═══════════════════════════════════════════════════════════════════════════

export const INDUSTRIES = [
  'Finance', 'Healthcare', 'Government', 'Retail', 'Technology', 'Energy', 'Education',
  // NEW: Zimbabwe-relevant
  'Banking', 'Insurance', 'Microfinance', 'Telecommunications', 'Mining',
  'Agriculture', 'Parastatal', 'NGO', 'Manufacturing',
];

export const COUNTRIES = [
  'USA', 'United Kingdom', 'Germany', 'Japan', 'Australia', 'Canada', 'Singapore',
  // NEW: SADC region
  'Zimbabwe', 'South Africa', 'Zambia', 'Botswana', 'Mozambique',
  'Tanzania', 'Malawi', 'Namibia', 'Kenya', 'Nigeria', 'Ghana',
];

// NEW: CDPA 2021 sections for compliance display
export const CDPA_SECTIONS = [
  { section: 'Section 3', title: 'Personal Data Processing', description: 'Definition and scope of personal data under CDPA' },
  { section: 'Section 15', title: 'Breach Notification', description: 'Mandatory notification to POTRAZ within 72 hours' },
  { section: 'Section 16', title: 'Data Subject Notification', description: 'Notification of affected individuals without undue delay' },
  { section: 'Section 29', title: 'Cross-Border Transfers', description: 'Restrictions on transfer of personal data outside Zimbabwe' },
  { section: 'Section 34', title: 'Security Safeguards', description: 'Technical and organisational security measures required' },
];

// NEW: Sector options for CDPA relevance
export const ORG_SECTORS = [
  { value: 'financial', label: 'Financial Services (RBZ regulated)' },
  { value: 'government', label: 'Government / Parastatal' },
  { value: 'telecom', label: 'Telecommunications (POTRAZ regulated)' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'general', label: 'General Enterprise' },
];

// NEW: Additional training scenarios for ZITF
export const TRAINING_SCENARIOS = [
  TRAINING_SCENARIO,
  {
    title: "CDPA Breach — Banking Sector",
    description: "A Zimbabwean bank detects an allowed connection from a known Nigerian BEC actor (SilverTerrier) to their PostgreSQL database server on port 5432. The connection lasted 4 minutes before being terminated. The database contains customer personal banking details including names, ID numbers, and account balances.",
    expertAnalysis: "This is a CDPA 2021 Section 15 mandatory reportable breach. The connection to a personal data database (port 5432) was ALLOWED, meaning data may have been accessed. The 72-hour POTRAZ notification clock started when the event was detected. As a financial institution, RBZ cybersecurity directives also require immediate reporting. The bank must: (1) Isolate the database server, (2) Conduct forensic analysis of the 4-minute session, (3) Notify POTRAZ within 72 hours, (4) Notify affected customers under Section 16, (5) Block the source IP range at the perimeter."
  },
  {
    title: "Ransomware Indicators — Government Ministry",
    description: "A government ministry in Harare detects multiple SMB (port 445) connections between internal workstations at 2:00 AM, followed by outbound HTTPS connections to an IP flagged as a LockBit C2 server. No files have been encrypted yet, but the lateral movement pattern matches known ransomware precursors.",
    expertAnalysis: "This is a pre-encryption ransomware incident — the attacker is in the lateral movement and staging phase. Immediate actions: (1) Isolate all affected workstations from the network, (2) Block the C2 IP at the firewall, (3) Verify backup integrity before any restoration attempt, (4) This is a CDPA Section 34 security incident. If the ministry processes citizen data (likely), Section 15 notification to POTRAZ is required. (5) Engage CERT.ZW for incident coordination."
  },
];

// NEW: Simple alert rules (migrated from App.tsx for reuse)
export const ALERTING_RULES = [
  { keyword: 'sql injection', message: 'High-Priority: Potential SQL Injection attack detected.' },
  { keyword: 'c2', message: 'Critical Alert: Connection to known Command & Control server detected.' },
  { keyword: 'wannacry', message: 'Critical Alert: Activity matches WannaCry ransomware patterns.' },
  { keyword: 'rdp', message: 'High-Priority: Brute-force RDP attempt detected from unusual location.' },
  { keyword: 'tor', message: 'Medium-Priority: Outbound connection to TOR network detected.' },
  // NEW
  { keyword: 'silverterrier', message: 'Critical Alert: SilverTerrier BEC campaign activity detected.' },
  { keyword: 'exfiltration', message: 'Critical Alert: Potential data exfiltration detected — CDPA Section 15 may apply.' },
  { keyword: 'brute', message: 'High-Priority: Brute-force authentication attack in progress.' },
];
