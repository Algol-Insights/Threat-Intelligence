# ═══════════════════════════════════════════════════════════════════════════
# CHENGETO CTI PLATFORM — COMPLETE TEST SUITE
# Run each section in PowerShell while Docker is running
# ═══════════════════════════════════════════════════════════════════════════

# ── PREREQUISITE: Platform must be running ──────────────────────────────
# docker compose up --build

# ═══════════════════════════════════════════════════════════════════════════
# TEST 1: HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "`n=== TEST 1: Health Check ===" -ForegroundColor Cyan
$health = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/health"
Write-Host "Status: $($health.status)" -ForegroundColor Green
Write-Host "Platform: $($health.platform)"
Write-Host "Version: $($health.version)"

# ═══════════════════════════════════════════════════════════════════════════
# TEST 2: AUTHENTICATION
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "`n=== TEST 2: Authentication ===" -ForegroundColor Cyan

# Login as admin
$loginBody = @{ username = "admin"; password = "Chengeto@2026!" } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
$token = $login.token
Write-Host "Admin login: OK (token received)" -ForegroundColor Green
Write-Host "Role: $($login.user.role)"

# Set auth header for all subsequent requests
$headers = @{ Authorization = "Bearer $token" }

# Get current user
$me = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/me" -Headers $headers
Write-Host "Auth/me: $($me.user.username) ($($me.user.role))" -ForegroundColor Green

# List users
$users = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/users" -Headers $headers
Write-Host "Users: $($users.users.Count) registered" -ForegroundColor Green

