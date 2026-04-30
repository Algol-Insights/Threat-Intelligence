// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION DATA ONLY — No mock events, no fake data
// Everything displayed in the UI comes from the backend API
// ═══════════════════════════════════════════════════════════════════════════

// ── IP Geolocation seed for known threat IPs (static lookup, no API needed) ─

export const IP_GEOLOCATIONS: Record<string, { lat: number; lng: number; city: string }> = {
  // Known threat source IPs with pre-seeded locations
  '198.51.100.54': { lat: 34.0522, lng: -118.2437, city: 'Los Angeles, USA' },
  '192.0.2.14': { lat: 52.3676, lng: 4.9041, city: 'Amsterdam, NL' },
  '198.51.100.89': { lat: 51.5074, lng: -0.1278, city: 'London, UK' },
  '192.0.2.77': { lat: 35.6895, lng: 139.6917, city: 'Tokyo, JP' },
  '198.51.100.112': { lat: 40.7128, lng: -74.0060, city: 'New York, USA' },
  '203.0.113.88': { lat: 55.7558, lng: 37.6173, city: 'Moscow, RU' },
  '192.0.2.210': { lat: 39.9042, lng: 116.4074, city: 'Beijing, CN' },
  '203.0.113.42': { lat: 28.6139, lng: 77.2090, city: 'New Delhi, IN' },
  // SADC region
  '196.43.100.10': { lat: -17.8292, lng: 31.0522, city: 'Harare, ZW' },
  '196.43.100.22': { lat: -20.1500, lng: 28.5833, city: 'Bulawayo, ZW' },
  '41.191.200.5': { lat: -1.2921, lng: 36.8219, city: 'Nairobi, KE' },
  '41.79.68.10': { lat: -15.4167, lng: 28.2833, city: 'Lusaka, ZM' },
  '41.222.196.20': { lat: -24.6282, lng: 25.9231, city: 'Gaborone, BW' },
  '154.0.14.10': { lat: -33.9249, lng: 18.4241, city: 'Cape Town, ZA' },
  '154.0.14.25': { lat: -26.2041, lng: 28.0473, city: 'Johannesburg, ZA' },
  // Known threat infrastructure
  '185.220.101.8': { lat: 52.5200, lng: 13.4050, city: 'Berlin, DE (TOR exit)' },
  '45.154.255.10': { lat: 6.5244, lng: 3.3792, city: 'Lagos, NG' },
};

// ── Industry and country options for organizational context ─────────────────

export const INDUSTRIES = [
  'Banking', 'Insurance', 'Microfinance', 'Telecommunications', 'Government',
  'Parastatal', 'Healthcare', 'Education', 'Mining', 'Agriculture',
  'Manufacturing', 'Retail', 'Technology', 'Energy', 'NGO',
];

export const COUNTRIES = [
  'Zimbabwe', 'South Africa', 'Zambia', 'Botswana', 'Mozambique',
  'Tanzania', 'Malawi', 'Namibia', 'Kenya', 'Nigeria', 'Ghana',
  'USA', 'United Kingdom', 'Germany', 'Japan', 'Australia',
];

// ── CDPA 2021 sections reference ────────────────────────────────────────────

export const CDPA_SECTIONS = [
  { section: 'Section 3', title: 'Personal Data Processing', description: 'Definition and scope of personal data under CDPA' },
  { section: 'Section 15', title: 'Breach Notification', description: 'Mandatory notification to POTRAZ within 72 hours' },
  { section: 'Section 16', title: 'Data Subject Notification', description: 'Notification of affected individuals without undue delay' },
  { section: 'Section 29', title: 'Cross-Border Transfers', description: 'Restrictions on transfer of personal data outside Zimbabwe' },
  { section: 'Section 34', title: 'Security Safeguards', description: 'Technical and organisational security measures required' },
];

// ── Organizational sector options ───────────────────────────────────────────

export const ORG_SECTORS = [
  { value: 'financial', label: 'Financial Services (RBZ regulated)' },
  { value: 'government', label: 'Government / Parastatal' },
  { value: 'telecom', label: 'Telecommunications (POTRAZ regulated)' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'general', label: 'General Enterprise' },
];

// ── Training scenarios (real educational content, not mock data) ─────────────

export const TRAINING_SCENARIOS = [
  {
    title: "DNS Tunneling and Data Exfiltration",
    description: "An analyst observes a series of alerts over a 30-minute window. First, a high-volume of DNS queries to a non-standard domain are blocked. Minutes later, a successful TCP connection on port 53 is made to the same IP address resolved from the DNS queries. Finally, a large outbound data transfer is blocked from an internal database server to this external IP.",
    expertAnalysis: "This pattern is highly indicative of DNS Tunneling. The attacker uses DNS queries not for resolution, but to encode and exfiltrate data, bypassing standard firewall rules. The successful TCP connection on port 53 (typically UDP) was likely the C2 channel. The firewall correctly blocked the final data transfer. CDPA 2021 Section 15 applies if personal data was involved."
  },
  {
    title: "CDPA Breach — Banking Sector",
    description: "A Zimbabwean bank detects an allowed connection from a known Nigerian BEC actor (SilverTerrier) to their PostgreSQL database server on port 5432. The connection lasted 4 minutes before being terminated. The database contains customer personal banking details including names, ID numbers, and account balances.",
    expertAnalysis: "This is a CDPA 2021 Section 15 mandatory reportable breach. The connection to a personal data database (port 5432) was ALLOWED, meaning data may have been accessed. The 72-hour POTRAZ notification clock started at detection. As a financial institution, RBZ cybersecurity directives also require immediate reporting. Actions: (1) Isolate database server, (2) Forensic analysis of the 4-minute session, (3) Notify POTRAZ within 72 hours, (4) Notify affected customers under Section 16, (5) Block the source IP range."
  },
  {
    title: "Ransomware Indicators — Government Ministry",
    description: "A government ministry in Harare detects multiple SMB (port 445) connections between internal workstations at 2:00 AM, followed by outbound HTTPS connections to an IP flagged as a LockBit C2 server. No files have been encrypted yet, but the lateral movement pattern matches known ransomware precursors.",
    expertAnalysis: "This is a pre-encryption ransomware incident — the attacker is in lateral movement and staging phase. Immediate actions: (1) Isolate affected workstations, (2) Block C2 IP at firewall, (3) Verify backup integrity, (4) CDPA Section 34 security incident. If citizen data is processed (likely), Section 15 notification required. (5) Engage CERT.ZW for coordination."
  },
];

// Legacy export for backwards compatibility with TrainingScenario component
export const TRAINING_SCENARIO = TRAINING_SCENARIOS[0];
