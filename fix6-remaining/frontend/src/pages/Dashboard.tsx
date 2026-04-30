import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { wsService } from '../services/websocket';
import { api } from '../services/api';
import type { LogEntry, CorrelationAlert, GeolocatedThreat } from '../types';
import { IP_GEOLOCATIONS } from '../constants';
import ThreatMap from '../components/ThreatMap';
import {
  Shield, AlertTriangle, Activity, Zap, ArrowUpRight, Flame
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';

const SEVERITY_BG: Record<string, string> = { Critical: 'badge-critical', High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low', Informational: 'badge-info' };

export default function Dashboard() {
  const nav = useNavigate();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [alerts, setAlerts] = useState<CorrelationAlert[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [eventRate, setEventRate] = useState<{ time: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Load persisted data on mount
  useEffect(() => {
    Promise.all([
      api.getEvents({ limit: '100' }).then(r => setLogs(r.events)).catch(() => {}),
      api.getAlerts({ limit: '50' }).then(r => setAlerts(r.alerts)).catch(() => {}),
      api.getEventStats().then(setStats).catch(() => {}),
      api.getComplianceMetrics(7).then(setCompliance).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  // Stream live events
  useEffect(() => {
    const unsubs = [
      wsService.on('NEW_LOG', (log: LogEntry) => {
        setLogs(prev => [log, ...prev].slice(0, 200));
        setStats((prev: any) => prev ? { ...prev, total: prev.total + 1, [log.action === 'BLOCKED' ? 'blocked' : 'allowed']: (prev[log.action === 'BLOCKED' ? 'blocked' : 'allowed'] || 0) + 1 } : prev);
        setEventRate(prev => {
          const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          const last = prev[prev.length - 1];
          if (last?.time === now) return [...prev.slice(0, -1), { ...last, count: last.count + 1 }];
          return [...prev, { time: now, count: 1 }].slice(-30);
        });
      }),
      wsService.on('CORRELATION_ALERT', (alert: CorrelationAlert) => {
        setAlerts(prev => [alert, ...prev].slice(0, 50));
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  // Build geolocated threats for ThreatMap
  const geoThreats = useMemo<GeolocatedThreat[]>(() => {
    return logs
      .filter(log => IP_GEOLOCATIONS[log.sourceIp])
      .map(log => {
        const geo = IP_GEOLOCATIONS[log.sourceIp];
        return { ...log, lat: geo.lat, lng: geo.lng, city: geo.city };
      })
      .slice(0, 50);
  }, [logs]);

  const totalEvents = stats?.total || logs.length;
  const blockedCount = stats?.blocked || logs.filter(l => l.action === 'BLOCKED').length;
  const allowedCount = stats?.allowed || logs.filter(l => l.action === 'ALLOWED').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'Critical').length;
  const highAlerts = alerts.filter(a => a.severity === 'High').length;

  const chartData = stats?.hourly?.length > 0
    ? stats.hourly.map((h: any) => ({ time: h.hour.split(' ')[1] || h.hour, count: h.count }))
    : eventRate;

  const actionData = [
    { name: 'Blocked', value: blockedCount || 0, color: '#ef4444' },
    { name: 'Allowed', value: allowedCount || 0, color: '#22c55e' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Security Operations Center</h1>
          <p className="text-soc-muted text-sm mt-0.5">Real-time threat monitoring and analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="pulse-dot" />
          <span className="text-sm text-green-400 font-medium">Live</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Activity} label="Events ingested" value={totalEvents} color="text-brand-400" />
        <StatCard icon={Zap} label="Last 24h" value={stats?.last24h || 0} color="text-yellow-400" />
        <StatCard icon={Flame} label="Critical alerts" value={criticalAlerts} color="text-red-400" pulse={criticalAlerts > 0} />
        <StatCard icon={AlertTriangle} label="High alerts" value={highAlerts} color="text-orange-400" />
        <StatCard icon={Shield} label="CDPA score" value={`${compliance?.complianceScore ?? 100}%`} color="text-emerald-400" onClick={() => nav('/compliance')} />
      </div>

      {/* Threat Map — YOUR ORIGINAL COMPONENT */}
      {geoThreats.length > 0 && (
        <div className="card p-0 overflow-hidden" style={{ height: '350px' }}>
          <ThreatMap threats={geoThreats} />
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Event ingestion rate</h3>
            <span className="text-xs text-soc-muted">{stats?.hourly?.length > 0 ? 'Last 24 hours' : 'Live'}</span>
          </div>
          <div className="h-48">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs><linearGradient id="evtGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity={0.3} /><stop offset="100%" stopColor="#38bdf8" stopOpacity={0} /></linearGradient></defs>
                  <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="count" stroke="#38bdf8" fill="url(#evtGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-soc-muted text-sm">Send events to see ingestion chart</div>}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-sm mb-4">Action distribution</h3>
          <div className="h-48 flex items-center justify-center">
            {totalEvents === 0 ? <p className="text-soc-muted text-sm">Awaiting events...</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={actionData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">{actionData.map((entry, i) => <Cell key={i} fill={entry.color} />)}</Pie><Tooltip contentStyle={{ background: '#1a2236', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }} /></PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2 text-xs"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /> Blocked ({blockedCount})</div>
            <div className="flex items-center gap-2 text-xs"><div className="w-2.5 h-2.5 rounded-full bg-green-500" /> Allowed ({allowedCount})</div>
          </div>
        </div>
      </div>

      {/* Alerts + Live feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Correlation alerts</h3>
            <span className="text-xs text-soc-muted">{alerts.length} total</span>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {alerts.length === 0 ? <p className="text-soc-muted text-sm text-center py-8">No alerts yet — monitoring...</p> :
            alerts.slice(0, 10).map(alert => (
              <div key={alert.id} className={`card-compact flex items-start gap-3 ${alert.severity === 'Critical' ? 'animate-threat-pulse border-red-500/30' : ''}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${alert.severity === 'Critical' ? 'bg-red-500' : alert.severity === 'High' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{alert.ruleName}</p>
                  <p className="text-xs text-soc-muted mt-0.5">{alert.sourceIp} → {alert.destinationIp}:{alert.destinationPort}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={SEVERITY_BG[alert.severity]}>{alert.severity}</span>
                    <span className="text-[10px] text-soc-muted">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                    {alert.autoRespond && <span className="text-[10px] text-brand-400 font-medium">Auto-responded</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Recent events</h3>
            <button onClick={() => nav('/events')} className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">View all <ArrowUpRight className="w-3 h-3" /></button>
          </div>
          <div className="space-y-1 max-h-80 overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? <p className="text-soc-muted text-sm text-center py-8 font-sans">{loading ? 'Loading...' : 'No events yet. Send syslog to UDP :1514'}</p> :
            logs.slice(0, 20).map(log => (
              <div key={log.id} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-white/5 transition-colors">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.action === 'BLOCKED' ? 'bg-red-500' : 'bg-green-500'}`} />
                <span className="text-soc-muted w-16 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className="text-soc-text w-28 shrink-0 truncate">{log.sourceIp}</span>
                <span className="text-soc-muted">→</span>
                <span className="text-soc-text shrink-0">{log.destinationPort}/{log.protocol}</span>
                <span className={`ml-auto shrink-0 ${log.action === 'BLOCKED' ? 'text-red-400' : 'text-green-400'}`}>{log.action}</span>
                {log.cdpa?.cdpaRelevant && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 rounded">CDPA</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, pulse, onClick }: { icon: any; label: string; value: number | string; color: string; pulse?: boolean; onClick?: () => void }) {
  return (
    <div className={`card flex items-center gap-4 ${onClick ? 'cursor-pointer hover:border-brand-500/30 transition-colors' : ''} ${pulse ? 'animate-threat-pulse' : ''}`} onClick={onClick}>
      <div className={`w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
      <div><p className="stat-value">{value}</p><p className="stat-label">{label}</p></div>
    </div>
  );
}
