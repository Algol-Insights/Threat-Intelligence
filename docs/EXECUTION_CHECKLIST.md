# Chengeto — Execution Checklist (April 27 → May 10)

**14 days. 7 stages. Every task listed.**

---

## STAGE 1: Merge & Deploy (Day 1 — April 27)
*Goal: Platform running locally in Docker, all pages loading*

### 1.1 Execute the merge
- [ ] Extract `chengeto-merge.zip` into `Threat-Intelligence/` repo root
- [ ] Run `bash merge/merge.sh` (or follow steps manually in PowerShell)
- [ ] Verify folder structure matches the merge guide
- [ ] Edit `.env` — add your `GEMINI_API_KEY=your_key_here`
- [ ] Commit: `git add -A && git commit -m "feat: merge Chengeto platform"`
- [ ] Push: `git push`

### 1.2 Docker first boot
- [ ] Run `docker compose up --build` — paste any errors here, I'll fix them
- [ ] Verify backend starts: check for the ASCII banner in logs
- [ ] Verify frontend builds: check for nginx startup in logs
- [ ] Open `http://localhost:3000` — should see login page
- [ ] Login with `admin` / `Chengeto@2026!`
- [ ] Verify dashboard loads
- [ ] Verify WebSocket connects (green "Live" indicator in top bar)

### 1.3 Fix any first-boot issues
- [ ] Fix import path issues in original components (they may need `../types` → `../types` adjustment)
- [ ] Fix any TypeScript errors from component integration
- [ ] Verify all 6 nav pages load without crashing

**Deliverable: Platform running, login works, all pages accessible**

---

## STAGE 2: Component Integration (Days 2-3 — April 28-29)
*Goal: Original components wired into the new page layout*

Your original components (ThreatMap, ThreatAnalysisDisplay, LogFeed, etc.) are in `frontend/src/components/` but the new page files don't import them yet. We need to wire them in.

### 2.1 Dashboard page — integrate your original components
- [ ] Import `SummaryMetrics` into Dashboard.tsx — replace the stat cards section
- [ ] Import `ThreatMap` into Dashboard.tsx — add below charts row
- [ ] Import `Alerts` into Dashboard.tsx — add at top of page
- [ ] Import `TopThreats` into Dashboard.tsx — add in sidebar area
- [ ] Import `TrainingScenario` into Dashboard.tsx — add as collapsible section
- [ ] Keep the new recharts (event rate, action distribution) alongside originals
- [ ] Test: dashboard shows both new metrics AND your original components

### 2.2 Events page — integrate ThreatAnalysisDisplay
- [ ] Replace the current inline analysis panel with your `ThreatAnalysisDisplay` component
- [ ] Wire up the JSON/CSV export buttons from your original component
- [ ] Keep the new table view for the event list (left panel)
- [ ] Wire `handleAnalyze` to call `api.analyzeThreat()` (backend) instead of direct Gemini
- [ ] Test: select event → click Analyze → see your full analysis display with all sections

### 2.3 Network page — integrate DeviceDetailsDisplay
- [ ] Replace the current inline device modal with your `DeviceDetailsDisplay` component
- [ ] Wire remediation to call `api.getRemediation()` (backend)
- [ ] Keep the new device grid cards for the overview
- [ ] Import `NetworkDevices` as an alternative compact view
- [ ] Test: click device → see your detailed service view → click Fix → get AI remediation

### 2.4 Settings page — integrate SettingsModal
- [ ] Add your `SettingsModal` organizational context form to the Settings page
- [ ] Wire it to save context via `api.setConfig()` (backend persists it)
- [ ] Add Zimbabwe-specific options (industries, sectors from extended constants)
- [ ] Test: set org context → analyze a threat → see contextual severity adjustment

### 2.5 Fix component import paths
- [ ] All components import from `'../types'` — verify paths work from `components/` dir
- [ ] Icons import: `'./icons'` → verify it resolves within `components/` folder
- [ ] Constants import: `'../constants'` — verify paths
- [ ] Fix any `enum` vs `string` type mismatches between old and new types

**Deliverable: All original components visible and functional within new layout**

---

## STAGE 3: Functionality Testing (Days 3-4 — April 29-30)
*Goal: Every feature works end-to-end*

