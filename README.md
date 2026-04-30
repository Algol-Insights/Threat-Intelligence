# Chengeto — Cyber Threat Intelligence Platform

<p align="center">
  <strong>Africa's first AI-powered SOC platform — built for compliance, priced for reality</strong><br>
  <em>by Algol Cyber Security · a subsidiary of Algol Insights</em>
</p>

---

## What is Chengeto?

Chengeto (Shona: "protection") is a unified SOC, SIEM, and CTI platform that combines real-time threat detection, AI-powered analysis, and CDPA 2021 compliance tracking in a single deployable stack. It was designed specifically for African enterprises that need enterprise-grade security monitoring without enterprise-grade pricing.

**Key differentiators:**

- **CDPA 2021 compliance engine** — automatically classifies security events against Zimbabwe's Cyber and Data Protection Act, tracks 72-hour breach notification deadlines, and generates compliance reports for POTRAZ submission
- **AI threat analysis with multi-model fallback** — Gemini Flash → DeepSeek → Groq → offline profiles, ensuring analysis works even without internet
- **Africa-first threat intelligence** — built-in SADC regional context, SilverTerrier profiling, CERT.ZW advisory correlation, and critical infrastructure awareness for Zimbabwe
- **90% cost reduction** — runs on a single Linux VM with Docker, no per-GB pricing, no cloud dependency

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│ Frontend — React 19 + TypeScript + Tailwind · nginx · :3000  │
│                                                              │
│  Dashboard · Events · CDPA Compliance · Incidents · Network  │
│  Threat Intel · MITRE ATT&CK · Reports · Settings            │
└──────────────┬──────────────────────────┬────────────────────┘
               │ REST + JWT               │ WebSocket
┌──────────────▼──────────────────────────▼────────────────────┐
│ Backend — Node.js + Express · :8080                          │
│                                                              │
│  Auth (JWT+RBAC) · Correlation Engine · CDPA Engine          │
│  AI Analysis · Africa Threat Intel · SOAR Playbooks          │
│  Incident CRUD · IOC Watchlist · Threat Feed Sync            │
│                                                              │
│  Syslog UDP :1514 ← UFW / Wazuh / osquery                   │
│  Nmap network scanner · SQLite persistence                   │
└──────────────────────────────────────────────────────────────┘
```

---

## Features

### Core SOC/SIEM
- Real-time log ingestion via UDP syslog (port 1514)
- Multi-format parsing: UFW firewall, Wazuh JSON, osquery JSON, generic syslog
- Correlation engine with 8 detection rules (port scan, brute force, C2 beacon, data exfiltration, etc.)
- Automatic SOAR response: UFW IP blocking on critical correlation matches
- Live WebSocket streaming to all connected analyst dashboards

### AI Threat Analysis
- Multi-model fallback chain: Gemini 2.5 Flash → DeepSeek R1 → Groq Llama → offline profiles
- Structured output: threat name, severity, CVE, MITRE ATT&CK TTPs, threat actor DNA, predictive analysis
- Zimbabwe/CDPA-contextual compliance impact assessment on every analysis
- 8 offline fallback profiles for air-gapped deployment

### CDPA 2021 Compliance
- Automatic event classification against CDPA sections (3, 15, 16, 29, 34)
- 72-hour breach notification countdown with POTRAZ deadline tracking
- RBZ directive mapping for financial sector entities
- Compliance score calculation and trend tracking
- One-click compliance report export (JSON)

### Network Intelligence
- Live network discovery via nmap (-sV -O scan)
- Device type classification, OS detection, service enumeration
- Insecure service flagging (unencrypted HTTP, FTP, Telnet)
- AI-powered remediation suggestions per service

### Incident Management
- Full lifecycle: open → triaged → contained → resolved → closed
- CDPA-aware incidents with automatic 72-hour deadline
- Incident timeline with audit trail
- DFIR case management with evidence and chain of custody

### Additional Capabilities
- IOC watchlist with real-time hit detection on ingested logs
- Threat feed integration (ThreatFox, AbuseIPDB, URLhaus, Feodo Tracker, Emerging Threats)
- MITRE ATT&CK matrix with live technique hit overlays
- Report generation (compliance, events, incidents, executive briefing)
- Africa-first threat intelligence (SADC campaigns, regional actor profiles)
- JWT authentication with RBAC (admin / analyst / viewer)
- Audit trail for all user actions
- SQLite persistence (data survives restarts)

---

## Quick Start

### Prerequisites
- Docker and Docker Compose
- (Optional) Gemini API key for AI analysis — [get free key](https://aistudio.google.com/apikey)

### Deploy

```bash
git clone https://github.com/Algol-Insights/Threat-Intelligence.git
cd Threat-Intelligence

# Configure
cp .env.example .env
# Edit .env — add your GEMINI_API_KEY

# Launch
docker compose up --build -d

