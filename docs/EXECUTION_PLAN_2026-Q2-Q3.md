# Chengeto CTI - Delivery Execution Plan (Q2-Q3 2026)

Date: 2026-04-26  
Cadence: 2-week sprints  
Planning horizon: 8 sprints (16 weeks)

## 1. Purpose

This plan converts the prioritized backlog into an executable roadmap with:

- owner roles
- effort estimates
- sprint sequencing
- dependencies
- acceptance criteria


## 2. Team model and ownership

Proposed owner roles:

- Product Owner (PO): scope decisions, acceptance sign-off
- Tech Lead (TL): architecture, sequencing, cross-team blockers
- Backend Engineer (BE): API, persistence, ingestion, integrations
- Frontend Engineer (FE): UI, state management, UX flows
- DevOps Engineer (DO): CI/CD, container hardening, observability
- Security Engineer (SE): auth/secrets hardening, threat controls
- QA Engineer (QA): test strategy, regression, release gates
- SOC Analyst SME (SOC): workflow validation and playbook correctness


## 3. Estimation model

Story point scale:

- 1: trivial (<= 0.5 day)
- 2: small (1 day)
- 3: medium (1-2 days)
- 5: large (3-4 days)
- 8: very large (1 sprint)
- 13: epic (multi-sprint split required)

Capacity assumption per sprint:

- Engineering: 20-28 points total across BE/FE/DO/SE
- QA: embedded verification each sprint, formal regression from Sprint 4 onward


## 4. Workstream breakdown

### WS1 - Persistence and data model

Goal:

- Replace in-memory/browser-only critical data with durable backend persistence.

Scope:

- PostgreSQL introduction
- Schema and migrations for users, audit, incidents, DFIR, IOC watchlist, runtime config, playbook executions
- Repository/service layer in backend

Primary owners:

- BE (owner)
- TL (review)
- QA (test coverage)


### WS2 - Security hardening

Goal:

- Remove default credentials/secrets risks and improve auth/API defense posture.

Scope:

- Secure bootstrap account flow
- Environment/secret-store integration strategy
- request validation
- auth/analyze/feed rate limits
- audit integrity improvements

Primary owners:

- SE (owner)
- BE (implementation)
- DO (secret management + deployment)


### WS3 - SOAR completion

Goal:

- Turn partially logged actions into real, auditable integrations.

Scope:

- SMTP for notify_email
- controlled script execution framework for run_script
- endpoint isolation adapter for quarantine_host
- firewall adapter completion and success feedback loop

Primary owners:

- BE (owner)
- SE (safety controls)
- SOC (validation)


### WS4 - Feed and CTI completeness

Goal:

- Make custom feeds truly ingestible and improve feed reliability.

Scope:

- direct custom feed parser support (MISP/STIX/CSV)
- de-duplication and confidence merge rules
- feed health and retry strategy

Primary owners:

- BE (owner)
- FE (UX and status views)
- SOC (relevance validation)


### WS5 - Reliability, test, and release engineering

Goal:

- Add CI quality gates and reduce runtime regressions.

Scope:

- backend unit/integration tests
- parser fixture tests (UFW/Wazuh/osquery)
- auth/RBAC API tests
- compose smoke tests
- CI pipeline and merge gates

Primary owners:

- QA (owner)
- DO (CI)
- BE/FE (test authoring)


### WS6 - Frontend/state cleanup

Goal:

- Align frontend data flow with backend persistence and reduce drift risk.

Scope:

- move incidents/config/audit cache behavior to API-first
- reduce duplicate source tree drift risk across root and frontend mirrors
- improve status messaging for integration-backed vs display-only controls

Primary owners:

- FE (owner)
- TL (codebase structure decisions)
- QA (UX regression)


## 5. Sprint plan (8 sprints)

## Sprint 1 (Weeks 1-2) - Foundation and risk burn-down

Objectives:

- Establish persistence baseline and security baseline.

Items:

- DB bootstrap in compose and migration framework setup (5 SP) - DO + BE
- Data model draft for core entities (3 SP) - BE + TL
- Remove hardcoded default credentials path, add bootstrap admin flow (5 SP) - SE + BE
- API request schema validation framework (3 SP) - BE
- Test scaffold (Jest/Vitest + supertest equivalent) and first smoke tests (3 SP) - QA + BE

Exit criteria:

- Database service integrated locally
- No static default password in runtime auth path
- At least 5 critical API tests passing in CI skeleton


## Sprint 2 (Weeks 3-4) - Core persistence migration

Objectives:

- Move highest-risk volatile data to durable storage.

Items:

- Persist users/auth metadata and audit logs (8 SP) - BE
- Persist DFIR cases/evidence/timeline (5 SP) - BE
- Incident API creation and frontend integration start (5 SP) - BE + FE
- Backfill migration scripts and seed tooling (3 SP) - BE
- Regression test expansion for migrated routes (3 SP) - QA

Exit criteria:

- Restart-safe audit + DFIR data
- Incident CRUD available through backend API


## Sprint 3 (Weeks 5-6) - SOAR real integrations (phase 1)

Objectives:

- Convert high-value SOAR placeholders into real actions.

Items:

- SMTP integration for notify_email with templates (5 SP) - BE
- Safe script runner for run_script (allowlist, timeout, audit) (8 SP) - BE + SE
- Playbook execution audit trail with action receipts (3 SP) - BE
- UI action status improvements in playbooks panel (3 SP) - FE

Exit criteria:

- notify_email sends real email in configured environments
- run_script executes only allowlisted commands with full logging


## Sprint 4 (Weeks 7-8) - SOAR real integrations (phase 2)

Objectives:

- Complete firewall/isolation integration path.

Items:

- quarantine_host adapter contract and first integration (5 SP) - BE + SE
- firewall adapter completion with execution confirmation (5 SP) - BE
- Retry/idempotency and error mapping for actions (3 SP) - BE
- SOC workflow validation and playbook tuning workshop (2 SP) - SOC + PO
- End-to-end SOAR tests (3 SP) - QA

Exit criteria:

- At least one real isolation path and one real firewall path validated
- Action outcomes visible and auditable in UI/API


## Sprint 5 (Weeks 9-10) - CTI feed completeness

Objectives:

- Implement genuine custom feed ingestion and reliability.

Items:

- Custom feed parser support (CSV/STIX/MISP endpoint modes) (8 SP) - BE
- IOC normalization + dedupe + confidence fusion update (5 SP) - BE
- Feed health dashboard updates and retry/backoff logic (3 SP) - FE + BE
- Feed integration tests with fixtures (3 SP) - QA

Exit criteria:

- Custom feed no longer proxies ThreatFox behavior
- Deterministic merge behavior documented and tested


## Sprint 6 (Weeks 11-12) - Security and reliability hardening

Objectives:

- Improve resilience and abuse resistance.

Items:

- Route-level rate limiting and abuse controls (3 SP) - SE + BE
- Structured logging and correlation IDs (5 SP) - BE + DO
- WebSocket reconnect/state recovery strategy and UI cues (5 SP) - FE + BE
- Secret rotation and deployment handling guide (3 SP) - DO + SE
- Security regression checklist automation (2 SP) - QA

Exit criteria:

- Key endpoints protected by enforceable limits
- Logs support traceability across request -> action -> alert


## Sprint 7 (Weeks 13-14) - Frontend state alignment and cleanup

Objectives:

- API-first data flow and codebase maintainability.

Items:

- Move incidents/config/audit behavior from local-storage-first to API-first (8 SP) - FE + BE
- Data sync conflict handling for multi-user operations (3 SP) - FE
- Clarify UI status labels (backed integration vs display indicator) (2 SP) - FE + PO
- Source tree drift mitigation plan and selected refactor (5 SP) - TL + FE + BE

Exit criteria:

- Multi-user data consistency materially improved
- Clear boundary between persisted data and local cache


## Sprint 8 (Weeks 15-16) - Stabilization and release readiness

Objectives:

- Achieve release-quality baseline.

Items:

- Full regression and performance smoke suite in CI (5 SP) - QA + DO
- Production deployment checklist and runbook (3 SP) - DO + TL
- Documentation alignment (credentials, setup, architecture, API contracts) (3 SP) - TL + FE + BE
- Final bug burn-down buffer (8 SP) - cross-team

Exit criteria:

- CI required checks green on main
- Operational runbook published
- Release candidate approved by PO + TL + QA + SE


## 6. Dependency map

Critical dependencies:

1. WS1 persistence must start before WS6 API-first frontend migration.
2. WS2 secret/auth hardening should complete before production deployment.
3. WS5 CI baseline should be active by Sprint 3 to catch regressions early.
4. WS3/WS4 SOAR integrations depend on environment access and credentials.

Blocker watchlist:

- SMTP server credentials and outbound network policy
- EDR/firewall integration endpoints and test environments
- MISP/STIX sample feeds and schema variance


## 7. Milestones

Milestone A (End Sprint 2): Durable core data

- Users, audit, DFIR, incidents persist across restart.

Milestone B (End Sprint 4): Operational SOAR core

- Email/script/firewall/isolation path available with audit receipts.

Milestone C (End Sprint 6): Hardened platform baseline

- Rate limits, structured logging, WS resilience, secrets handling.

Milestone D (End Sprint 8): Release candidate

- CI gates, docs alignment, runbook, regression pass.


## 8. Definition of done (per feature)

A feature is done only when all are true:

- Code merged with tests
- API contract documented
- Security checks passed (authz/input validation/logging)
- UX error states and success states verified
- Observability hooks in place
- Runbook update completed where operational impact exists


## 9. Delivery KPIs

Track per sprint:

- Planned vs delivered story points
- Defect escape rate (post-merge defects)
- Mean time to restore from failed deployment
- Test pass rate and flaky test count
- Percentage of critical flows covered by automated tests

Target by Sprint 8:

- >= 80% pass-on-first-run for CI full pipeline
- <= 5% escaped defects from sprint scope
- >= 70% automated coverage on backend critical routes


## 10. Immediate action checklist (start this week)

1. Confirm team role assignment by name (map role -> person).
2. Decide database stack and migration tool.
3. Approve Sprint 1 scope and lock estimates.
4. Create sprint board tickets from Sections 5 and 6.
5. Enable mandatory PR checks for lint, build, and test skeleton.
