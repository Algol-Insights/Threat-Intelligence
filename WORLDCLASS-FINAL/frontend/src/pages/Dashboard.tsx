import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { wsService } from '../services/websocket';
import { api } from '../services/api';
import type { FirewallLog, GeolocatedThreat } from '../types';
import { IP_GEOLOCATIONS } from '../constants';
import ThreatMap from '../components/ThreatMap';
import {
  Shield, AlertTriangle, Activity, Zap, ArrowUpRight, Flame, Scale,
  TrendingUp, Clock, Server, Eye, ShieldAlert, Radio
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

export default function Dashboard() {
  const nav = useNavigate();
  const [logs, setLogs] = useState<FirewallLog[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [correlation, setCorrelation] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [eventRate, setEventRate] = useState<{ time: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Load ALL real data on mount
  useEffect(() => {
    Promise.all([
      api.getEvents({ limit: '200' }).then(r => setLogs(r.events)).catch(() => {}),
      api.getAlerts({ limit: '50' }).then(r => setAlerts(r.alerts)).catch(() => {}),
      api.getEventStats().then(setStats).catch(() => {}),
      api.getComplianceMetrics(30).then(setCompliance).catch(() => {}),
      api.getCorrelationStats().then(setCorrelation).catch(() => {}),
      api.getIncidents({ limit: '10' }).then(r => setIncidents(r.incidents)).catch(() => {}),
      api.getMetrics().then(setMetrics).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  // Stream live data
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
      wsService.on('CORRELATION_ALERT', (alert: any) => setAlerts(prev => [alert, ...prev].slice(0, 50))),
      wsService.on('CDPA_BREACH', () => api.getComplianceMetrics(30).then(setCompliance).catch(() => {})),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  const geoThreats = useMemo<GeolocatedThreat[]>(() => {
    return logs.filter(l => IP_GEOLOCATIONS[l.sourceIp]).map(l => {
      const g = IP_GEOLOCATIONS[l.sourceIp];
      return { ...l, lat: g.lat, lng: g.lng, city: g.city };
    }).slice(0, 50);
  }, [logs]);

  const t = stats?.total || logs.length;
  const blocked = stats?.blocked || logs.filter(l => l.action === 'BLOCKED').length;
  const allowed = stats?.allowed || logs.filter(l => l.action === 'ALLOWED').length;
  const critical = alerts.filter(a => a.severity === 'Critical').length;
  const high = alerts.filter(a => a.severity === 'High').length;
  const openIncidents = incidents.filter(i => i.status === 'open' || i.status === 'triaged').length;
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

  // Parser breakdown from real data
  const parserData = stats?.byParser?.map((p: any) => ({ name: p.parser_source || 'unknown', count: p.count })) || [];

  return (
    <div className="space-y-5">
      {/* Header with system status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security Operations Center</h1>
          <p className="text-soc-muted text-sm mt-0.5">Chengeto CTI Platform — Real-time threat monitoring</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
            <Radio className="w-3 h-3 text-green-400 animate-pulse" />
            <span className="text-xs text-green-400 font-medium">System operational</span>
          </div>
          {metrics && (
            <div className="text-xs text-soc-muted font-mono">
              Uptime: {Math.floor((metrics.uptime || 0) / 3600)}h {Math.floor(((metrics.uptime || 0) % 3600) / 60)}m
            </div>
          )}
        </div>
      </div>

      {/* KPI row — the numbers that matter */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        <KPI label="Total events" value={t} icon={Activity} color="text-brand-400" bg="bg-brand-500/10" />
        <KPI label="Threats blocked" value={blocked} icon={Shield} color="text-red-400" bg="bg-red-500/10" />
        <KPI label="Critical alerts" value={critical} icon={Flame} color="text-red-500" bg="bg-red-500/10" pulse={critical > 0} onClick={() => nav('/events')} />
        <KPI label="Open incidents" value={openIncidents} icon={AlertTriangle} color="text-orange-400" bg="bg-orange-500/10" onClick={() => nav('/incidents')} />
        <KPI label="CDPA score" value={`${cdpaScore}%`} icon={Scale} color={cdpaScore >= 80 ? 'text-emerald-400' : 'text-red-400'} bg={cdpaScore >= 80 ? 'bg-emerald-500/10' : 'bg-red-500/10'} onClick={() => nav('/compliance')} />
        <KPI label="Active rules" value={correlation?.rules?.filter((r: any) => r.enabled)?.length || 0} icon={ShieldAlert} color="text-purple-400" bg="bg-purple-500/10" />
      </div>

      {/* CDPA compliance banner — only shows when action needed */}
      {compliance && (compliance.pendingNotifications > 0 || compliance.overdueNotifications > 0) && (
        <div className={`rounded-xl p-4 flex items-center justify-between cursor-pointer transition-colors ${compliance.overdueNotifications > 0 ? 'bg-red-500/10 border border-red-500/30 hover:bg-red-500/15' : 'bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/15'}`}
          onClick={() => nav('/compliance')}>
          <div className="flex items-center gap-3">
            <Scale className={`w-5 h-5 ${compliance.overdueNotifications > 0 ? 'text-red-400' : 'text-yellow-400'}`} />
            <div>
              <p className="text-sm font-semibold">{compliance.overdueNotifications > 0 ? 'CDPA: Overdue notifications require immediate action' : 'CDPA: Breach notifications pending'}</p>
              <p className="text-xs text-soc-muted">{compliance.pendingNotifications} pending · {compliance.overdueNotifications} overdue · 72-hour POTRAZ deadline</p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-soc-muted" />
        </div>
      )}

      {/* Threat map */}
      {geoThreats.length > 0 && (
        <div className="card p-0 overflow-hidden rounded-xl" style={{ height: '320px' }}>
          <ThreatMap threats={geoThreats} />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Event timeline — full width feel */}
        <div className="card lg:col-span-7">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Event timeline</h3>
            <span className="text-[10px] text-soc-muted uppercase tracking-wider">{stats?.hourly?.length > 0 ? 'Last 24h' : 'Live'}</span>
          </div>
          <div className="h-44">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity={0.25} /><stop offset="100%" stopColor="#38bdf8" stopOpacity={0} /></linearGradient></defs>
                  <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px', color: '#e2e8f0' }} />
                  <Area type="monotone" dataKey="count" stroke="#38bdf8" fill="url(#eg)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-soc-muted text-xs">Awaiting event data</div>}
          </div>
        </div>

        {/* Action split + severity */}
        <div className="card lg:col-span-2">
          <h3 className="text-sm font-semibold mb-3">Actions</h3>
          <div className="h-44 flex flex-col items-center justify-center">
            {t === 0 ? <span className="text-xs text-soc-muted">—</span> : (
              <>
                <ResponsiveContainer width="100%" height={110}>
                  <PieChart><Pie data={[{ v: blocked, c: '#ef4444' }, { v: allowed, c: '#22c55e' }]} cx="50%" cy="50%" innerRadius={35} outerRadius={48} paddingAngle={3} dataKey="v">{[{ c: '#ef4444' }, { c: '#22c55e' }].map((e, i) => <Cell key={i} fill={e.c} />)}</Pie></PieChart>
                </ResponsiveContainer>
                <div className="flex gap-4 text-[10px] mt-1">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />{blocked} blocked</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />{allowed} allowed</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Alert severity distribution */}
        <div className="card lg:col-span-3">
          <h3 className="text-sm font-semibold mb-3">Alert severity</h3>
          <div className="h-44">
            {severityData.length === 0 ? <div className="h-full flex items-center justify-center text-xs text-soc-muted">No alerts</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityData} layout="vertical">
                  <XAxis type="number" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={55} />
                  <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '11px' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
                    {severityData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Alerts + Events — the operational core */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Correlation alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Active alerts</h3>
            <span className="text-[10px] text-soc-muted">{alerts.length} total</span>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {alerts.length === 0 ? <p className="text-soc-muted text-xs text-center py-6">No correlation alerts — system monitoring</p> :
            alerts.slice(0, 8).map(a => (
              <div key={a.id} className={`flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer ${a.severity === 'Critical' ? 'ring-1 ring-red-500/30' : ''}`}
                onClick={() => nav('/events')}>
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${a.severity === 'Critical' ? 'bg-red-500' : a.severity === 'High' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold truncate">{a.ruleName}</p>
                    <span className={`badge text-[9px] ${a.severity === 'Critical' ? 'badge-critical' : a.severity === 'High' ? 'badge-high' : 'badge-medium'}`}>{a.severity}</span>
                  </div>
                  <p className="text-[11px] text-soc-muted mt-0.5 font-mono">{a.sourceIp} → {a.destinationIp}:{a.destinationPort}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-soc-muted">{new Date(a.timestamp).toLocaleString()}</span>
                    {a.autoRespond && <span className="text-[10px] text-green-400 font-medium">✓ Auto-blocked</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live event stream */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Event stream</h3>
              <div className="pulse-dot" />
            </div>
            <button onClick={() => nav('/events')} className="text-[10px] text-brand-400 hover:text-brand-300 flex items-center gap-1">
              Full view <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-0.5 max-h-72 overflow-y-auto font-mono text-[11px]">
            {logs.length === 0 ? <p className="text-soc-muted text-xs text-center py-6 font-sans">{loading ? 'Loading...' : 'Awaiting syslog events on UDP :1514'}</p> :
            logs.slice(0, 25).map(l => (
              <div key={l.id} className="flex items-center gap-2 py-1 px-2 rounded hover:bg-white/[0.03] transition-colors">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${l.action === 'BLOCKED' ? 'bg-red-500' : 'bg-green-500'}`} />
                <span className="text-soc-muted/70 w-14 shrink-0">{new Date(l.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                <span className="w-24 shrink-0 truncate">{l.sourceIp}</span>
                <span className="text-soc-muted/40">→</span>
                <span className="text-soc-muted w-10 shrink-0 text-right">{l.destinationPort}</span>
                <span className={`w-14 shrink-0 text-right ${l.action === 'BLOCKED' ? 'text-red-400/80' : 'text-green-400/80'}`}>{l.action}</span>
                <span className="text-soc-muted/40 truncate flex-1 text-right">{l.parserSource}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row — operational context */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Open incidents */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Open incidents</h3>
            <button onClick={() => nav('/incidents')} className="text-[10px] text-brand-400 hover:text-brand-300">View all</button>
          </div>
          {incidents.filter(i => i.status !== 'closed' && i.status !== 'resolved').length === 0 ? (
            <p className="text-xs text-soc-muted text-center py-4">No open incidents</p>
          ) : incidents.filter(i => i.status !== 'closed' && i.status !== 'resolved').slice(0, 4).map(inc => (
            <div key={inc.id} className="flex items-center justify-between py-2 border-b border-soc-border/30 last:border-0 cursor-pointer hover:bg-white/[0.02] rounded px-2 -mx-2" onClick={() => nav('/incidents')}>
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${inc.severity === 'Critical' ? 'bg-red-500' : inc.severity === 'High' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                <span className="text-xs truncate">{inc.title}</span>
              </div>
              <span className={`badge text-[9px] ml-2 shrink-0 ${inc.status === 'open' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>{inc.status}</span>
            </div>
          ))}
        </div>

        {/* Correlation engine status */}
        <div className="card">
          <h3 className="text-sm font-semibold mb-3">Correlation engine</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs"><span className="text-soc-muted">Active rules</span><span className="font-mono">{correlation?.rules?.filter((r: any) => r.enabled)?.length || 0}</span></div>
            <div className="flex justify-between text-xs"><span className="text-soc-muted">Total matches</span><span className="font-mono text-red-400">{correlation?.totalMatches || 0}</span></div>
            <div className="flex justify-between text-xs"><span className="text-soc-muted">Active windows</span><span className="font-mono">{correlation?.activeWindows || 0}</span></div>
            <div className="flex justify-between text-xs"><span className="text-soc-muted">Connected analysts</span><span className="font-mono text-green-400">{metrics?.connectedClients || 0}</span></div>
          </div>
          {correlation?.rules?.filter((r: any) => r.match_count > 0)?.slice(0, 3).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between mt-2 pt-2 border-t border-soc-border/30 text-[10px]">
              <span className="text-soc-muted truncate">{r.name}</span>
              <span className="font-mono text-soc-text">{r.match_count}</span>
            </div>
          ))}
        </div>

        {/* Source breakdown */}
        <div className="card">
          <h3 className="text-sm font-semibold mb-3">Event sources</h3>
          {parserData.length === 0 ? <p className="text-xs text-soc-muted text-center py-4">No data</p> :
          <div className="space-y-2">
            {parserData.map((p: any) => {
              const pct = t > 0 ? Math.round((p.count / t) * 100) : 0;
              return (
                <div key={p.name}>
                  <div className="flex justify-between text-xs mb-1"><span className="text-soc-muted capitalize">{p.name}</span><span className="font-mono">{p.count} ({pct}%)</span></div>
                  <div className="h-1.5 bg-soc-border rounded-full overflow-hidden"><div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>}
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, icon: Icon, color, bg, pulse, onClick }: { label: string; value: number | string; icon: any; color: string; bg: string; pulse?: boolean; onClick?: () => void }) {
  return (
    <div className={`rounded-xl border border-soc-border p-4 ${bg} ${onClick ? 'cursor-pointer hover:brightness-110 transition-all' : ''} ${pulse ? 'animate-threat-pulse' : ''}`} onClick={onClick}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-[10px] text-soc-muted uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-2xl font-bold tracking-tight ${color}`}>{value}</p>
    </div>
  );
}