# Open dashboard
open http://localhost:3000
```

### Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | Chengeto@2026! |
| Analyst | analyst | Analyst@2026! |
| Viewer | viewer | Viewer@2026! |

### Send Test Events

```bash
# From any Linux host:
echo "[UFW BLOCK] SRC=185.220.101.8 DST=10.0.0.1 PROTO=TCP DPT=22" | nc -u localhost 1514

# Or from PowerShell:
$udp = New-Object System.Net.Sockets.UdpClient
$msg = [Text.Encoding]::UTF8.GetBytes("[UFW BLOCK] SRC=185.220.101.8 DST=10.0.0.1 PROTO=TCP DPT=22")
$udp.Send($msg, $msg.Length, "localhost", 1514)
$udp.Close()
```

### Send Real Firewall Logs

```bash
# rsyslog config on any Linux host:
*.* @<chengeto-host>:1514
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS | Dashboard UI |
| Backend | Node.js 20, Express, ws | API + WebSocket server |
| AI | Gemini 2.5 Flash / DeepSeek / Groq | Threat analysis |
| Database | SQLite (better-sqlite3) | Persistent storage |
| Threat Intel | ThreatFox, AbuseIPDB, africaThreatIntel | Multi-source enrichment |
| Log Ingestion | UDP syslog (dgram) | UFW / Wazuh / osquery |
| Network Scan | Nmap (child_process + XML parse) | Device discovery |
| Auth | JWT (jsonwebtoken), bcrypt | RBAC + session management |
| Deployment | Docker Compose, nginx | Containerised |

---

## API Reference

All endpoints under `/api/v1/`. Authentication via `Authorization: Bearer <token>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/login | Authenticate and receive JWT |
| GET | /auth/me | Current user profile |
| GET | /events | Query persisted events (filterable) |
| GET | /events/stats | Event statistics and hourly breakdown |
| GET | /events/alerts | Query correlation alerts |
| POST | /analyze/threat | AI threat analysis for a log event |
| POST | /analyze/remediation | AI remediation for insecure service |
| GET | /incidents | List incidents |
| POST | /incidents | Create incident |
| PATCH | /incidents/:id/status | Update incident lifecycle status |
| GET | /compliance/metrics | CDPA compliance dashboard metrics |
| GET | /compliance/report | Generate CDPA compliance report |
| GET | /ioc | List IOC watchlist entries |
| POST | /ioc | Add IOC to watchlist |
| POST | /ioc/bulk | Bulk import IOCs |
| GET | /feeds | List threat feeds |
| POST | /feeds/:id/sync | Sync a threat feed |
| GET | /correlation/stats | Correlation engine statistics |
| GET | /metrics | Live platform metrics |
| GET | /health | Health check |

---

## Project Structure

```
├── backend/
│   ├── server.js              # Express + WebSocket + syslog + nmap
│   ├── db.js                  # SQLite schema + migrations + seed
│   ├── auth.js                # JWT + bcrypt + RBAC
│   ├── aiService.js           # Multi-model AI fallback chain
│   ├── correlationEngine.js   # Real-time rule evaluation
│   ├── cdpaEngine.js          # CDPA 2021 compliance classification
│   ├── africaThreatIntel.js   # Regional threat enrichment
│   ├── parsers.js             # UFW + Wazuh + osquery + generic
│   ├── routes/                # API route modules
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/             # Dashboard, Events, Compliance, etc.
│   │   ├── components/        # Shared UI components
│   │   ├── services/          # API client + WebSocket
│   │   └── contexts/          # Auth state
│   ├── nginx.conf
│   └── Dockerfile
├── demo/                      # Attack scenario runner
├── docker-compose.yml
└── .env.example
```

---

## Research Contributions

1. **CDPA 2021 Compliance Engine** — First automated system mapping security events to Zimbabwe's data protection legislation
2. **Multi-Model AI Fallback Chain** — Graceful degradation from cloud AI to offline profiles for unreliable connectivity environments
3. **Africa-First Threat Intelligence** — Built-in SADC regional context, actor profiles, and critical infrastructure awareness
4. **Adaptive Severity Scoring** — Threat prioritisation adjusted by organisational sector and geographic context
5. **Unified SOC Pipeline** — Single platform replacing SIEM + SOAR + CTI toolsets at 90% cost reduction

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| GEMINI_API_KEY | Recommended | Google Gemini API key for AI analysis |
| DEEPSEEK_API_KEY | Optional | DeepSeek fallback |
| GROQ_API_KEY | Optional | Groq fallback |
| JWT_SECRET | Yes (has default) | JWT signing secret |
| ADMIN_PASSWORD | Yes (has default) | Bootstrap admin password |
| ORG_SECTOR | Optional | Organisation sector for CDPA context (financial/government/telecom/healthcare/education/general) |

---

## License

Proprietary — Algol Cyber Security © 2026. All rights reserved.

---

<p align="center">
  <strong>Chengeto</strong> — Protection for Africa's digital future<br>
  <em>Built by Algol Cyber Security · Presented at ZITF 2026 Research Week</em>
</p>
