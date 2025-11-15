
const MOCK_LOG_STREAM = [
  {
    sourceIp: '203.0.113.88',
    destinationIp: '10.0.0.5',
    destinationPort: 8080,
    protocol: 'TCP',
    action: 'BLOCKED',
    description: 'Outbound connection to TOR entry node',
  },
  {
    sourceIp: '10.0.1.25',
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
    sourceIp: '10.0.1.58',
    destinationIp: '203.0.113.111',
    destinationPort: 443,
    protocol: 'TCP',
    action: 'BLOCKED',
    description: 'Blocked access to phishing site: bank-of-security.com',
  },
];

const MOCK_NETWORK_DEVICES = [
  {
    id: 'dev-001',
    ipAddress: '10.0.1.10',
    hostname: 'WEBSRV-01',
    macAddress: '0A:1B:2C:3D:4E:5F',
    type: 'Server',
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
    type: 'Workstation',
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
    type: 'Mobile',
    status: 'Online',
    services: [],
  },
  {
    id: 'dev-004',
    ipAddress: '10.0.2.5',
    hostname: 'DBSERVER-PROD',
    macAddress: '11:22:33:44:55:66',
    type: 'Server',
    status: 'Online',
    services: [
      { id: 'srv-005', name: 'MySQL', port: 3306, protocol: 'TCP', version: '5.7.21', status: 'Running', isInsecure: false },
      { id: 'srv-006', name: 'FTP', port: 21, protocol: 'TCP', version: 'vsftpd 3.0.3', status: 'Running', isInsecure: true, insecurityReason: 'Unencrypted file transfer' },
    ],
  },
];

module.exports = { MOCK_LOG_STREAM, MOCK_NETWORK_DEVICES };
