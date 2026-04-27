import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { wsService } from '../services/websocket';
import type { ComplianceMetrics, ComplianceEvent } from '../types';
import {
  Scale, AlertTriangle, Clock, CheckCircle2, XCircle, FileText,
  Download, Bell, TrendingDown, ShieldCheck, Timer, ArrowRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';

const CLASS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  personal_data_breach: { label: 'Personal Data Breach', color: 'text-red-400', bg: 'bg-red-500/20' },
  infrastructure_incident: { label: 'Infrastructure Incident', color: 'text-orange-400', bg: 'bg-orange-500/20' },
  reportable_event: { label: 'Reportable Event', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  informational: { label: 'Informational', color: 'text-blue-400', bg: 'bg-blue-500/20' },
};

export default function Compliance() {
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [period, setPeriod] = useState(30);
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchMetrics = () => {
    setLoading(true);
    api.getComplianceMetrics(period).then(setMetrics).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(fetchMetrics, [period]);

  // Live CDPA breach alerts
  useEffect(() => {
    const unsub = wsService.on('CDPA_BREACH', () => fetchMetrics());
    return unsub;
  }, [period]);

  const handleExportReport = async () => {
    setReportLoading(true);
    try {
      const report = await api.getComplianceReport();
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `cdpa-compliance-report-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      URL.revokeObjectURL(url);
    } catch { /* handle error */ }
    setReportLoading(false);
  };

  const handleMarkNotified = async (id: string) => {
    await api.sendNotification(id);
    fetchMetrics();
  };

  const score = metrics?.complianceScore ?? 100;
  const scoreColor = score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-yellow-400' : 'text-red-400';
  const scoreRing = score >= 80 ? 'ring-emerald-500/30' : score >= 50 ? 'ring-yellow-500/30' : 'ring-red-500/30';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Scale className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">CDPA 2021 Compliance</h1>
              <p className="text-soc-muted text-sm">Cyber and Data Protection Act — Zimbabwe</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select value={period} onChange={e => setPeriod(Number(e.target.value))} className="input w-auto text-xs">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button onClick={handleExportReport} disabled={reportLoading} className="btn-primary text-xs">
            <Download className="w-3.5 h-3.5" />
            {reportLoading ? 'Generating...' : 'Export Report'}
          </button>
        </div>
      </div>

      {/* Compliance score + key metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Score card */}
        <div className={`card flex flex-col items-center justify-center py-8 ring-2 ${scoreRing}`}>
          <p className={`text-5xl font-bold ${scoreColor}`}>{score}%</p>
          <p className="text-sm text-soc-muted mt-2">Compliance Score</p>
          <p className="text-xs text-soc-muted/60 mt-1">
            {score >= 80 ? 'Meeting CDPA requirements' : score >= 50 ? 'Needs improvement' : 'Critical — action required'}
          </p>
        </div>

        <MetricCard icon={AlertTriangle} label="Active breaches" value={metrics?.breachCount ?? 0}
          subtitle="Requiring notification" color="text-red-400" />
        <MetricCard icon={Timer} label="Pending notifications" value={metrics?.pendingNotifications ?? 0}
          subtitle="Within 72-hour window" color="text-yellow-400" />
        <MetricCard icon={XCircle} label="Overdue notifications" value={metrics?.overdueNotifications ?? 0}
          subtitle="Past POTRAZ deadline" color="text-red-500" />
      </div>

      {/* CDPA section breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Classification chart */}
        <div className="card">
          <h3 className="font-semibold text-sm mb-4">Events by CDPA classification</h3>
          <div className="h-52">
            {metrics?.byClassification?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.byClassification.map(c => ({ name: CLASS_LABELS[c.cdpa_classification]?.label || c.cdpa_classification, count: c.count, fill: c.cdpa_classification === 'personal_data_breach' ? '#ef4444' : c.cdpa_classification === 'infrastructure_incident' ? '#f97316' : '#6366f1' }))}>
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip contentStyle={{ background: '#1a2236', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {metrics.byClassification.map((c, i) => <Cell key={i} fill={c.cdpa_classification === 'personal_data_breach' ? '#ef4444' : c.cdpa_classification === 'infrastructure_incident' ? '#f97316' : '#6366f1'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-soc-muted text-sm">
                <ShieldCheck className="w-8 h-8 mr-3 text-emerald-500/50" />
                No CDPA events recorded — system compliant
              </div>
            )}
          </div>
        </div>

        {/* CDPA sections reference */}
        <div className="card">
          <h3 className="font-semibold text-sm mb-4">CDPA 2021 sections monitored</h3>
          <div className="space-y-3">
            {[
              { section: 'Section 3', title: 'Personal Data Processing', desc: 'Events targeting systems that process personal data', icon: FileText },
              { section: 'Section 15', title: 'Breach Notification', desc: '72-hour notification to POTRAZ upon confirmed breach', icon: Bell },
              { section: 'Section 16', title: 'Data Subject Notification', desc: 'Affected individuals must be notified without undue delay', icon: AlertTriangle },
              { section: 'Section 29', title: 'Cross-Border Transfers', desc: 'Data transfer to countries without adequate protection', icon: TrendingDown },
              { section: 'Section 34', title: 'Security Safeguards', desc: 'Technical and organisational security measures', icon: ShieldCheck },
            ].map(s => (
              <div key={s.section} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <s.icon className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{s.section} — {s.title}</p>
                  <p className="text-xs text-soc-muted mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
              <Scale className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-400">RBZ Directives</p>
                <p className="text-xs text-soc-muted mt-0.5">Additional reporting for financial sector entities (banking, insurance, microfinance)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pending notifications */}
      {metrics?.pendingDetails && metrics.pendingDetails.length > 0 && (
        <div className="card border-yellow-500/20">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-yellow-400" />
            <h3 className="font-semibold text-sm">Pending breach notifications — 72-hour countdown</h3>
          </div>
          <div className="space-y-3">
            {metrics.pendingDetails.map(evt => {
              const deadline = new Date(evt.notification_deadline);
              const hoursLeft = Math.max(0, (deadline.getTime() - Date.now()) / 3600000);
              const urgent = hoursLeft < 12;
              return (
                <div key={evt.id} className={`card-compact flex items-center gap-4 ${urgent ? 'border-red-500/30 animate-threat-pulse' : 'border-yellow-500/20'}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="badge-critical text-[10px]">{evt.cdpa_classification?.replace(/_/g, ' ')}</span>
                      <span className="text-xs text-soc-muted">Source: {evt.source_ip}</span>
                    </div>
                    <p className="text-xs text-soc-muted mt-1">{evt.cdpa_section}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold font-mono ${urgent ? 'text-red-400' : 'text-yellow-400'}`}>
                      {hoursLeft.toFixed(1)}h remaining
                    </p>
                    <p className="text-[10px] text-soc-muted">Deadline: {deadline.toLocaleString()}</p>
                  </div>
                  <button onClick={() => handleMarkNotified(evt.id)} className="btn-secondary text-xs shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Mark notified
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent compliance events */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm">Recent CDPA-relevant events</h3>
          <span className="text-xs text-soc-muted">{metrics?.totalEvents ?? 0} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-soc-muted border-b border-soc-border">
                <th className="text-left py-2 font-medium">Time</th>
                <th className="text-left py-2 font-medium">Classification</th>
                <th className="text-left py-2 font-medium">Source IP</th>
                <th className="text-left py-2 font-medium">CDPA Sections</th>
                <th className="text-left py-2 font-medium">Severity</th>
                <th className="text-left py-2 font-medium">Notification</th>
              </tr>
            </thead>
            <tbody>
              {(metrics?.recentEvents || []).slice(0, 15).map(evt => {
                const cls = CLASS_LABELS[evt.cdpa_classification] || { label: evt.cdpa_classification, color: 'text-soc-muted', bg: 'bg-white/5' };
                return (
                  <tr key={evt.id} className="border-b border-soc-border/50 hover:bg-white/[0.02]">
                    <td className="py-2 text-soc-muted font-mono">{new Date(evt.created_at).toLocaleString()}</td>
                    <td className="py-2"><span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${cls.bg} ${cls.color}`}>{cls.label}</span></td>
                    <td className="py-2 font-mono">{evt.source_ip}</td>
                    <td className="py-2 text-soc-muted max-w-xs truncate">{evt.cdpa_section}</td>
                    <td className="py-2"><span className={`badge-${evt.severity}`}>{evt.severity}</span></td>
                    <td className="py-2">
                      {evt.notification_required ? (
                        evt.notification_sent ? <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Sent</span>
                        : <span className="text-yellow-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>
                      ) : <span className="text-soc-muted">—</span>}
                    </td>
                  </tr>
                );
              })}
              {(!metrics?.recentEvents || metrics.recentEvents.length === 0) && (
                <tr><td colSpan={6} className="py-8 text-center text-soc-muted">No CDPA-relevant events recorded in this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, subtitle, color }: { icon: any; label: string; value: number; subtitle: string; color: string }) {
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-3">
        <Icon className={`w-5 h-5 ${color}`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-soc-muted mt-1">{subtitle}</p>
    </div>
  );
}