### 3.1 Test the syslog pipeline
- [ ] Send a test UFW log: `echo "[UFW BLOCK] SRC=185.220.101.8 DST=10.0.0.1 PROTO=TCP DPT=22" | nc -u localhost 1514`
- [ ] Verify log appears in dashboard live feed
- [ ] Verify log appears in Events page table
- [ ] Verify correlation engine fires (SSH brute force rule should match)
- [ ] Verify CDPA classification appears on the log (port 22 → Section 34)

### 3.2 Test the demo runner
- [ ] Start demo: `docker compose --profile demo up demo`
- [ ] Trigger scenario: `curl -X POST http://localhost:3002/run/apt29_phishing`
- [ ] Verify logs stream into dashboard
- [ ] Trigger more: `ransomware_c2`, `silverterrier_nigeria`
- [ ] Verify correlation alerts appear
- [ ] Verify CDPA breach notifications fire for critical events

### 3.3 Test AI analysis
- [ ] Select a log event → click "Analyze with AI"
- [ ] Verify Gemini API responds (check backend logs for model name)
- [ ] Verify structured analysis appears: threat name, severity, MITRE TTPs
- [ ] Verify compliance impact mentions CDPA 2021
- [ ] Test with API key removed → verify offline fallback profiles work
- [ ] Test JSON export button
- [ ] Test CSV export button

### 3.4 Test auth and RBAC
- [ ] Login as admin → verify all pages accessible, Settings visible
- [ ] Create a new analyst user in Settings → Users
- [ ] Logout → login as analyst → verify Settings NOT visible
- [ ] Create a viewer user → login → verify read-only access
- [ ] Test wrong password → verify error message

### 3.5 Test incident management
- [ ] Create an incident from Incidents page
- [ ] Set severity to Critical, check CDPA relevant box
- [ ] Verify 72-hour deadline appears
- [ ] Progress: open → triaged → contained → resolved → closed
- [ ] Verify timeline entries appear for each status change

### 3.6 Test CDPA compliance page
- [ ] Navigate to Compliance page
- [ ] Verify compliance score displays (should be 100% if no breaches)
- [ ] Send test events that trigger CDPA classification
- [ ] Verify pending notifications appear with countdown timer
- [ ] Click "Mark notified" → verify notification status updates
- [ ] Click "Export Report" → verify JSON report downloads
- [ ] Verify CDPA section breakdown chart populates

### 3.7 Test IOC watchlist
- [ ] Go to Settings → (or add IOC endpoint test)
- [ ] Add IOC: type=ip, value=198.51.100.89
- [ ] Send a log with that source IP
- [ ] Verify IOC_HIT notification fires on dashboard

### 3.8 Test threat feeds
- [ ] Go to Settings → Threat feeds tab
- [ ] Click Sync on ThreatFox
- [ ] Verify IOC count updates after sync
- [ ] Check backend logs for sync confirmation

**Deliverable: All features verified working with evidence (screenshots)**

---

## STAGE 4: UI/UX Polish (Days 5-7 — May 1-3)
*Goal: Looks like a product, not a student project*

### 4.1 Visual consistency
- [ ] Ensure ALL original components use the new dark theme colors
- [ ] Update original components: replace `dark:bg-black` with `bg-soc-card`
- [ ] Replace `dark:text-white` with `text-soc-text` in original components
- [ ] Replace `dark:border-gray-800` with `border-soc-border`
- [ ] Replace `text-blue-500` accent colors with `text-brand-400`
- [ ] Ensure ThreatMap dark tile layer matches new theme background
- [ ] Test: every page should feel like the same product

### 4.2 Loading states
- [ ] Add skeleton loaders for dashboard stats while metrics API loads
- [ ] Add loading spinner for compliance metrics fetch
- [ ] Add loading state for incident list
- [ ] Add "Connecting..." state for WebSocket before it connects
- [ ] Ensure AI analysis shows proper loading with your original pulsing icon

### 4.3 Empty states
- [ ] Dashboard with no events: show helpful message + how to send test logs
- [ ] Events page empty: show "Waiting for syslog events on UDP :1514"
- [ ] Incidents empty: show "No incidents — system operating normally"
- [ ] Network empty: show "Scan will run when first client connects"
- [ ] Compliance empty: show shield icon + "No CDPA events — system compliant"

