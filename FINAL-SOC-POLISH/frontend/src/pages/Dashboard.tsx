import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { wsService } from '../services/websocket';
import { api } from '../services/api';
import type { FirewallLog, GeolocatedThreat } from '../types';
import { IP_GEOLOCATIONS } from '../constants';
import ThreatMap from '../components/ThreatMap';
import {
  Shield, AlertTriangle, Activity, Zap, ArrowUpRight, Flame, Scale,
  ShieldAlert, Radio, RefreshCw
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

const SEV: Record<string, string> = { Critical: 'badge-critical', High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low' };

export default function Dashboard() {
  const nav = useNavigate();
  const [logs, setLogs] = useState<FirewallLog[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [correlation, setCorrelation] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [eventRate, setEventRate] = useState<{ time: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const refreshTimerRef = useRef<any>(null);

  // ── Load real data ────────────────────────────────────────────────────────
  const fetchAll = useCallback(() => {
    Promise.all([
      api.getEvents({ limit: '150' }).then(r => setLogs(r.events)).catch(() => {}),
      api.getAlerts({ limit: '50' }).then(r => setAlerts(r.alerts)).catch(() => {}),
      api.getEventStats().then(setStats).catch(() => {}),
      api.getComplianceMetrics(30).then(setCompliance).catch(() => {}),
      api.getCorrelationStats().then(setCorrelation).catch(() => {}),
      api.getMetrics().then(setMetrics).catch(() => {}),
    ]).finally(() => { setLoading(false); setLastRefresh(Date.now()); });
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Auto-refresh every 30 seconds ─────────────────────────────────────────
  useEffect(() => {
    refreshTimerRef.current = setInterval(fetchAll, 30000);
    return () => clearInterval(refreshTimerRef.current);
  }, [fetchAll]);

  // ── Stream live events ────────────────────────────────────────────────────
  useEffect(() => {
    const unsubs = [
      wsService.on('NEW_LOG', (log: FirewallLog) => {
        setLogs(prev => [log, ...prev].slice(0, 300));
        setStats((p: any) => p ? { ...p, total: p.total + 1, [log.action === 'BLOCKED' ? 'blocked' : 'allowed']: (p[log.action === 'BLOCKED' ? 'blocked' : 'allowed'] || 0) + 1 } : p);
        setEventRate(prev => {
          const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          const last = prev[prev.length - 1];
          if (last?.time === now) return [...prev.slice(0, -1), { ...last, count: last.count + 1 }];
          return [...prev, { time: now, count: 1 }].slice(-30);
        });
      }),
      wsService.on('CORRELATION_ALERT', (a: any) => setAlerts(prev => [a, ...prev].slice(0, 50))),
      wsService.on('CDPA_BREACH', () => api.getComplianceMetrics(30).then(setCompliance).catch(() => {})),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  // ── Derived data ──────────────────────────────────────────────────────────
  const geoThreats = useMemo<GeolocatedThreat[]>(() =>
    logs.filter(l => IP_GEOLOCATIONS[l.sourceIp]).map(l => ({ ...l, ...IP_GEOLOCATIONS[l.sourceIp] })).slice(0, 80),
  [logs]);

  const t = stats?.total || logs.length;
  const blocked = stats?.blocked || 0;
  const allowed = stats?.allowed || 0;
  const critical = alerts.filter(a => a.severity === 'Critical').length;
  const high = alerts.filter(a => a.severity === 'High').length;
  const cdpaScore = compliance?.complianceScore ?? 100;

  const chartData = stats?.hourly?.length > 0
    ? stats.hourly.map((h: any) => ({ time: h.hour?.split(' ')[1] || h.hour, count: h.count }))
    : eventRate;

  const severityData = [
    { name: 'Critical', value: critical, fill: '#ef4444' },
    { name: 'High', value: high, fill: '#f97316' },
    { name: 'Medium', value: alerts.filter(a => a.severity === 'Medium').length, fill: '#eab308' },
    { name: 'Low', value: alerts.filter(a => a.severity === 'Low').length, fill: '#22c55e' },
  ].filter(d => d.value > 0);

  const parserData = stats?.byParser?.map((p: any) => ({ name: p.parser_source || 'syslog', count: p.count })) || [];

  const secSinceRefresh = Math.floor((Date.now() - lastRefresh) / 1000);

  return (
    <div className="space-y-5">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Security Operations Center</h1>
          <p className="text-soc-muted text-xs mt-0.5">Chengeto CTI Platform — Algol Cyber Security</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchAll} className="flex items-center gap-1.5 text-[10px] text-soc-muted hover:text-soc-text transition-colors" title="Refresh now">
            <RefreshCw className="w-3 h-3" /> {secSinceRefresh}s ago
          </button>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20">
            <Radio className="w-3 h-3 text-green-400 animate-pulse" />
            <span className="text-[10px] text-green-400 font-semibold">OPERATIONAL</span>
          </div>
        </div>
      </div>

      {/* ── KPI strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2.5">
        <KPI label="Total events" value={t} icon={Activity} color="text-sky-400" bg="bg-sky-500/8" />
        <KPI label="Blocked" value={blocked} icon={Shield} color="text-red-400" bg="bg-red-500/8" />
        <KPI label="Critical" value={critical} icon={Flame} color="text-red-500" bg="bg-red-500/8" pulse={critical > 0} onClick={() => nav('/events')} />
        <KPI label="High" value={high} icon={AlertTriangle} color="text-orange-400" bg="bg-orange-500/8" onClick={() => nav('/events')} />
        <KPI label="CDPA" value={`${cdpaScore}%`} icon={Scale} color={cdpaScore >= 80 ? 'text-emerald-400' : 'text-red-400'} bg={cdpaScore >= 80 ? 'bg-emerald-500/8' : 'bg-red-500/8'} onClick={() => nav('/compliance')} />
        <KPI label="Rules" value={correlation?.rules?.filter((r: any) => r.enabled)?.length || 0} icon={ShieldAlert} color="text-violet-400" bg="bg-violet-500/8" />
      </div>

      {/* ── CDPA urgency banner ───────────────────────────────────────────── */}
      {compliance && (compliance.pendingNotifications > 0 || compliance.overdueNotifications > 0) && (
        <div className={`rounded-lg p-3 flex items-center justify-between cursor-pointer transition-all hover:brightness-110 ${compliance.overdueNotifications > 0 ? 'bg-red-500/10 border border-red-500/25' : 'bg-yellow-500/8 border border-yellow-500/20'}`}
          onClick={() => nav('/compliance')}>
          <div className="flex items-center gap-2.5">
            <Scale className={`w-4 h-4 ${compliance.overdueNotifications > 0 ? 'text-red-400' : 'text-yellow-400'}`} />
            <span className="text-xs font-semibold">{compliance.overdueNotifications > 0 ? 'OVERDUE: POTRAZ notifications require immediate action' : 'Pending CDPA breach notifications'}</span>
            <span className="text-[10px] text-soc-muted">{compliance.pendingNotifications} pending · {compliance.overdueNotifications} overdue</span>
          </div>
          <ArrowUpRight className="w-3.5 h-3.5 text-soc-muted" />
        </div>
      )}

      {/* ── Threat map ────────────────────────────────────────────────────── */}
      {geoThreats.length > 0 && (
        <div className="card p-0 overflow-hidden rounded-xl" style={{ height: '300px' }}>
          <ThreatMap threats={geoThreats} />
        </div>
      )}

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-12 gap-3">
        {/* Timeline */}
        <div className="card col-span-12 lg:col-span-7">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-soc-muted">Event Timeline</h3>
            <span className="text-[9px] text-soc-muted/60">{stats?.hourly?.length > 0 ? 'Last 24h' : 'Live'}</span>
          </div>
          <div className="h-40">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity={0.2} /><stop offset="100%" stopColor="#38bdf8" stopOpacity={0} /></linearGradient></defs>
                  <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid #1e293b', borderRadius: '6px', fontSize: '10px', color: '#e2e8f0' }} />
                  <Area type="monotone" dataKey="count" stroke="#38bdf8" fill="url(#eg)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-soc-muted text-xs">Awaiting event data</div>}
          </div>
        </div>

        {/* Actions donut */}
        <div className="card col-span-6 lg:col-span-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-soc-muted mb-2">Actions</h3>
          <div className="h-40 flex flex-col items-center justify-center">
            {t === 0 ? <span className="text-[10px] text-soc-muted">—</span> : (
              <>
                <ResponsiveContainer width="100%" height={100}>
                  <PieChart><Pie data={[{ v: blocked, c: '#ef4444' }, { v: allowed, c: '#22c55e' }]} cx="50%" cy="50%" innerRadius={30} outerRadius={42} paddingAngle={3} dataKey="v">{[{ c: '#ef4444' }, { c: '#22c55e' }].map((e, i) => <Cell key={i} fill={e.c} />)}</Pie></PieChart>
                </ResponsiveContainer>
                <div className="flex gap-3 text-[9px] mt-1">
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />{blocked}</span>
                  <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />{allowed}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Severity bars */}
        <div className="card col-span-6 lg:col-span-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-soc-muted mb-2">Alert Severity</h3>
          <div className="h-40">
            {severityData.length === 0 ? <div className="h-full flex items-center justify-center text-[10px] text-soc-muted">No alerts</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityData} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <XAxis type="number" tick={{ fill: '#475569', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid #1e293b', borderRadius: '6px', fontSize: '10px' }} />
                  <Bar dataKey="value" radius={[0, 3, 3, 0]} barSize={12}>{severityData.map((d, i) => <Cell key={i} fill={d.fill} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Alerts + Event stream ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Correlation alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-soc-muted">Active Alerts</h3>
            <span className="text-[9px] text-soc-muted/60">{alerts.length}</span>
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {alerts.length === 0 ? <p className="text-soc-muted text-[11px] text-center py-6">System monitoring — no alerts</p> :
            alerts.slice(0, 8).map(a => (
              <div key={a.id} className={`flex items-start gap-2.5 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer ${a.severity === 'Critical' ? 'ring-1 ring-red-500/20' : ''}`} onClick={() => nav('/events')}>
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${a.severity === 'Critical' ? 'bg-red-500' : a.severity === 'High' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold truncate">{a.ruleName}</span>
                    <span className={`text-[8px] px-1 py-0.5 rounded ${SEV[a.severity] || ''}`}>{a.severity}</span>
                  </div>
                  <p className="text-[10px] text-soc-muted font-mono mt-0.5">{a.sourceIp} → :{a.destinationPort}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-soc-muted/60">{new Date(a.timestamp).toLocaleTimeString()}</span>
                    {a.autoRespond && <span className="text-[9px] text-green-400/80">✓ blocked</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Event stream */}
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-soc-muted">Event Stream</h3>
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            </div>
            <button onClick={() => nav('/events')} className="text-[9px] text-brand-400 hover:text-brand-300 flex items-center gap-0.5">
              Full view <ArrowUpRight className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="space-y-0 max-h-64 overflow-y-auto font-mono text-[10px]">
            {logs.length === 0 ? <p className="text-soc-muted text-[11px] text-center py-6 font-sans">{loading ? 'Loading...' : 'Awaiting syslog on UDP :1514'}</p> :
            logs.slice(0, 30).map(l => (
              <div key={l.id} className="flex items-center gap-1.5 py-[3px] px-1.5 rounded hover:bg-white/[0.03] transition-colors">
                <span className={`w-1 h-1 rounded-full shrink-0 ${l.action === 'BLOCKED' ? 'bg-red-500' : 'bg-green-500'}`} />
                <span className="text-soc-muted/50 w-12 shrink-0">{new Date(l.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                <span className="w-[88px] shrink-0 truncate">{l.sourceIp}</span>
                <span className="text-soc-muted/30">→</span>
                <span className="text-soc-muted/70 w-8 shrink-0 text-right">{l.destinationPort}</span>
                <span className={`w-12 shrink-0 text-right ${l.action === 'BLOCKED' ? 'text-red-400/70' : 'text-green-400/70'}`}>{l.action}</span>
                {l.cdpa?.cdpaRelevant && <span className="text-[7px] bg-emerald-500/15 text-emerald-400/80 px-1 rounded ml-auto">CDPA</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom context ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Correlation engine */}
        <div className="card">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-soc-muted mb-2">Correlation Engine</h3>
          <div className="space-y-1.5 text-[11px]">
            <Row label="Active rules" value={correlation?.rules?.filter((r: any) => r.enabled)?.length || 0} />
            <Row label="Total matches" value={correlation?.totalMatches || 0} color="text-red-400" />
            <Row label="Active windows" value={correlation?.activeWindows || 0} />
            <Row label="Analysts online" value={metrics?.connectedClients || 0} color="text-green-400" />
          </div>
        </div>

        {/* Source breakdown */}
        <div className="card">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-soc-muted mb-2">Event Sources</h3>
          {parserData.length === 0 ? <p className="text-[10px] text-soc-muted text-center py-3">No data</p> :
          <div className="space-y-2">
            {parserData.map((p: any) => {
              const pct = t > 0 ? Math.round((p.count / t) * 100) : 0;
              return (
                <div key={p.name}>
                  <div className="flex justify-between text-[10px] mb-0.5"><span className="text-soc-muted capitalize">{p.name}</span><span className="font-mono">{p.count}</span></div>
                  <div className="h-1 bg-soc-border/50 rounded-full overflow-hidden"><div className="h-full bg-brand-500/70 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>}
        </div>

        {/* System */}
        <div className="card">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-soc-muted mb-2">System</h3>
          <div className="space-y-1.5 text-[11px]">
            <Row label="Uptime" value={metrics ? `${Math.floor(metrics.uptime / 3600)}h ${Math.floor((metrics.uptime % 3600) / 60)}m` : '—'} />
            <Row label="Ingested total" value={metrics?.totalLogsIngested || t} />
            <Row label="Events/min" value={metrics?.logsPerMinute || 0} />
            <Row label="CDPA breaches" value={compliance?.breachCount || 0} color={(compliance?.breachCount || 0) > 0 ? 'text-red-400' : undefined} />
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, icon: Icon, color, bg, pulse, onClick }: { label: string; value: number | string; icon: any; color: string; bg: string; pulse?: boolean; onClick?: () => void }) {
  return (
    <div className={`rounded-lg border border-soc-border/50 p-3 ${bg} ${onClick ? 'cursor-pointer hover:brightness-125 transition-all' : ''} ${pulse ? 'animate-threat-pulse' : ''}`} onClick={onClick}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${color}`} />
        <span className="text-[9px] text-soc-muted uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-xl font-bold tracking-tight ${color}`}>{value}</p>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="flex justify-between"><span className="text-soc-muted">{label}</span><span className={`font-mono ${color || 'text-soc-text'}`}>{value}</span></div>
  );
}
