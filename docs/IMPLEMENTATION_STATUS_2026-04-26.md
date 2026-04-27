# Chengeto CTI Platform - Implementation Documentation

Date: 2026-04-26  
Repository: Threat-Intelligence  
Branch: main

Related delivery roadmap:

- `EXECUTION_PLAN_2026-Q2-Q3.md`

## 1. Scope of this document

This document is a technical as-built review of the current system state in code.
It covers:

- What the system currently does
- How each subsystem works
- What is partially implemented or still missing
- A prioritized backlog for completion and production hardening


## 2. System overview

The platform is a full-stack SOC/SIEM/SOAR/CTI dashboard with:

- Frontend: React + TypeScript + Vite, served by nginx
- Backend: Node.js + Express + ws (WebSocket)
- Ingestion: UDP syslog listener on port 1514
- API + WebSocket: port 8080
- Deployment: docker compose, frontend exposed on port 3000

Primary runtime flow:

1. Logs arrive via UDP syslog.
2. Backend parses log format (UFW, Wazuh JSON, osquery JSON).
3. Log is enriched with Africa/Zimbabwe context and threat metadata.
4. Correlation rules run against a sliding event window.
5. Alerts and log updates stream to UI over WebSocket.
6. Analysts can trigger AI analysis and SOAR actions from the UI.


## 3. What is implemented

### 3.1 Ingestion and parsing

Implemented:

- UDP syslog server on 1514/udp
- Parser support for:
  - UFW logs ([UFW BLOCK], [UFW ALLOW])
  - Wazuh JSON events
  - osquery JSON socket/process events
- Normalized log object generation with:
  - source IP
  - destination IP
  - destination port
  - protocol
  - action (BLOCKED/ALLOWED)
  - parser source

How it works:

- `backend/server.js` listens for syslog datagrams.
- `parseSyslog()` dispatches to `parseUfwLog()`, `parseWazuhLog()`, or `parseOsqueryLog()`.
- Successful parses are broadcast to all connected clients as `NEW_LOG`.


### 3.2 Threat intel enrichment

Implemented:

- Static regional enrichment table in `backend/africaThreatIntel.js`
- Enrichment attaches:
  - actor/threat tags
  - confidence
  - campaign references
  - critical infrastructure targeting hints
  - high-risk port context
- Best-effort ThreatFox refresh at startup and every 6 hours

How it works:

- `enrichWithAfricaThreatIntel()` enriches each parsed log before correlation.
- Known malicious source IPs attach a `mispContext` object.
- Destination prefix checks flag critical Zimbabwe infrastructure ranges.
- Port checks attach CDPA-related risk context.


### 3.3 Correlation engine

Implemented:

- Sliding window correlation with per-source event memory
- Rules currently firing in code:
  - rule-001: port scan in 10-second window
  - rule-003: brute force pattern on high-risk ports
  - rule-004: known malicious IP intel hit
  - rule-005: TOR network involvement
  - rule-009: high-volume blocked DNS activity
- Rule match counters and last-match timestamps

How it works:

- `backend/correlationEngine.js` keeps per-source event windows (120 seconds).
- `evaluateRules()` is invoked for each ingested log.
- On match, backend emits `CORRELATION_ALERT` over WebSocket.
- Rule stats are available via `GET /api/correlation/stats`.


### 3.4 SOAR and playbook execution

Implemented:

- Automatic UFW block on critical correlation hits in backend auto-response path
- Playbook execution endpoint: `POST /api/playbooks/execute`
- Action handling in executor for:
  - block_ip
  - send_alert
  - create_incident (event broadcast)
  - enrich_ioc (best-effort dispatch)
  - quarantine_host (queued/event only)
  - update_firewall (queued/event only)
  - notify_email (logged only)
  - run_script (logged only)

How it works:

- Frontend playbooks tab triggers backend executor with ordered action list.
- Backend returns per-action execution result and duration.
- UI stores execution history and can auto-create an incident locally.


### 3.5 AI threat analysis

Implemented:

- Backend proxy to DeepSeek R1 (`deepseek-reasoner`) so API key stays server-side
- Threat analysis route: `POST /api/analyze/threat`
- Remediation route: `POST /api/analyze/remediation`
- Fallback profiles when API is unavailable/auth/billing fails

How it works:

- Frontend selects a log and calls `analyzeThreat()`.
- Backend builds a structured prompt and calls DeepSeek API.
- Response is parsed into structured threat analysis JSON.
- On failure, backend returns deterministic fallback analysis/remediation markdown.


### 3.6 Authentication, RBAC, MFA, audit

Implemented:

- JWT-based auth with 8-hour expiry
- Roles: viewer, analyst, admin
- Role guards in UI and API middleware (`requireRole`)
- TOTP MFA setup/confirm/disable flow
- Audit event ingestion route and retrieval route

How it works:

- Login route validates bcrypt password and optional MFA token.
- JWT is stored client-side and attached to API requests.
- Audit events are created in frontend and posted to backend.
- Backend stores last 1000 audit entries in memory.


### 3.7 Incident and DFIR

Implemented:

- Incident lifecycle UI in `IncidentManager`
- Playbooks, Audit Trail, and DFIR available as tabs under incidents view
- DFIR backend routes for case CRUD, evidence, timeline, summary
- Chain-of-custody entries are attached to evidence records

How it works:

- Incident records are managed in frontend context and local storage.
- DFIR cases are managed via backend REST routes.
- DFIR status, timeline, and evidence updates happen live through API calls.


### 3.8 Threat feeds and IOC watchlist

