# Chengeto — Complete Rebuild Blueprint

**Product**: Chengeto by Algol Digital Solutions
**Tagline**: Africa's first AI-powered SOC platform — built for compliance, priced for reality
**Deadline**: May 10, 2026 (ZITF Research Week)
**Author**: Strategic architecture review with Algol Digital Solutions

---

## 1. Product positioning

### The one-sentence pitch
Chengeto is the first SOC platform built for African enterprises — CDPA 2021 compliant out of the box, powered by AI threat analysis, and priced at 1/10th of Splunk.

### Why this wins at ZITF
1. **First mover** — No African-built SOC/SIEM/CTI platform exists. Full stop.
2. **Compliance-led** — CDPA 2021 is law. Every regulated entity needs it. No tool helps them comply today.
3. **Affordable** — Deployed on a single Linux VM. No cloud dependency. No per-GB pricing.
4. **Live demo** — Real attack scenarios firing, real AI analysis, real alerts. Not slides — a working system.

### Target buyers (in order)
1. Zimbabwean banks and fintechs (RBZ mandates cybersecurity controls)
2. Government ministries and parastatals (CDPA compliance obligations)
3. Telecom operators (NetOne, Econet, TelOne — critical infrastructure)
4. Regional expansion: Zambia, Botswana, Mozambique, wider SADC

### Business model
**Managed SOC as a Service (SOCaaS)** via Algol Digital Solutions:
- Tier 1: SME monitoring — $500/month (up to 50 endpoints)
- Tier 2: Enterprise monitoring — $2,000/month (unlimited endpoints, dedicated analyst)
- Tier 3: Full MSSP — $5,000/month (24/7 monitoring, incident response, compliance reporting)
- On-premise license: $15,000/year (self-hosted, self-managed)

Compare: Splunk Enterprise Security starts at ~$50,000/year. IBM QRadar similar.

---

## 2. What we keep, what we cut, what we build

### KEEP (working, valuable)
| Component | Why |
|---|---|
| UDP syslog ingestion (UFW parser) | Core pipeline, works correctly |
| Nmap network scanner | Unique differentiator — live network discovery |
| Africa threat intel module (from zip) | Regional enrichment — the Africa-first story |
| Demo runner (from zip) | Critical for ZITF live demo |
| React + TypeScript + Vite frontend | Good foundation, needs redesign not replacement |
| WebSocket real-time streaming | Correct architecture for SOC dashboards |
| Gemini AI analysis prompt/schema | Well-structured, just needs to move server-side |

### CUT (remove entirely)
| Component | Why |
|---|---|
| Duplicated source trees (root/ vs frontend/) | Causes drift, confuses contributors |
| Client-side Gemini API calls | Security anti-pattern — API key exposed in browser |
| MOCK_LOGS constant in root App.tsx | Dashboard should start empty, populate from real data |
| Legacy `geminiService.ts` name | Rename to `aiService.ts` — it's model-agnostic now |
| Empty Dockerfiles | Replace with real, working Dockerfiles |
| The zip file in the repo | Merge its contents into the codebase properly |
| Overclaimed README features | Only document what actually exists |

### BUILD (new, in priority order for 14-day sprint)

#### P0 — Must ship for ZITF (Days 1-7)

1. **Express HTTP API server** (wrapping existing WS + syslog)
   - Health check endpoint
   - Proper CORS, body parsing, error handling
   - All routes under /api/v1/

2. **Backend AI proxy with multi-model fallback chain**
   - Route: POST /api/v1/analyze/threat
   - Chain: Gemini 2.5 Flash (free tier) → DeepSeek R1 → Groq (Llama) → offline profiles
   - API keys stay server-side (environment variables)
   - Structured JSON output with Zimbabwe/CDPA context baked into the prompt
   - Route: POST /api/v1/analyze/remediation

3. **JWT authentication + RBAC**
   - Three roles: admin, analyst, viewer
   - Login route with bcrypt password hashing
   - 8-hour token expiry
   - Route-level middleware for role enforcement
   - Bootstrap admin account from environment variable (not hardcoded)

4. **Wazuh + osquery log parsers**
   - `parseWazuhLog()` — JSON format with rule.level, agent.name, data fields
   - `parseOsqueryLog()` — JSON format with name, action, columns fields
   - Unified log object output matching existing FirewallLog type

5. **Correlation engine**
   - Sliding window per source IP (120-second window)
   - Rules: port scan (10+ ports in 10s), brute force (5+ attempts on auth ports), known malicious IP, TOR exit node, high-volume DNS
   - On match: emit CORRELATION_ALERT via WebSocket
   - Critical matches auto-trigger SOAR (UFW deny)
   - Stats endpoint: GET /api/v1/correlation/stats