### 4.4 Responsive design
- [ ] Test all pages at 1920px (desktop) — should look spacious
- [ ] Test at 1024px (tablet/laptop) — sidebar should be collapsible
- [ ] Test at 768px (tablet portrait) — should still be usable
- [ ] Test at 375px (mobile) — basic functionality should work
- [ ] ThreatMap: ensure map resizes properly on all viewports
- [ ] Data tables: add horizontal scroll on mobile

### 4.5 Branding
- [ ] Login page: verify "Chengeto" branding, Algol Cyber Security tagline
- [ ] Sidebar: verify shield logo + company name
- [ ] Browser tab: "Chengeto — Cyber Threat Intelligence Platform"
- [ ] Add favicon (shield icon as .ico)
- [ ] Footer or about section: "Built by Algol Cyber Security, a subsidiary of Algol Insights"

### 4.6 Critical alert treatment
- [ ] Critical severity alerts: red pulsing border animation
- [ ] CDPA breach notifications: emerald accent with countdown
- [ ] Sound notification option for critical alerts (optional, nice-to-have)
- [ ] Ensure correlation auto-respond badge is visible ("Auto-blocked")

**Deliverable: Screenshots of every page looking polished and professional**

---

## STAGE 5: Documentation (Days 8-9 — May 4-5)
*Goal: Accurate docs that match actual code*

