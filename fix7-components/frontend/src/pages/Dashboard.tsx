import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { wsService } from '../services/websocket';
import { api } from '../services/api';
import type { FirewallLog, ThreatAnalysis, GeolocatedThreat, Severity, Alert as AlertType, NetworkDevice } from '../types';
import { IP_GEOLOCATIONS, ALERTING_RULES } from '../constants';

// YOUR ORIGINAL COMPONENTS
import ThreatMap from '../components/ThreatMap';
import SummaryMetrics from '../components/SummaryMetrics';
import TopThreats from '../components/TopThreats';
import Alerts from '../components/Alerts';
import LogFeed from '../components/LogFeed';
import TrainingScenario from '../components/TrainingScenario';

import { Shield, AlertTriangle, Activity, Zap, ArrowUpRight, Flame } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
  const nav = useNavigate();
  const [logs, setLogs] = useState<FirewallLog[]>([]);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [correlationAlerts, setCorrelationAlerts] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [compliance, setCompliance] = useState<any>(null);
  const [selectedLog, setSelectedLog] = useState<FirewallLog | null>(null);
  const [analyzedLogs, setAnalyzedLogs] = useState<Record<string, ThreatAnalysis>>({});
  const [severityFilter, setSeverityFilter] = useState<Severity | 'All'>('All' as any);
  const [eventRate, setEventRate] = useState<{ time: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Load persisted data
  useEffect(() => {
    Promise.all([
      api.getEvents({ limit: '100' }).then(r => setLogs(r.events)).catch(() => {}),
      api.getAlerts({ limit: '50' }).then(r => setCorrelationAlerts(r.alerts)).catch(() => {}),
      api.getEventStats().then(setStats).catch(() => {}),
      api.getComplianceMetrics(7).then(setCompliance).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  // Stream live events + generate alerts
  useEffect(() => {
    const unsubs = [
      wsService.on('NEW_LOG', (log: FirewallLog) => {
        setLogs(prev => [log, ...prev].slice(0, 200));
        setStats((prev: any) => prev ? { ...prev, total: prev.total + 1 } : prev);
        // Generate keyword alerts (YOUR original alerting logic)
        for (const rule of ALERTING_RULES) {
          if (log.description.toLowerCase().includes(rule.keyword)) {
            const newAlert: AlertType = { id: `alert-${Date.now()}`, message: rule.message, timestamp: new Date().toISOString(), logId: log.id };
            setAlerts(prev => [newAlert, ...prev].slice(0, 20));
          }
        }
        setEventRate(prev => {
          const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          const last = prev[prev.length - 1];
          if (last?.time === now) return [...prev.slice(0, -1), { ...last, count: last.count + 1 }];
          return [...prev, { time: now, count: 1 }].slice(-30);
        });
      }),
      wsService.on('CORRELATION_ALERT', (alert: any) => {
        setCorrelationAlerts(prev => [alert, ...prev].slice(0, 50));
      }),
    ];
    return () => unsubs.forEach(u => u());
  }, []);

  // Geolocated threats for ThreatMap
  const geoThreats = useMemo<GeolocatedThreat[]>(() => {
    return logs.filter(log => IP_GEOLOCATIONS[log.sourceIp]).map(log => {
      const geo = IP_GEOLOCATIONS[log.sourceIp];
      return { ...log, lat: geo.lat, lng: geo.lng, city: geo.city };
    }).slice(0, 50);
  }, [logs]);

  // Filter logs for LogFeed
  const filteredLogs = useMemo(() => {
    if (severityFilter === 'All') return logs;
    return logs.filter(l => {
      const analysis = analyzedLogs[l.id];
      return analysis && analysis.severity === severityFilter;
    });
  }, [logs, severityFilter, analyzedLogs]);

  const handleSelectLog = useCallback((log: FirewallLog) => { setSelectedLog(log); nav('/events'); }, [nav]);
  const handleDismissAlert = useCallback((id: string) => { setAlerts(prev => prev.filter(a => a.id !== id)); }, []);
  const handleAlertClick = useCallback((logId: string) => {
    const log = logs.find(l => l.id === logId);
    if (log) { setSelectedLog(log); nav('/events'); }
  }, [logs, nav]);

  const totalEvents = stats?.total || logs.length;
  const blockedCount = stats?.blocked || logs.filter(l => l.action === 'BLOCKED').length;
  const allowedCount = stats?.allowed || logs.filter(l => l.action === 'ALLOWED').length;
  const criticalAlerts = correlationAlerts.filter(a => a.severity === 'Critical').length;

  const chartData = stats?.hourly?.length > 0
    ? stats.hourly.map((h: any) => ({ time: h.hour?.split(' ')[1] || h.hour, count: h.count }))
    : eventRate;

  const SEVERITY_BG: Record<string, string> = { Critical: 'badge-critical', High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low', Informational: 'badge-info' };

  return (
    <div className="space-y-6">
      {/* YOUR Alerts component — fixed position notifications */}
      <Alerts alerts={alerts} onDismiss={handleDismissAlert} onAlertClick={handleAlertClick} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Security Operations Center</h1>
          <p className="text-soc-muted text-sm mt-0.5">Real-time threat monitoring and analysis</p>
        </div>
        <div className="flex items-center gap-2"><div className="pulse-dot" /><span className="text-sm text-green-400 font-medium">Live</span></div>
      </div>

      {/* YOUR SummaryMetrics component */}
      <SummaryMetrics logs={logs} analyzedCount={Object.keys(analyzedLogs).length} />

      {/* YOUR ThreatMap component */}
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
            ) : <div className="h-full flex items-center justify-center text-soc-muted text-sm">Send events to see chart</div>}
          </div>
        </div>
        <div className="card">
          <h3 className="font-semibold text-sm mb-4">Action distribution</h3>
          <div className="h-48 flex items-center justify-center">
            {totalEvents === 0 ? <p className="text-soc-muted text-sm">Awaiting events...</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={[{ name: 'Blocked', value: blockedCount || 0, color: '#ef4444' }, { name: 'Allowed', value: allowedCount || 0, color: '#22c55e' }]} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">{[{ color: '#ef4444' }, { color: '#22c55e' }].map((e, i) => <Cell key={i} fill={e.color} />)}</Pie></PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2 text-xs"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /> Blocked ({blockedCount})</div>
            <div className="flex items-center gap-2 text-xs"><div className="w-2.5 h-2.5 rounded-full bg-green-500" /> Allowed ({allowedCount})</div>
          </div>
        </div>
      </div>

      {/* YOUR TopThreats + Correlation alerts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopThreats analyzedLogs={analyzedLogs} logs={logs} onSelectLog={handleSelectLog} />

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Correlation alerts</h3>
            <span className="text-xs text-soc-muted">{correlationAlerts.length} total</span>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {correlationAlerts.length === 0 ? <p className="text-soc-muted text-sm text-center py-8">No alerts yet</p> :
            correlationAlerts.slice(0, 8).map(alert => (
              <div key={alert.id} className={`card-compact flex items-start gap-3 ${alert.severity === 'Critical' ? 'animate-threat-pulse border-red-500/30' : ''}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${alert.severity === 'Critical' ? 'bg-red-500' : alert.severity === 'High' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{alert.ruleName}</p>
                  <p className="text-xs text-soc-muted mt-0.5">{alert.sourceIp} → :{alert.destinationPort}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={SEVERITY_BG[alert.severity]}>{alert.severity}</span>
                    {alert.autoRespond && <span className="text-[10px] text-brand-400">Auto-blocked</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* YOUR LogFeed component */}
      <LogFeed logs={filteredLogs} onSelectLog={handleSelectLog} selectedLogId={selectedLog?.id} analyzedLogs={analyzedLogs} severityFilter={severityFilter} onFilterChange={setSeverityFilter} />

      {/* YOUR TrainingScenario component */}
      <TrainingScenario />
    </div>
  );
}
