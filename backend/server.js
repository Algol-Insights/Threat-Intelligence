const { WebSocketServer } = require('ws');
const dgram = require('dgram');
const { exec } = require('child_process');
const xml2js = require('xml2js');
const ip = require('ip');
const os = require('os');

const wss = new WebSocketServer({ port: 8080 });
const clients = new Set();
const SYSLOG_PORT = 1514; // Using a non-privileged port. Forward 514 to this port on the host.

// --- Syslog Server for Log Ingestion ---
const syslogServer = dgram.createSocket('udp4');

syslogServer.on('error', (err) => {
  console.error(`Syslog server error:\n${err.stack}`);
  syslogServer.close();
});

syslogServer.on('listening', () => {
  const address = syslogServer.address();
  console.log(`Syslog server listening for UFW and other logs on ${address.address}:${address.port}`);
});

syslogServer.on('message', async (msg, rinfo) => {
  const logLine = msg.toString('utf8');
  const logObject = parseUfwLog(logLine);
  
  if (logObject) {
    // PHASE 2: Intelligence Enrichment (Placeholder)
    const enrichedLog = await enrichWithMisp(logObject);
    
    const message = JSON.stringify({ type: 'NEW_LOG', payload: enrichedLog });
    clients.forEach(client => client.send(message));

    // PHASE 3: Automated Response (Placeholder Trigger)
    // In a real SOAR implementation, after analysis, a message would be sent
    // back to the backend to trigger a response if certain conditions are met.
    // performAutomatedResponse(analysis, enrichedLog);
  }
});

syslogServer.bind(SYSLOG_PORT);


// --- Real Network Scanning ---
const SCAN_INTERVAL = 60000; // Scan every 60 seconds

function getLocalNetworkCidr() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                // Assuming a /24 subnet, which is common.
                // This is more robust than ip.cidr() in some container environments.
                const subnet = ip.subnet(net.address, '255.255.255.0');
                return subnet.cidrSubnet;
            }
        }
    }
    // Fallback for environments where os.networkInterfaces doesn't work as expected
    // or no suitable interface is found.
    console.warn("Could not determine local network CIDR automatically. Falling back to 192.168.1.0/24.");
    return '192.168.1.0/24';
}

const localNetwork = getLocalNetworkCidr();
console.log(`Targeting local network for scans: ${localNetwork}.`);

const performNetworkScan = () => {
    // nmap command to find hosts, their OS, and running services/versions. Output is XML.
    const command = `nmap -sV -O ${localNetwork} -oX -`;
    console.log(`Executing network scan: ${command}`);

    exec(command, { maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`nmap scan error: ${error.message}`);
            return;
        }
        if (stderr) {
            // nmap often prints warnings to stderr, so we log them as warnings.
            console.warn(`nmap stderr: ${stderr}`);
        }

        xml2js.parseString(stdout, (err, result) => {
            if (err) {
                console.error('Failed to parse nmap XML:', err);
                return;
            }
            const devices = parseNmapResult(result);
            const message = JSON.stringify({
                type: 'NETWORK_UPDATE',
                payload: devices
            });
            clients.forEach(client => client.send(message));
            console.log(`Scan complete. Found ${devices.length} devices.`);
        });
    });
};

// --- WebSocket Server Logic ---
let scanIntervalId = null;

wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.add(ws);
  
  // If this is the first client, start scanning.
  if (clients.size === 1) {
    console.log('First client connected, starting network scans.');
    performNetworkScan(); // Scan immediately on first connection
    scanIntervalId = setInterval(performNetworkScan, SCAN_INTERVAL);
  }

  ws.on('close', () => {
    console.log('Client disconnected');
    clients.delete(ws);
    
    // If this was the last client, stop scanning.
    if (clients.size === 0) {
      console.log('Last client disconnected, stopping network scans.');
      clearInterval(scanIntervalId);
      scanIntervalId = null;
    }
  });
});

// --- Parsers & Enrichment ---

/**
 * Parses a raw syslog line to find and structure UFW log data.
 * This is now more robust to handle syslog headers.
 * @param {string} line - The raw syslog message.
 * @returns {object|null} A structured log object or null.
 */
function parseUfwLog(line) {
  try {
    const ufwBlockMarker = '[UFW BLOCK]';
    const ufwAllowMarker = '[UFW ALLOW]';
    let contentIndex = line.indexOf(ufwBlockMarker);
    let action = 'BLOCKED';

    if (contentIndex === -1) {
        contentIndex = line.indexOf(ufwAllowMarker);
        action = 'ALLOWED';
    }
    
    if (contentIndex === -1) {
      // NOTE: This is where you would add parsers for other log types,
      // e.g., from Wazuh or osquery, by checking for their unique markers.
      return null;
    }

    const logContent = line.substring(contentIndex);
    
    const srcMatch = logContent.match(/SRC=([\d\.:a-fA-F]+)/);
    const dstMatch = logContent.match(/DST=([\d\.:a-fA-F]+)/);
    const protoMatch = logContent.match(/PROTO=(\w+)/);
    const dptMatch = logContent.match(/DPT=(\d+)/);

    if (!srcMatch || !dstMatch || !protoMatch || !dptMatch) return null;

    return {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      sourceIp: srcMatch[1],
      destinationIp: dstMatch[1],
      destinationPort: parseInt(dptMatch[1], 10),
      protocol: protoMatch[1].toUpperCase(),
      action: action,
      description: logContent.replace(ufwBlockMarker, '').trim(),
    };
  } catch (e) {
    console.error("Failed to parse log line:", line, e);
    return null;
  }
}