6. **CDPA 2021 compliance engine** ← THE DIFFERENTIATOR
   - Every security event scored for CDPA relevance
   - Automatic classification: personal data breach, infrastructure incident, reportable event
   - Compliance dashboard data: breach count, time-to-report tracking, incident categorization
   - Section 15 (breach notification) timeline tracker
   - RBZ directive mapping for financial sector events
   - Export: compliance report as JSON/PDF

7. **SQLite persistence layer**
   - Tables: users, audit_log, incidents, dfir_cases, ioc_watchlist, compliance_events, config
   - better-sqlite3 (synchronous, fast, no extra container)
   - Data survives backend restarts
   - Migration path to PostgreSQL documented

8. **Working Docker deployment**
   - Backend Dockerfile: Node.js 20 + nmap + better-sqlite3
   - Frontend Dockerfile: multi-stage build (Vite build → nginx serve)
   - docker-compose.yml with health checks, proper networking, volume mounts
   - nginx config with /api proxy and /ws WebSocket upgrade

9. **Frontend redesign** — Professional SOC dashboard
   - Dark theme by default (SOC standard)
   - Sidebar navigation (not single-page scroll)
   - Pages: Dashboard, Events, Threats, Network, Incidents, CDPA Compliance, MITRE ATT&CK, Reports, Settings
   - Real-time metrics bar: events/sec, active alerts, compliance status
   - Responsive (judges may use tablets/phones)

#### P1 — Should ship for ZITF (Days 8-11)

10. **Incident management API**
    - Full lifecycle: create → triage → contain → resolve → close
    - Backend REST CRUD
    - Linked to correlation alerts

11. **IOC watchlist**
    - CRUD API for indicator management
    - Per-log check during ingestion
    - IOC_HIT WebSocket broadcast

12. **Threat feed sync**
    - ThreatFox bulk IOC pull (on startup + every 6 hours)
    - AbuseIPDB IP reputation check
    - Feed health status endpoint

13. **Audit trail**
    - Every user action logged: actor, action, target, timestamp
    - Append-only in SQLite
    - Filterable UI page

14. **WhatsApp alert integration**
    - Africa's Talking API or Twilio WhatsApp Business
    - Alert severity threshold config
    - Template messages: "⚠️ CHENGETO ALERT: Critical threat detected — [summary]. Login to investigate."

#### P2 — Nice to have for ZITF (Days 12-13)

15. **DFIR case management** — cases, evidence, timeline
16. **Executive briefing page** — one-page risk summary for CISOs
17. **MITRE ATT&CK matrix overlay** — techniques hit from real events
18. **Playbook execution** — ordered SOAR actions with audit receipts
19. **MFA (TOTP)** — second factor on login

---

## 3. Technical decisions

### AI model strategy
**Primary (free)**: Google Gemini 2.5 Flash
- Free tier: 15 RPM, 1M tokens/day — more than enough for SOC demo
- Structured JSON output with responseSchema
- Already have working prompt + schema from existing geminiService.ts

**Fallback 1**: DeepSeek R1 via API
- $0.55/M input tokens — essentially free for demo volumes
- Good reasoning for threat analysis

**Fallback 2**: Groq (Llama 3.3 70B)
- Free tier: 30 RPM
- Fastest inference for real-time analysis feel

**Fallback 3**: Offline deterministic profiles
- 8 hardcoded threat profiles for common attack patterns
- Works with zero internet — critical for Zimbabwean deployment reality
- Profiles: SSH brute force, SQL injection, RDP exploitation, C2 communication, DNS tunneling, port scan, ransomware indicators, web application attack

### Database
**SQLite via better-sqlite3** for the following reasons:
- Zero infrastructure — no database container needed
- Synchronous API — simpler code, no connection pool management
- Single-file database — easy backup, easy demo reset
- Fast enough for single-instance SOC (handles 10,000+ events/sec)
- Migration path: swap to PostgreSQL by changing the repository layer

### Frontend routing
**React Router v6** with these routes:
```
/login
/dashboard          — Main SOC overview
/events             — Log feed with filters
/threats            — Threat intel feeds + IOC watchlist
/network            — Network discovery + topology
/incidents          — Incident management + DFIR
/compliance         — CDPA 2021 dashboard ← HERO PAGE
/mitre              — ATT&CK matrix
/reports            — Export center
/settings           — Admin config, users, API keys
```