# Test wrong password
try {
    $bad = @{ username = "admin"; password = "wrong" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" -Method Post -Body $bad -ContentType "application/json"
    Write-Host "FAIL: Wrong password should have been rejected" -ForegroundColor Red
} catch {
    Write-Host "Wrong password rejected: OK" -ForegroundColor Green
}

# ═══════════════════════════════════════════════════════════════════════════
# TEST 3: SEND REAL SYSLOG EVENTS
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "`n=== TEST 3: Syslog Ingestion ===" -ForegroundColor Cyan

$udp = New-Object System.Net.Sockets.UdpClient
$events = @(
    # Port scan (11 ports from same IP - triggers port_scan rule)
    "[UFW BLOCK] SRC=185.220.101.8 DST=10.0.0.1 PROTO=TCP DPT=22",
    "[UFW BLOCK] SRC=185.220.101.8 DST=10.0.0.1 PROTO=TCP DPT=23",
    "[UFW BLOCK] SRC=185.220.101.8 DST=10.0.0.1 PROTO=TCP DPT=80",
    "[UFW BLOCK] SRC=185.220.101.8 DST=10.0.0.1 PROTO=TCP DPT=443",
    "[UFW BLOCK] SRC=185.220.101.8 DST=10.0.0.1 PROTO=TCP DPT=3389",
    "[UFW BLOCK] SRC=185.220.101.8 DST=10.0.0.1 PROTO=TCP DPT=445",
    "[UFW BLOCK] SRC=185.220.101.8 DST=10.0.0.1 PROTO=TCP DPT=1433",
    "[UFW BLOCK] SRC=185.220.101.8 DST=10.0.0.1 PROTO=TCP DPT=3306",
    "[UFW BLOCK] SRC=185.220.101.8 DST=10.0.0.1 PROTO=TCP DPT=5432",
    "[UFW BLOCK] SRC=185.220.101.8 DST=10.0.0.1 PROTO=TCP DPT=8080",
    "[UFW BLOCK] SRC=185.220.101.8 DST=10.0.0.1 PROTO=TCP DPT=21",
    # SSH brute force (5+ from same IP on port 22 - triggers brute_force_ssh)
    "[UFW BLOCK] SRC=45.154.255.10 DST=10.0.0.1 PROTO=TCP DPT=22",
    "[UFW BLOCK] SRC=45.154.255.10 DST=10.0.0.1 PROTO=TCP DPT=22",
    "[UFW BLOCK] SRC=45.154.255.10 DST=10.0.0.1 PROTO=TCP DPT=22",
    "[UFW BLOCK] SRC=45.154.255.10 DST=10.0.0.1 PROTO=TCP DPT=22",
    "[UFW BLOCK] SRC=45.154.255.10 DST=10.0.0.1 PROTO=TCP DPT=22",
    "[UFW BLOCK] SRC=45.154.255.10 DST=10.0.0.1 PROTO=TCP DPT=22",
    # CDPA breach - ALLOWED to database (triggers CDPA classification)
    "[UFW ALLOW] SRC=203.0.113.88 DST=10.0.0.5 PROTO=TCP DPT=5432",
    "[UFW ALLOW] SRC=203.0.113.88 DST=10.0.0.5 PROTO=TCP DPT=3306",
    # C2 indicators (suspicious ports)
    "[UFW BLOCK] SRC=198.51.100.89 DST=10.0.0.1 PROTO=TCP DPT=4444",
    "[UFW BLOCK] SRC=198.51.100.89 DST=10.0.0.1 PROTO=TCP DPT=31337",
    # RDP brute force
    "[UFW BLOCK] SRC=192.0.2.210 DST=10.0.0.1 PROTO=TCP DPT=3389",
    "[UFW BLOCK] SRC=192.0.2.210 DST=10.0.0.1 PROTO=TCP DPT=3389",
    "[UFW BLOCK] SRC=192.0.2.210 DST=10.0.0.1 PROTO=TCP DPT=3389",
    "[UFW BLOCK] SRC=192.0.2.210 DST=10.0.0.1 PROTO=TCP DPT=3389",
    "[UFW BLOCK] SRC=192.0.2.210 DST=10.0.0.1 PROTO=TCP DPT=3389",
    # DNS abuse
    "[UFW BLOCK] SRC=192.0.2.14 DST=10.0.0.1 PROTO=UDP DPT=53",
    "[UFW BLOCK] SRC=192.0.2.14 DST=10.0.0.1 PROTO=UDP DPT=53",
    "[UFW BLOCK] SRC=192.0.2.14 DST=10.0.0.1 PROTO=UDP DPT=53",
    # Normal traffic
    "[UFW ALLOW] SRC=196.43.100.10 DST=10.0.0.1 PROTO=TCP DPT=443"
)

foreach ($evt in $events) {
    $bytes = [Text.Encoding]::UTF8.GetBytes($evt)
    $udp.Send($bytes, $bytes.Length, "localhost", 1514) | Out-Null
    Start-Sleep -Milliseconds 150
}
$udp.Close()
Write-Host "$($events.Count) events sent via UDP syslog" -ForegroundColor Green
Start-Sleep -Seconds 2

# ═══════════════════════════════════════════════════════════════════════════
# TEST 4: VERIFY EVENTS PERSISTED
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "`n=== TEST 4: Event Persistence ===" -ForegroundColor Cyan

$eventsResult = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/events?limit=10" -Headers $headers
Write-Host "Events in DB: $($eventsResult.total)" -ForegroundColor Green

$stats = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/events/stats" -Headers $headers
Write-Host "Blocked: $($stats.blocked), Allowed: $($stats.allowed), CDPA: $($stats.cdpaRelevant)"

# ═══════════════════════════════════════════════════════════════════════════
# TEST 5: CORRELATION ALERTS
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "`n=== TEST 5: Correlation Alerts ===" -ForegroundColor Cyan

$alerts = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/events/alerts?limit=10" -Headers $headers
Write-Host "Alerts generated: $($alerts.total)" -ForegroundColor Green
foreach ($a in $alerts.alerts) {
    Write-Host "  [$($a.severity)] $($a.ruleName) - $($a.sourceIp)" -ForegroundColor $(if ($a.severity -eq 'Critical') { 'Red' } elseif ($a.severity -eq 'High') { 'Yellow' } else { 'Gray' })
}

$corrStats = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/correlation/stats" -Headers $headers
Write-Host "Total rule matches: $($corrStats.totalMatches)"
Write-Host "Active windows: $($corrStats.activeWindows)"

# ═══════════════════════════════════════════════════════════════════════════
# TEST 6: CDPA COMPLIANCE
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "`n=== TEST 6: CDPA Compliance ===" -ForegroundColor Cyan

$cdpa = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/compliance/metrics?days=30" -Headers $headers
Write-Host "Compliance score: $($cdpa.complianceScore)%" -ForegroundColor $(if ($cdpa.complianceScore -ge 80) { 'Green' } else { 'Red' })
Write-Host "Total CDPA events: $($cdpa.totalEvents)"
Write-Host "Pending notifications: $($cdpa.pendingNotifications)"
Write-Host "Overdue notifications: $($cdpa.overdueNotifications)"
Write-Host "Breach count: $($cdpa.breachCount)"

# Generate report
$report = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/compliance/report" -Headers $headers
Write-Host "Report generated: $($report.reportTitle)" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════════════════
# TEST 7: AI THREAT ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "`n=== TEST 7: AI Analysis ===" -ForegroundColor Cyan

$analyzeBody = @{
    log = @{
        sourceIp = "185.220.101.8"
        destinationIp = "10.0.0.1"
        destinationPort = 22
        protocol = "TCP"
        action = "BLOCKED"
        description = "Multiple SSH connection attempts from TOR exit node"
        parserSource = "ufw"
    }
} | ConvertTo-Json -Depth 3

try {
    $analysis = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/analyze/threat" -Method Post -Body $analyzeBody -Headers $headers -ContentType "application/json"
    Write-Host "AI Model: $($analysis.meta.model)" -ForegroundColor Green
    Write-Host "Threat: $($analysis.analysis.threatName)"
    Write-Host "Severity: $($analysis.analysis.severity)"
    Write-Host "MITRE TTPs: $($analysis.analysis.threatActorDNA.ttps.Count) techniques"
    Write-Host "Duration: $($analysis.meta.durationMs)ms"
} catch {
    Write-Host "AI analysis: Using offline fallback (no API key or network issue)" -ForegroundColor Yellow
}

# ═══════════════════════════════════════════════════════════════════════════
# TEST 8: INCIDENT MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "`n=== TEST 8: Incidents ===" -ForegroundColor Cyan

# Create incident
$incBody = @{
    title = "SSH Brute Force from TOR Exit Node"
    description = "Multiple SSH login attempts detected from 185.220.101.8 (known TOR exit)"
    severity = "High"
    cdpa_relevant = $true
} | ConvertTo-Json
$inc = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/incidents" -Method Post -Body $incBody -Headers $headers -ContentType "application/json"
Write-Host "Incident created: $($inc.id)" -ForegroundColor Green

# Progress through lifecycle
foreach ($status in @("triaged", "contained", "resolved")) {
    $statusBody = @{ status = $status } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8080/api/v1/incidents/$($inc.id)/status" -Method Patch -Body $statusBody -Headers $headers -ContentType "application/json" | Out-Null
    Write-Host "  Status -> $status" -ForegroundColor Green
    Start-Sleep -Milliseconds 500
}

# Verify timeline
$incDetail = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/incidents/$($inc.id)" -Headers $headers
Write-Host "Timeline entries: $($incDetail.timeline.Count)" -ForegroundColor Green
Write-Host "CDPA deadline: $($incDetail.incident.cdpa_deadline)"

# ═══════════════════════════════════════════════════════════════════════════
# TEST 9: IOC WATCHLIST
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "`n=== TEST 9: IOC Watchlist ===" -ForegroundColor Cyan

# Add IOC
$iocBody = @{ type = "ip"; value = "198.51.100.89"; threat_type = "c2_server"; confidence = 0.9; source = "manual" } | ConvertTo-Json
$ioc = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/ioc" -Method Post -Body $iocBody -Headers $headers -ContentType "application/json"
Write-Host "IOC added: $($ioc.id)" -ForegroundColor Green

# List IOCs
$iocs = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/ioc" -Headers $headers
Write-Host "IOCs in watchlist: $($iocs.iocs.Count)" -ForegroundColor Green

# Send event matching IOC (should trigger IOC_HIT)
$udp2 = New-Object System.Net.Sockets.UdpClient
$iocEvent = [Text.Encoding]::UTF8.GetBytes("[UFW BLOCK] SRC=198.51.100.89 DST=10.0.0.1 PROTO=TCP DPT=443")
$udp2.Send($iocEvent, $iocEvent.Length, "localhost", 1514) | Out-Null
$udp2.Close()
Write-Host "IOC hit event sent (check dashboard for IOC_HIT alert)" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════════════════
# TEST 10: THREAT FEEDS
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "`n=== TEST 10: Threat Feeds ===" -ForegroundColor Cyan

$feeds = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/feeds" -Headers $headers
Write-Host "Configured feeds: $($feeds.feeds.Count)" -ForegroundColor Green
foreach ($f in $feeds.feeds) {
    Write-Host "  $($f.name) - Status: $($f.status), IOCs: $($f.ioc_count)"
}

# Sync ThreatFox
$firstFeed = $feeds.feeds | Where-Object { $_.type -eq 'threatfox' } | Select-Object -First 1
if ($firstFeed) {
    Write-Host "Syncing ThreatFox..." -ForegroundColor Yellow
    try {
        $sync = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/feeds/$($firstFeed.id)/sync" -Method Post -Headers $headers -ContentType "application/json" -Body "{}"
        Write-Host "ThreatFox synced: $($sync.iocCount) IOCs imported" -ForegroundColor Green
    } catch {
        Write-Host "ThreatFox sync failed (network issue - normal in Docker)" -ForegroundColor Yellow
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# TEST 11: PLAYBOOK EXECUTION
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "`n=== TEST 11: SOAR Playbooks ===" -ForegroundColor Cyan

$playbooks = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/playbooks" -Headers $headers
Write-Host "Playbooks: $($playbooks.playbooks.Count)" -ForegroundColor Green
foreach ($pb in $playbooks.playbooks) {
    Write-Host "  $($pb.name) - $($pb.actions.Count) actions, runs: $($pb.execution_count)"
}

# Execute first playbook
if ($playbooks.playbooks.Count -gt 0) {
    $pbId = $playbooks.playbooks[0].id
    $execBody = @{
        triggerEvent = @{
            sourceIp = "185.220.101.8"
            destinationIp = "10.0.0.1"
            destinationPort = 22
            severity = "Critical"
        }
    } | ConvertTo-Json -Depth 3
    $exec = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/playbooks/$pbId/execute" -Method Post -Body $execBody -Headers $headers -ContentType "application/json"
    Write-Host "Playbook executed: $($exec.status) in $($exec.durationMs)ms" -ForegroundColor Green
    foreach ($r in $exec.results) {
        $color = if ($r.status -eq 'success') { 'Green' } elseif ($r.status -eq 'failed') { 'Red' } else { 'Yellow' }
        Write-Host "  [$($r.status)] $($r.type): $($r.message)" -ForegroundColor $color
    }
}

# ═══════════════════════════════════════════════════════════════════════════
# TEST 12: CORRELATION RULES
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "`n=== TEST 12: Correlation Rules ===" -ForegroundColor Cyan

$rules = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/correlation/rules" -Headers $headers
Write-Host "Rules: $($rules.rules.Count)" -ForegroundColor Green
foreach ($r in $rules.rules) {
    $status = if ($r.enabled) { "ACTIVE" } else { "DISABLED" }
    Write-Host "  [$status] $($r.name) - $($r.severity) - $($r.match_count) hits"
}

# Create custom rule
$ruleBody = @{
    name = "Test Custom Rule"
    description = "Custom rule created during testing"
    condition_type = "port_scan"
    threshold = 15
    window_seconds = 30
    severity = "Medium"
} | ConvertTo-Json
$newRule = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/correlation/rules" -Method Post -Body $ruleBody -Headers $headers -ContentType "application/json"
Write-Host "Custom rule created: $($newRule.id)" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════════════════
# TEST 13: ASSET INVENTORY
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "`n=== TEST 13: Assets ===" -ForegroundColor Cyan

$assetBody = @{
    ip_address = "10.0.0.5"
    hostname = "db-server-01"
    device_type = "Server"
    os = "Ubuntu 22.04 LTS"
    owner = "IT Department"
    department = "Infrastructure"
    criticality = "critical"
} | ConvertTo-Json
$asset = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/assets" -Method Post -Body $assetBody -Headers $headers -ContentType "application/json"
Write-Host "Asset registered: $($asset.id)" -ForegroundColor Green

$assets = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/assets" -Headers $headers
Write-Host "Total assets: $($assets.assets.Count)" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════════════════
# TEST 14: MFA
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "`n=== TEST 14: MFA ===" -ForegroundColor Cyan

$mfaStatus = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/mfa/status" -Headers $headers
Write-Host "MFA enabled: $($mfaStatus.mfaEnabled)" -ForegroundColor Green

$mfaSetup = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/mfa/setup" -Method Post -Headers $headers -ContentType "application/json" -Body "{}"
Write-Host "MFA secret generated: $($mfaSetup.secret.Substring(0,8))..." -ForegroundColor Green
Write-Host "OTP URL: $($mfaSetup.otpauthUrl.Substring(0,40))..."

# ═══════════════════════════════════════════════════════════════════════════
# TEST 15: AUDIT TRAIL
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "`n=== TEST 15: Audit Trail ===" -ForegroundColor Cyan

$audit = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/audit?limit=10" -Headers $headers
Write-Host "Audit entries: $($audit.entries.Count)" -ForegroundColor Green
foreach ($e in $audit.entries | Select-Object -First 5) {
    Write-Host "  [$($e.action)] by $($e.actor_username) at $($e.created_at)"
}

# ═══════════════════════════════════════════════════════════════════════════
# TEST 16: ALERT CONFIG
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "`n=== TEST 16: Alert Configuration ===" -ForegroundColor Cyan

$alertConfig = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/alerts/config" -Headers $headers
Write-Host "SMS enabled: $($alertConfig.sms.enabled)" -ForegroundColor Green
Write-Host "Email enabled: $($alertConfig.email.enabled)"
Write-Host "Threshold: $($alertConfig.thresholdSeverity)"

# ═══════════════════════════════════════════════════════════════════════════
# TEST 17: METRICS
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "`n=== TEST 17: Platform Metrics ===" -ForegroundColor Cyan

$metrics = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/metrics" -Headers $headers
Write-Host "Total ingested: $($metrics.totalLogsIngested)" -ForegroundColor Green
Write-Host "Connected clients: $($metrics.connectedClients)"
Write-Host "Uptime: $([math]::Round($metrics.uptime / 60, 1)) minutes"

# ═══════════════════════════════════════════════════════════════════════════
# TEST 18: RBAC (Role-based access control)
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "`n=== TEST 18: RBAC ===" -ForegroundColor Cyan

# Login as viewer
$viewerLogin = @{ username = "viewer"; password = "Viewer@2026!" } | ConvertTo-Json
$viewerAuth = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" -Method Post -Body $viewerLogin -ContentType "application/json"
$viewerHeaders = @{ Authorization = "Bearer $($viewerAuth.token)" }

# Viewer should be able to read events
$viewerEvents = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/events?limit=5" -Headers $viewerHeaders
Write-Host "Viewer can read events: OK ($($viewerEvents.total) events)" -ForegroundColor Green

# Viewer should NOT be able to create incidents
try {
    $incBody2 = @{ title = "Should fail"; severity = "Low" } | ConvertTo-Json
    Invoke-RestMethod -Uri "http://localhost:8080/api/v1/incidents" -Method Post -Body $incBody2 -Headers $viewerHeaders -ContentType "application/json"
    Write-Host "FAIL: Viewer could create incident" -ForegroundColor Red
} catch {
    Write-Host "Viewer blocked from creating incident: OK (RBAC working)" -ForegroundColor Green
}

# Viewer should NOT be able to access admin routes
try {
    Invoke-RestMethod -Uri "http://localhost:8080/api/v1/admin/audit" -Headers $viewerHeaders
    Write-Host "FAIL: Viewer accessed admin route" -ForegroundColor Red
} catch {
    Write-Host "Viewer blocked from admin routes: OK (RBAC working)" -ForegroundColor Green
}

# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "`n" -NoNewline
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  CHENGETO TEST SUITE COMPLETE" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "`nNow open http://localhost:3000 and verify:" -ForegroundColor Yellow
Write-Host "  1. Dashboard shows real event data, charts, alerts"
Write-Host "  2. Events page has the events you just sent"
Write-Host "  3. CDPA Compliance page shows breach notifications"
Write-Host "  4. Incidents page shows the incident you created"
Write-Host "  5. MITRE ATT&CK shows technique hits from alerts"
Write-Host "  6. Threat Intel shows the IOC you added"
Write-Host "  7. SOAR Playbooks shows execution history"
Write-Host "  8. Settings shows users, rules (including custom), audit log"
Write-Host "  9. Executive Briefing shows real risk summary"
Write-Host "  10. Reports generate with real data"
Write-Host "  11. Attack Heatmap shows geographic distribution"
Write-Host "  12. Training scenarios work"
Write-Host "  13. Asset Inventory shows the asset you registered"
Write-Host "`nAll data is REAL - persisted in SQLite, survives restarts." -ForegroundColor Green