/**
 * Simulates MISP enrichment.
 * In a real implementation, this function would query a MISP instance
 * for indicators (IP, domain, hash) found in the log.
 * @param {object} logObject - The parsed log object.
 * @returns {Promise<object>} The log object, potentially enriched with MISP context.
 */
async function enrichWithMisp(logObject) {
    // In a real scenario, this would involve an API call to a MISP instance.
    // Here, we simulate finding intelligence for a specific indicator.
    const knownMaliciousIp = '198.51.100.89'; // An IP known for SQL injection attempts

    if (logObject.sourceIp === knownMaliciousIp) {
        console.log(`[MISP Enrichment] Found intelligence for IP: ${knownMaliciousIp}`);
        logObject.mispContext = {
            eventId: 427,
            eventName: "SQL Injection Campaign Targeting Web Servers",
            threatLevel: "High",
            tags: ["osint", "apt-C-35", "type:exploit"],
            relatedIndicators: 15,
            firstSeen: "2023-10-01T08:00:00Z",
        };
    }
    return logObject;
}

/**
 * Placeholder for automated response (SOAR).
 * In a real implementation, this function would connect to a firewall
 * or other security tool to perform an action, like blocking an IP.
 * @param {object} analysis - The AI threat analysis.
 * @param {object} log - The log that triggered the analysis.
 */
async function performAutomatedResponse(analysis, log) {
    // Trigger condition: only act on high-confidence, critical threats.
    if (analysis.severity === 'Critical' && analysis.threatActorDNA.name !== 'Unknown') {
        console.log(`CRITICAL THREAT DETECTED. Initiating automated block for IP: ${log.sourceIp}`);
        // Example:
        // const ssh = new SshClient({ host: 'firewall.example.com', ... });
        // await ssh.connect();
        // const command = `sudo ufw deny from ${log.sourceIp} to any`;
        // const result = await ssh.exec(command);
        // console.log(`Block command executed. Result: ${result.stdout}`);
        // await ssh.disconnect();
    }
}

function getDeviceType(osMatch) {
    if (!osMatch) return 'Workstation';
    const os = osMatch.toLowerCase();
    if (os.includes('linux')) return 'Server';
    if (os.includes('windows server')) return 'Server';
    if (os.includes('ios') || os.includes('android')) return 'Mobile';
    if (os.includes('windows') || os.includes('mac os')) return 'Workstation';
    return 'Workstation';
}

function parseNmapResult(nmapData) {
    if (!nmapData || !nmapData.nmaprun || !nmapData.nmaprun.host) {
        return [];
    }
    
    const hosts = nmapData.nmaprun.host;

    return hosts.map((host, index) => {
        const status = host.status[0].$.state;
        if (status !== 'up') return null;

        const addresses = host.address.reduce((acc, addr) => {
            acc[addr.$.addrtype] = addr.$.addr;
            return acc;
        }, {});
        
        const osMatch = host.os?.[0]?.osmatch?.[0]?.$?.name;

        const services = host.ports?.[0]?.port?.map((p, s_idx) => {
            if (p.state[0].$.state !== 'open') return null;
            const service = p.service?.[0]?.$ ?? {};
            const serviceName = service.name || 'Unknown';
            let reason = null;
            if (serviceName === 'http' && p.$.portid !== '443') reason = 'Unencrypted web traffic';
            if (serviceName === 'ftp') reason = 'Unencrypted file transfer';
            if (serviceName === 'telnet') reason = 'Unencrypted remote access';

            return {
                id: `srv-${index}-${s_idx}`,
                name: serviceName,
                port: parseInt(p.$.portid, 10),
                protocol: p.$.protocol.toUpperCase(),
                version: service.product || 'N/A',
                status: 'Running',
                isInsecure: !!reason,
                insecurityReason: reason || undefined
            };
        }).filter(Boolean) ?? [];
        
        return {
            id: `dev-${index}-${addresses.mac || addresses.ipv4}`,
            ipAddress: addresses.ipv4,
            hostname: host.hostnames?.[0]?.hostname?.[0]?.$?.name || addresses.ipv4,
            macAddress: addresses.mac || 'N/A',
            type: getDeviceType(osMatch),
            status: 'Online',
            services: services
        };
    }).filter(Boolean);
}


console.log('Algol CTI Backend server started on ws://localhost:8080. Ready for action.');