Implemented:

- Threat feed management UI with sync controls
- Backend feed sync for AbuseIPDB, OTX, ThreatFox, MalwareBazaar, URLhaus, Feodo, Blocklist.de, Emerging Threats, MISP
- IOC watchlist page and backend sync route for IP set (`/api/ioc/sync`)
- IOC hit detection in ingestion path and WS event `IOC_HIT`

How it works:

- UI sends feed sync request with `feedType`.
- Backend fetches feed and returns IOC count.
- IOC watchlist IPs are stored in in-memory Set in backend and checked per ingested event.


### 3.9 Network discovery and remediation

Implemented:

- Automatic network scan using nmap when first WS client connects
- Repeat scanning on configurable interval
- Device model extraction from nmap XML
- Insecure service tagging (e.g., HTTP non-443, FTP, Telnet)
- AI remediation request flow for selected network service

How it works:

- Backend runs `nmap -sV -O` on local subnet.
- Results are parsed and emitted as `NETWORK_UPDATE`.
- Frontend displays network inventory and requests remediation text via AI route.


### 3.10 Frontend UX and routing

Implemented routes:

- /dashboard
- /threats
- /network
- /mitre
- /reports
- /admin
- /incidents
- /rules
- /login

Also implemented as nested tabs/components:

- Threat Feeds
- IOC Watchlist
- Playbooks
- Audit Trail
- DFIR Cases


### 3.11 Containerization and runtime

Implemented:

- Multi-service docker compose setup
- Frontend nginx reverse proxy for:
  - `/api/*` to backend
  - `/ws` WebSocket upgrade to backend
- Backend health check endpoint used by compose dependency condition


## 4. Current data persistence model

This is important for accuracy:

- Backend persistence is currently in-memory for several domains:
  - auth users list
  - audit log
  - DFIR cases
  - IOC watchlist Set
  - runtime config
  - correlation windows and stats
- Frontend stores state in browser local storage for:
  - JWT token
  - audit cache
  - incidents
  - notifications
  - command center config copy

Implication:

- Data resets on backend restart for in-memory backend stores.
- Data is browser-local for several user-facing entities and is not multi-user synchronized by default.


## 5. Known implemented-but-partial areas

1. SOAR action coverage is partial.
   - `block_ip` is real for UFW.
   - `notify_email`, `run_script`, `quarantine_host`, and parts of `update_firewall` are currently logged/queued, not fully integrated end-to-end.

2. Feed pipeline has placeholder behavior for custom feeds.
   - Adding a custom feed in UI currently syncs using ThreatFox proxy behavior rather than parsing arbitrary custom URLs.

3. Runtime config is not fully durable.
   - Config can be saved from UI and pushed to backend runtime, but no persistent backend datastore exists.

4. Security UI has aspirational indicators.
   - Some security/compliance status labels are dashboard indicators, not externally verified controls.


## 6. What is left (prioritized backlog)

### P0 - Production readiness (high priority)

1. Add durable backend persistence.
   - Introduce PostgreSQL (or equivalent) for users, audit, incidents, DFIR, IOC watchlist, playbook history, runtime config.

2. Replace hardcoded/default credentials and secrets.
   - Remove default account passwords from code and enforce bootstrap secret management.

3. Implement real secret handling.
   - Move API keys and auth secrets to managed secret store/environment-only with rotation strategy.

4. Complete SOAR integrations.
   - Implement real SMTP/email sending, script execution safety model, endpoint isolation connector, and firewall vendor adapters with audit confirmation.

5. Add test suite and CI gate.
   - Backend unit/integration tests, parser tests, route authorization tests, smoke tests in compose.


### P1 - Reliability and security hardening

1. Centralized error handling and structured logging.
2. Rate limiting and abuse protection on auth/analyze/sync routes.
3. Stronger input validation and schema checks for all route bodies.
4. Improve audit integrity model (append-only + tamper evidence).
5. Add reconnect and offline recovery strategy for WebSocket stream state.


### P1 - Product completeness

1. Real custom feed ingestion.
   - Parse user-provided MISP/STIX/CSV URLs directly.

2. Full MISP bi-directional integration.
   - Import and export with de-duplication and confidence merge.

3. Multi-user incident synchronization.
   - Move incident state from local storage to backend DB and add concurrent edit strategy.

4. Expand correlation rule set and admin rule authoring with backend validation.


### P2 - Codebase and documentation quality

1. Resolve duplicated source tree pattern.
   - There are parallel top-level and `frontend/` trees with mirrored files, which increases drift risk.

2. Normalize naming and remove legacy labels.
   - `geminiService.ts` now proxies DeepSeek; rename to reduce confusion.

3. Align docs with code defaults.
   - Current README default credentials do not match auth code defaults.

4. Add architecture decision records and API contract docs (OpenAPI).


## 7. Immediate quick wins (next 1-2 sprints)

1. Add PostgreSQL and migrate DFIR + audit + incidents first.
2. Fix README credential mismatch and publish a secure first-run setup guide.
3. Complete SMTP integration for `notify_email` action.
4. Implement real custom feed parsing path.
5. Add automated parser tests for UFW/Wazuh/osquery fixtures.


## 8. Summary

The platform is already a strong functional prototype with real-time ingestion, correlation, AI analysis, and analyst workflows integrated in one stack.

The main work left is productionization:

- durable persistence
- complete SOAR connectors
- security hardening
- CI/testing discipline
- documentation and configuration alignment

Once these are completed, the system can move from capstone-grade prototype to deployment-grade SOC platform.
