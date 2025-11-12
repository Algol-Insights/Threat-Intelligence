import { FirewallLog, NetworkDevice, DeviceType } from './types';

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
  {
    id: 'log-005',
    timestamp: '2023-10-27T14:40:15Z',
    sourceIp: '198.51.100.112',
    destinationIp: '203.0.113.30',
    destinationPort: 3389,
    protocol: 'TCP',
    action: 'BLOCKED',
    description: 'RDP connection attempt from non-corporate IP',
  },
  {
    id: 'log-006',
    timestamp: '2023-10-27T14:41:55Z',
    sourceIp: '203.0.113.15',
    destinationIp: '8.8.8.8',
    destinationPort: 53,
    protocol: 'UDP',
    action: 'ALLOWED',
    description: 'Standard DNS query to Google DNS',
  },
   {
    id: 'log-007',
    timestamp: '2023-10-27T14:42:31Z',
    sourceIp: '192.0.2.199',
    destinationIp: '203.0.113.12',
    destinationPort: 123,
    protocol: 'UDP',
    action: 'BLOCKED',
    description: 'NTP amplification attack attempt',
  },
   {
    id: 'log-008',
    timestamp: '2023-10-27T14:43:09Z',
    sourceIp: '198.51.100.201',
    destinationIp: '203.0.113.45',
    destinationPort: 445,
    protocol: 'TCP',
    action: 'BLOCKED',
    description: 'SMBv1 connection attempt, potential WannaCry',
  },
];

export const MOCK_LOG_STREAM: Omit<FirewallLog, 'id' | 'timestamp'>[] = [
  {
    sourceIp: '203.0.113.88',
    destinationIp: '10.0.0.5',
    destinationPort: 8080,
    protocol: 'TCP',
    action: 'BLOCKED',
    description: 'Outbound connection to TOR entry node',
  },
  {
    sourceIp: '10.0.1.25', // Internal IP
    destinationIp: '198.18.0.254',
    destinationPort: 80,
    protocol: 'TCP',
    action: 'BLOCKED',
    description: 'Blocked access to malicious URL: malware-distro.ru',
  },
  {
    sourceIp: '192.0.2.210',
    destinationIp: '10.0.0.12',
    destinationPort: 6667,
    protocol: 'TCP',
    action: 'BLOCKED',
    description: 'IRC connection detected, policy violation',
  },
  {
    sourceIp: '10.0.1.58', // Internal IP
    destinationIp: '203.0.113.111',
    destinationPort: 443,
    protocol: 'TCP',
    action: 'BLOCKED',
    description: 'Blocked access to phishing site: bank-of-security.com',
  },
];

export const IP_GEOLOCATIONS: Record<string, { lat: number; lng: number; city: string; }> = {
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
  '203.0.113.111': {lat: 4.86, lng: -1.88, city: 'Axim, GH'}
};

export const INDUSTRIES = ['Finance', 'Healthcare', 'Government', 'Retail', 'Technology', 'Energy', 'Education'];
export const COUNTRIES = ['USA', 'United Kingdom', 'Germany', 'Japan', 'Australia', 'Canada', 'Singapore'];

export const TRAINING_SCENARIO = {
    title: "The Suspicious Data Exfiltration",
    description: "An analyst observes a series of alerts over a 30-minute window. First, a high-volume of DNS queries to a non-standard domain are blocked. Minutes later, a successful TCP connection on port 53 is made to the same IP address resolved from the DNS queries. Finally, a large outbound data transfer is blocked from an internal database server to this external IP.",
    expertAnalysis: "This pattern is highly indicative of DNS Tunneling. The attacker uses DNS queries not for resolution, but to encode and exfiltrate data, bypassing standard firewall rules that might block large outbound transfers on typical HTTP/FTP ports. The successful TCP connection on port 53 (typically UDP for DNS queries) was likely the command-and-control channel. The firewall correctly blocked the final, large data transfer. This is likely a sophisticated attacker attempting data theft."
};


export const MOCK_NETWORK_DEVICES: NetworkDevice[] = [
  {
    id: 'dev-001',
    ipAddress: '10.0.1.10',
    hostname: 'WEBSRV-01',
    macAddress: '0A:1B:2C:3D:4E:5F',
    type: DeviceType.Server,
    status: 'Online',
    services: [
      { id: 'srv-001', name: 'HTTP', port: 80, protocol: 'TCP', version: 'Apache/2.4.18', status: 'Running', isInsecure: true, insecurityReason: 'Unencrypted web traffic' },
      { id: 'srv-002', name: 'SSH', port: 22, protocol: 'TCP', version: 'OpenSSH_7.2p2', status: 'Running', isInsecure: false },
    ],
  },
  {
    id: 'dev-002',
    ipAddress: '10.0.1.25',
    hostname: 'FINANCE-PC-012',
    macAddress: 'F1:E2:D3:C4:B5:A6',
    type: DeviceType.Workstation,
    status: 'Online',
    services: [
        { id: 'srv-003', name: 'SMB', port: 445, protocol: 'TCP', version: 'SMBv1', status: 'Running', isInsecure: true, insecurityReason: 'Outdated and vulnerable protocol' },
        { id: 'srv-004', name: 'RDP', port: 3389, protocol: 'TCP', version: '10.0', status: 'Running', isInsecure: false },
    ],
  },
  {
    id: 'dev-003',
    ipAddress: '10.0.1.58',
    hostname: 'CEO-iPhone',
    macAddress: 'A1:B2:C3:D4:E5:F6',
    type: DeviceType.Mobile,
    status: 'Online',
    services: [],
  },
  {
    id: 'dev-004',
    ipAddress: '10.0.2.5',
    hostname: 'DBSERVER-PROD',
    macAddress: '11:22:33:44:55:66',
    type: DeviceType.Server,
    status: 'Online',
    services: [
      { id: 'srv-005', name: 'MySQL', port: 3306, protocol: 'TCP', version: '5.7.21', status: 'Running', isInsecure: false },
      { id: 'srv-006', name: 'FTP', port: 21, protocol: 'TCP', version: 'vsftpd 3.0.3', status: 'Running', isInsecure: true, insecurityReason: 'Unencrypted file transfer' },
    ],
  },
];