### 5.1 README.md rewrite
- [ ] Project overview with Chengeto branding
- [ ] Accurate feature list (only what's actually implemented)
- [ ] System architecture diagram (text-based, matching actual code)
- [ ] Technology stack table
- [ ] Quick start guide (Docker Compose)
- [ ] Default credentials (matching actual seed data)
- [ ] Demo scenario commands
- [ ] Environment variables reference
- [ ] API endpoint reference (list all /api/v1/ routes)
- [ ] Project structure (matching actual file layout)
- [ ] Research contributions section
- [ ] License and attribution

### 5.2 API documentation
- [ ] Create `docs/API.md` with all endpoints
- [ ] Document request/response shapes for key routes
- [ ] Document WebSocket message types and payloads
- [ ] Document authentication flow (login → JWT → header)

### 5.3 CDPA compliance documentation
- [ ] Create `docs/CDPA_COMPLIANCE.md`
- [ ] Explain how each CDPA section is monitored
- [ ] Document the classification algorithm
- [ ] Document the 72-hour notification workflow
- [ ] Show sample compliance report output

### 5.4 Capstone report alignment
- [ ] Verify Chapter 4 (Implementation) matches actual code
- [ ] Update any screenshots in the report
- [ ] Ensure evaluation metrics match what the system actually produces
- [ ] Add CDPA compliance engine to research contributions

**Deliverable: README matches reality, API docs exist, CDPA whitepaper ready**

---

## STAGE 6: Presentation (Days 10-12 — May 6-8)
*Goal: Killer ZITF presentation that wins funding*

### 6.1 Slide deck (15-20 slides)
- [ ] Slide 1: Title — "Chengeto: Africa's First AI-Powered SOC Platform"
- [ ] Slide 2: The problem — No affordable SOC tools for African enterprises
- [ ] Slide 3: Market size — 200+ regulated entities in Zimbabwe, 3000+ in SADC
- [ ] Slide 4: What is Chengeto — one-sentence + architecture diagram
- [ ] Slide 5: CDPA 2021 — the compliance gap (no tools exist today)
- [ ] Slide 6: Live demo — screenshot of dashboard with real events
- [ ] Slide 7: AI threat analysis — screenshot of analysis panel
- [ ] Slide 8: CDPA compliance dashboard — screenshot with 72-hour countdown
- [ ] Slide 9: Network discovery — screenshot of device scan results
- [ ] Slide 10: Incident management — screenshot of lifecycle
- [ ] Slide 11: Correlation engine — how real-time detection works
- [ ] Slide 12: Africa-first design — regional threat intel, CERT.ZW, SADC context
- [ ] Slide 13: Technology stack — architecture diagram
- [ ] Slide 14: Research contributions (5 novel contributions)
- [ ] Slide 15: Cost comparison — Chengeto vs Splunk vs QRadar
- [ ] Slide 16: Business model — SOCaaS pricing tiers
- [ ] Slide 17: Roadmap — what comes next (multi-tenant, UEBA, mobile)
- [ ] Slide 18: Team — Algol Cyber Security, Algol Insights
- [ ] Slide 19: Call to action — "Looking for pilot partners"
- [ ] Slide 20: Q&A

### 6.2 Demo script
- [ ] Write 5-minute demo script (Act 1: attack, Act 2: AI analysis, Act 3: compliance)
- [ ] Write 10-minute extended version (adds: incident creation, network scan, report export)
- [ ] Rehearse demo flow 3 times minimum
- [ ] Identify the 3 "wow moments" judges should remember
- [ ] Prepare answers for likely questions:
  - "How does this differ from Wazuh?" (CDPA compliance + AI + unified platform)
  - "Can this scale?" (SQLite → PostgreSQL migration path documented)
  - "What's the business model?" (SOCaaS tiers: $500-5000/month)
  - "Who are your competitors?" (None in Africa — that's the point)

### 6.3 Backup plan
- [ ] Record a full demo video (screen capture with narration)
- [ ] Export demo screenshots for every key feature
- [ ] Prepare offline mode: pre-populated database + offline AI profiles
- [ ] Test: disconnect internet → verify demo still works with fallback

### 6.4 One-page poster (for ZITF booth)
- [ ] Design A1 poster: Chengeto branding, key features, architecture, QR code to repo
- [ ] Print-ready PDF

**Deliverable: Slides done, demo rehearsed 3x, backup video recorded**

---

## STAGE 7: Final Prep (Days 13-14 — May 9-10)
*Goal: Zero surprises on presentation day*

### 7.1 Full dress rehearsal
- [ ] Fresh `docker compose down -v && docker compose up --build` on presentation laptop
- [ ] Run complete 10-minute demo start to finish
- [ ] Time it — must fit in allocated slot
- [ ] Test on venue WiFi if possible (or hotspot)
- [ ] Test projector/screen resolution

### 7.2 Final bug fixes
- [ ] Fix anything that broke during rehearsal
- [ ] Final commit and push to GitHub
- [ ] Verify repo is public and README looks professional
- [ ] Tag release: `git tag v1.0.0-zitf && git push --tags`

### 7.3 Presentation day checklist
- [ ] Laptop charged + charger packed
- [ ] Docker images pre-built (don't build live)
- [ ] `.env` file configured with working API key
- [ ] Demo video on USB drive (backup)
- [ ] Slides on USB drive (backup)
- [ ] Phone hotspot ready (backup internet)
- [ ] Business cards for Algol Cyber Security (if available)
- [ ] Water bottle (you'll be talking a lot)

---

## PROGRESS TRACKER

| Stage | Days | Status |
|---|---|---|
| Stage 1: Merge & Deploy | Day 1 (Apr 27) | ⬜ Not started |
| Stage 2: Component Integration | Days 2-3 (Apr 28-29) | ⬜ Not started |
| Stage 3: Functionality Testing | Days 3-4 (Apr 29-30) | ⬜ Not started |
| Stage 4: UI/UX Polish | Days 5-7 (May 1-3) | ⬜ Not started |
| Stage 5: Documentation | Days 8-9 (May 4-5) | ⬜ Not started |
| Stage 6: Presentation | Days 10-12 (May 6-8) | ⬜ Not started |
| Stage 7: Final Prep | Days 13-14 (May 9-10) | ⬜ Not started |

---

## WHAT I BUILD FOR YOU AT EACH STAGE

| Stage | What you do | What I build |
|---|---|---|
| 1 | Run merge script, start Docker | Fix any build errors you paste here |
| 2 | Test integrations | Merged component files with proper imports |
| 3 | Run through test checklist | Fix any bugs you find |
| 4 | Review and approve look | Theme updates for original components, loading states |
| 5 | Review docs for accuracy | README, API docs, CDPA whitepaper |
| 6 | Rehearse delivery | Slide deck (PPTX), demo script, poster |
| 7 | Rehearse and pack | Any final fixes |

**We work through this together. Every time you finish a stage, come back and we tackle the next one.**
