import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Shield, AlertTriangle, Scale, Activity, TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle, FileText, Download } from 'lucide-react';

export default function ExecutiveBriefing() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getComplianceMetrics(30),
      api.getEventStats(),
      api.getIncidents(),
      api.getAlerts({ limit: '100' }),
      api.getCorrelationStats(),
    ]).then(([compliance, events, incidents, alerts, correlation]) => {
      const openIncidents = incidents.incidents.filter((i: any) => i.status === 'open' || i.status === 'triaged').length;
      const criticalAlerts = alerts.alerts.filter((a: any) => a.severity === 'Critical').length;
      const riskLevel = compliance.complianceScore >= 80 && criticalAlerts === 0 ? 'LOW'
        : compliance.complianceScore >= 50 && criticalAlerts <= 3 ? 'MEDIUM' : 'HIGH';
      setData({ compliance, events, incidents: incidents.incidents, openIncidents, alerts: alerts.alerts, criticalAlerts, correlation, riskLevel, totalIncidents: incidents.total });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-2 border-brand-500/30 border-t-brand-500 rounded-full" /></div>;
  if (!data) return <div className="card text-center py-12 text-soc-muted">Unable to load briefing data</div>;

  const riskColors: Record<string, string> = { LOW: 'text-green-400', MEDIUM: 'text-yellow-400', HIGH: 'text-red-400' };
  const riskBg: Record<string, string> = { LOW: 'bg-green-500/10 ring-green-500/30', MEDIUM: 'bg-yellow-500/10 ring-yellow-500/30', HIGH: 'bg-red-500/10 ring-red-500/30' };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Executive Security Briefing</h1>
          <p className="text-soc-muted text-sm">30-day security posture summary — {new Date().toLocaleDateString('en-ZW', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-soc-muted uppercase tracking-wider">Prepared by</p>
          <p className="text-sm font-medium">Chengeto CTI Platform</p>
          <p className="text-xs text-soc-muted">Algol Cyber Security</p>
        </div>
      </div>

      {/* Risk level hero card */}
      <div className={`card ring-2 ${riskBg[data.riskLevel]} flex items-center justify-between py-8 px-8`}>
        <div>
          <p className="text-sm text-soc-muted uppercase tracking-wider mb-1">Overall Risk Level</p>
          <p className={`text-5xl font-bold ${riskColors[data.riskLevel]}`}>{data.riskLevel}</p>
          <p className="text-sm text-soc-muted mt-2">
            {data.riskLevel === 'LOW' ? 'Security posture is strong. Continue monitoring.' :
             data.riskLevel === 'MEDIUM' ? 'Attention needed. Review open incidents and alerts.' :
             'Immediate action required. Critical threats detected.'}
          </p>
        </div>
        <div className="text-right">
          <p className={`text-6xl font-bold ${riskColors[data.riskLevel]}`}>{data.compliance.complianceScore}%</p>
          <p className="text-sm text-soc-muted">CDPA Compliance</p>
        </div>
      </div>

      {/* Key metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <BriefCard icon={Activity} label="Events (30d)" value={data.events.total} color="text-brand-400" />
        <BriefCard icon={AlertTriangle} label="Critical alerts" value={data.criticalAlerts} color={data.criticalAlerts > 0 ? 'text-red-400' : 'text-green-400'} />
        <BriefCard icon={Shield} label="Open incidents" value={data.openIncidents} color={data.openIncidents > 3 ? 'text-orange-400' : 'text-green-400'} />
        <BriefCard icon={Scale} label="Pending notifications" value={data.compliance.pendingNotifications} color={data.compliance.pendingNotifications > 0 ? 'text-yellow-400' : 'text-green-400'} />
      </div>

      {/* Two column detail */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Threat summary */}
        <div className="card">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-orange-400" /> Threat Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-soc-muted">Total events processed</span><span className="font-mono">{data.events.total}</span></div>
            <div className="flex justify-between"><span className="text-soc-muted">Events blocked</span><span className="font-mono text-red-400">{data.events.blocked}</span></div>
            <div className="flex justify-between"><span className="text-soc-muted">Events allowed</span><span className="font-mono text-green-400">{data.events.allowed}</span></div>
            <div className="flex justify-between"><span className="text-soc-muted">CDPA-relevant events</span><span className="font-mono text-emerald-400">{data.events.cdpaRelevant}</span></div>
            <div className="flex justify-between"><span className="text-soc-muted">Correlation rules active</span><span className="font-mono">{data.correlation.rules?.length || 0}</span></div>
            <div className="flex justify-between"><span className="text-soc-muted">Total rule matches</span><span className="font-mono">{data.correlation.totalMatches || 0}</span></div>
          </div>
        </div>

        {/* Compliance summary */}
        <div className="card">
          <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><Scale className="w-4 h-4 text-emerald-400" /> CDPA 2021 Compliance</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-soc-muted">Compliance score</span><span className={`font-bold ${data.compliance.complianceScore >= 80 ? 'text-green-400' : 'text-red-400'}`}>{data.compliance.complianceScore}%</span></div>
            <div className="flex justify-between"><span className="text-soc-muted">Total breaches detected</span><span className="font-mono">{data.compliance.breachCount}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-soc-muted">Pending notifications</span>
              <span className={`font-mono ${data.compliance.pendingNotifications > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                {data.compliance.pendingNotifications > 0 ? <Clock className="w-3 h-3 inline mr-1" /> : <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                {data.compliance.pendingNotifications}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-soc-muted">Overdue notifications</span>
              <span className={`font-mono ${data.compliance.overdueNotifications > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {data.compliance.overdueNotifications > 0 ? <XCircle className="w-3 h-3 inline mr-1" /> : <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                {data.compliance.overdueNotifications}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Incident summary */}
      <div className="card">
        <h3 className="font-semibold text-sm mb-4 flex items-center gap-2"><FileText className="w-4 h-4 text-brand-400" /> Incident Status</h3>
        <div className="grid grid-cols-5 gap-3">
          {['open', 'triaged', 'contained', 'resolved', 'closed'].map(status => {
            const count = data.incidents.filter((i: any) => i.status === status).length;
            return (
              <div key={status} className="text-center p-3 rounded-lg bg-white/[0.03]">
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-[10px] text-soc-muted uppercase tracking-wider mt-1 capitalize">{status}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      <div className="card border-brand-500/20">
        <h3 className="font-semibold text-sm mb-3">Recommendations</h3>
        <div className="space-y-2">
          {data.compliance.overdueNotifications > 0 && (
            <Rec severity="critical" text="URGENT: Send overdue POTRAZ breach notifications immediately. Failure to notify within 72 hours violates CDPA 2021 Section 15." />
          )}
          {data.compliance.pendingNotifications > 0 && (
            <Rec severity="high" text="Complete pending breach notifications before the 72-hour deadline expires." />
          )}
          {data.criticalAlerts > 3 && (
            <Rec severity="high" text={`${data.criticalAlerts} critical alerts detected. Immediate investigation and triage required.`} />
          )}
          {data.openIncidents > 5 && (
            <Rec severity="medium" text={`${data.openIncidents} open incidents require triage. Consider allocating additional analyst resources.`} />
          )}
          {data.events.total === 0 && (
            <Rec severity="medium" text="No events ingested. Verify syslog forwarding from network devices and endpoints." />
          )}
          <Rec severity="info" text="Continue monitoring and maintain CDPA 2021 compliance posture. Schedule quarterly security review." />
        </div>
      </div>

      <p className="text-center text-[10px] text-soc-muted">
        Generated by Chengeto CTI Platform · Algol Cyber Security · {new Date().toISOString()}
      </p>
    </div>
  );
}

function BriefCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="card text-center">
      <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-soc-muted uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

function Rec({ severity, text }: { severity: string; text: string }) {
  const colors: Record<string, string> = { critical: 'border-red-500/30 bg-red-500/5', high: 'border-orange-500/30 bg-orange-500/5', medium: 'border-yellow-500/30 bg-yellow-500/5', info: 'border-brand-500/20 bg-brand-500/5' };
  const dots: Record<string, string> = { critical: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-yellow-500', info: 'bg-brand-500' };
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${colors[severity]}`}>
      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dots[severity]}`} />
      <p className="text-xs leading-relaxed">{text}</p>
    </div>
  );
}