### Authentication flow
```
POST /api/v1/auth/login     → JWT (8h expiry)
POST /api/v1/auth/register  → Admin-only user creation
GET  /api/v1/auth/me        → Current user profile
POST /api/v1/auth/mfa/setup → TOTP QR code (P2)
```

Roles and permissions:
- **viewer**: read-only dashboard access, can view events and reports
- **analyst**: everything viewer can do + analyze threats, manage incidents, run playbooks
- **admin**: everything analyst can do + manage users, configure system, manage feeds

---

## 4. CDPA 2021 compliance engine — detailed design

This is what makes Chengeto fundable. Here's how it works:

### Automatic event classification
Every security event is evaluated against CDPA sections:
- **Section 3** — Does this event involve personal data? (database ports, data exfiltration patterns)
- **Section 15** — Is this a notifiable breach? (confirmed data access, not just blocked probes)
- **Section 16** — Time-to-notification tracking (72-hour countdown from detection)
- **Section 29** — Cross-border data transfer implications (geo-based destination analysis)

### Compliance dashboard metrics
- Total events with CDPA relevance (last 7/30/90 days)
- Open breaches requiring notification
- Time remaining on notification deadlines
- Compliance score (percentage of incidents properly classified and reported)
- RBZ directive alignment status (for financial sector)
- CERT.ZW advisory correlation count

### Report generation
- One-click CDPA compliance report (PDF/JSON)
- Includes: incident timeline, data categories affected, notification status, remediation steps taken
- Formatted for submission to POTRAZ (Postal and Telecommunications Regulatory Authority)

### Why this wins funding
Every bank, telco, and government ministry in Zimbabwe is subject to CDPA 2021 but has no tooling to help them comply. Chengeto doesn't just detect threats — it tells you when you have a legal obligation to report. That's not a feature; that's a reason to buy.

---

## 5. Fourteen-day sprint plan

### Days 1-2: Foundation
- [ ] Install Docker Desktop, verify `docker compose` works
- [ ] Clean the repo: merge zip contents, delete duplicate trees, fix structure
- [ ] Build working Dockerfiles (backend + frontend)
- [ ] Add Express HTTP server wrapping existing WS + syslog code
- [ ] Add SQLite with better-sqlite3, create migration/schema
- [ ] Add JWT auth (login, register, middleware, RBAC)
- [ ] Deploy locally with `docker compose up --build` — verify everything runs

### Days 3-4: Backend core
- [ ] Build multi-model AI proxy (Gemini → DeepSeek → Groq → offline)
- [ ] Add Wazuh + osquery parsers
- [ ] Build correlation engine with 5 core rules
- [ ] Build CDPA compliance engine (event classification + scoring)
- [ ] Add incident management CRUD API
- [ ] Add IOC watchlist API + per-log hit detection
- [ ] Add audit trail logging

### Days 5-7: Frontend overhaul
- [ ] Implement React Router with sidebar navigation
- [ ] Build Dashboard page (real-time metrics, event feed, threat map)
- [ ] Build CDPA Compliance page (the hero page for ZITF)
- [ ] Build Events page (filterable log feed with analysis panel)
- [ ] Build Network page (device discovery + remediation)
- [ ] Build Incidents page (lifecycle management)
- [ ] Build Settings page (API keys, user management, system config)
- [ ] Polish: loading states, error handling, responsive layout

### Days 8-9: Integration and demo
- [ ] Integrate demo runner with new backend
- [ ] Create 3 ZITF demo scenarios: banking attack, government probe, telecom recon
- [ ] End-to-end test: demo fires → logs appear → correlation alerts → AI analysis → CDPA classification
- [ ] Add WhatsApp alert integration (Africa's Talking API)
- [ ] Threat feed sync (ThreatFox on startup)

### Days 10-11: Polish and documentation
- [ ] Build MITRE ATT&CK matrix page
- [ ] Build Executive Briefing page
- [ ] Build Reports page (PDF export)
- [ ] Fix every UI bug found during integration testing
- [ ] Write accurate README matching actual code
- [ ] Write API documentation

### Days 12-13: Presentation
- [ ] Build ZITF presentation slides (15-20 slides)
- [ ] Write demo script (5-minute and 10-minute versions)
- [ ] Create one-page technical poster for booth
- [ ] Full rehearsal run-throughs
- [ ] Record backup demo video (in case of connectivity issues)

### Day 14: Buffer
- [ ] Fix anything that broke during rehearsal
- [ ] Final Docker build test on clean machine
- [ ] Backup everything

---

## 6. File structure — target state

```
chengeto/
├── backend/
│   ├── server.js              # Express + WS + syslog + nmap
│   ├── db.js                  # SQLite setup + migrations
│   ├── auth.js                # JWT + bcrypt + RBAC middleware
│   ├── aiService.js           # Multi-model fallback chain
│   ├── correlationEngine.js   # Real-time rule evaluation
│   ├── cdpaEngine.js          # CDPA 2021 compliance scoring
│   ├── africaThreatIntel.js   # Regional enrichment
│   ├── parsers.js             # UFW + Wazuh + osquery
│   ├── routes/
│   │   ├── analyzeRoutes.js   # AI analysis endpoints
│   │   ├── authRoutes.js      # Login, register, profile
│   │   ├── incidentRoutes.js  # Incident CRUD
│   │   ├── feedRoutes.js      # Threat feed sync
│   │   ├── iocRoutes.js       # IOC watchlist CRUD
│   │   ├── complianceRoutes.js # CDPA reports + metrics
│   │   ├── adminRoutes.js     # System config
│   │   └── auditRoutes.js     # Audit trail
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Events.tsx
│   │   │   ├── Threats.tsx
│   │   │   ├── Network.tsx
│   │   │   ├── Incidents.tsx
│   │   │   ├── Compliance.tsx    # ← CDPA hero page
│   │   │   ├── MitreMatrix.tsx
│   │   │   ├── Reports.tsx
│   │   │   ├── Settings.tsx
│   │   │   └── Login.tsx
│   │   ├── components/          # Shared UI components
│   │   ├── services/
│   │   │   ├── api.ts           # Axios/fetch wrapper with JWT
│   │   │   └── websocket.ts     # WS connection manager
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx
│   │   └── types.ts
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── index.html
│   └── package.json
├── demo/
│   ├── demo-runner.js
│   └── controller.html
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 7. Demo script for ZITF (5-minute version)

### Opening (30 seconds)
"Chengeto — Shona for 'protection' — is Zimbabwe's first AI-powered SOC platform. Built by Algol Digital Solutions for the African enterprise market. Let me show you what it does."

### Act 1: The attack (90 seconds)
- Trigger banking sector scenario from demo runner
- Show logs streaming in real-time on the dashboard
- Point out: correlation engine detecting brute force pattern
- Show: automatic UFW block firing on critical match
- Show: CDPA flag appearing — "This event involves potential personal data breach"

### Act 2: AI analysis (90 seconds)
- Select a high-severity event
- Click "Analyze with AI"
- Walk through the structured analysis: threat actor DNA, MITRE ATT&CK TTPs, predictive next steps
- Highlight: compliance impact section references CDPA 2021 Section 15 by name
- Show: contextual severity adjustment for Zimbabwe banking sector

### Act 3: Compliance (60 seconds)
- Navigate to CDPA Compliance dashboard
- Show: breach timeline with 72-hour notification countdown
- Show: compliance score and breakdown by CDPA section
- Show: one-click report generation
- "No other platform in Africa does this."

### Closing (30 seconds)
- Cost comparison slide: Chengeto vs Splunk vs QRadar
- "Available as managed SOC service from Algol Digital Solutions. We're looking for pilot partners in the banking and government sectors."

---

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Internet unreliable during ZITF demo | Offline AI fallback profiles + pre-seeded demo data + recorded backup video |
| Docker issues on presentation day | Pre-built images, tested on exact hardware day before |
| Judge asks about feature that's display-only | Be honest — label planned features clearly in UI |
| Judge clones repo and code doesn't match docs | Rebuild README from scratch after code is done |
| AI API rate limited during live demo | Fallback chain + cached analysis results for demo scenarios |
| 14 days isn't enough | Focus on P0 only if behind schedule — CDPA + AI + Docker is the minimum viable demo |

---

## 9. What makes this fundable

An investor or grant committee will ask: "Why should we fund this?"

1. **Market size**: 200+ regulated entities in Zimbabwe alone. 3,000+ across SADC.
2. **Regulatory tailwind**: CDPA 2021 enforcement is ramping up. Compliance isn't optional.
3. **No competition**: Zero African-built SOC platforms exist.
4. **Revenue model**: Recurring SOCaaS subscriptions. $500-5,000/month per client.
5. **Defensible moat**: Africa-first threat intelligence, CDPA engine, local language support roadmap.
6. **Team**: Built by someone who understands the market because they live in it.

---

*This document is the source of truth for the Chengeto rebuild. Everything we build must trace back to this plan.*
