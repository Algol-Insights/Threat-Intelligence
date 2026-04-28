import { useState } from 'react';
import { api } from '../services/api';
import { FileText, Download, Loader2, Calendar, Shield, AlertTriangle, Scale, Clock } from 'lucide-react';

interface ReportConfig {
  type: 'compliance' | 'events' | 'incidents' | 'executive';
  title: string;
  description: string;
  icon: any;
  color: string;
}

const REPORT_TYPES: ReportConfig[] = [
  { type: 'compliance', title: 'CDPA Compliance Report', description: 'Full CDPA 2021 compliance status with breach timeline, notification tracking, and section-by-section analysis. Formatted for POTRAZ submission.', icon: Scale, color: 'text-emerald-400' },
  { type: 'events', title: 'Security Events Summary', description: 'Comprehensive summary of all ingested security events with action distribution, parser breakdown, and threat classification.', icon: Shield, color: 'text-brand-400' },
  { type: 'incidents', title: 'Incident Report', description: 'All incidents with lifecycle status, severity distribution, CDPA relevance, and resolution timeline.', icon: AlertTriangle, color: 'text-orange-400' },
  { type: 'executive', title: 'Executive Briefing', description: 'One-page risk summary for CISOs and board members. Key metrics, compliance score, top threats, and recommended actions.', icon: FileText, color: 'text-purple-400' },
];

export default function Reports() {
  const [generating, setGenerating] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [lastReport, setLastReport] = useState<{ type: string; data: any } | null>(null);

  const generateReport = async (type: string) => {
    setGenerating(type);
    setLastReport(null);
    try {
      let data: any;
      if (type === 'compliance') {
        data = await api.getComplianceReport(startDate, endDate);
      } else if (type === 'events') {
        const [events, stats] = await Promise.all([
          api.getEvents({ limit: '1000' }),
          api.getEventStats(),
        ]);
        data = {
          reportTitle: 'Security Events Summary',
          generatedBy: 'Chengeto CTI Platform — Algol Cyber Security',
          generatedAt: new Date().toISOString(),
          period: { start: startDate, end: endDate },
          summary: stats,
          recentEvents: events.events.slice(0, 50),
        };
      } else if (type === 'incidents') {
        const result = await api.getIncidents();
        data = {
          reportTitle: 'Incident Report',
          generatedBy: 'Chengeto CTI Platform — Algol Cyber Security',
          generatedAt: new Date().toISOString(),
          period: { start: startDate, end: endDate },
          totalIncidents: result.total,
          incidents: result.incidents,
          bySeverity: ['Critical', 'High', 'Medium', 'Low'].map(s => ({
            severity: s,
            count: result.incidents.filter((i: any) => i.severity === s).length,
          })),
          byStatus: ['open', 'triaged', 'contained', 'resolved', 'closed'].map(s => ({
            status: s,
            count: result.incidents.filter((i: any) => i.status === s).length,
          })),
          cdpaRelevant: result.incidents.filter((i: any) => i.cdpa_relevant).length,
        };
      } else if (type === 'executive') {
        const [compliance, events, incidents, alerts] = await Promise.all([
          api.getComplianceMetrics(30),
          api.getEventStats(),
          api.getIncidents(),
          api.getAlerts({ limit: '100' }),
        ]);
        data = {
          reportTitle: 'Executive Security Briefing',
          generatedBy: 'Chengeto CTI Platform — Algol Cyber Security',
          generatedAt: new Date().toISOString(),
          period: { start: startDate, end: endDate },
          keyMetrics: {
            complianceScore: compliance.complianceScore,
            totalEvents: events.total,
            eventsLast24h: events.last24h,
            totalIncidents: incidents.total,
            openIncidents: incidents.incidents.filter((i: any) => i.status === 'open').length,
            criticalAlerts: alerts.alerts.filter((a: any) => a.severity === 'Critical').length,
            pendingNotifications: compliance.pendingNotifications,
            overdueNotifications: compliance.overdueNotifications,
          },
          riskLevel: compliance.complianceScore >= 80 ? 'LOW' : compliance.complianceScore >= 50 ? 'MEDIUM' : 'HIGH',
          recommendations: [
            compliance.overdueNotifications > 0 ? 'URGENT: Send overdue POTRAZ breach notifications immediately' : null,
            compliance.pendingNotifications > 0 ? 'Complete pending breach notifications within 72-hour window' : null,
            events.total > 100 ? 'Review high-volume event sources for tuning opportunities' : null,
            incidents.incidents.filter((i: any) => i.status === 'open').length > 5 ? 'Triage backlog: more than 5 open incidents require attention' : null,
            'Continue monitoring and maintain CDPA 2021 compliance posture',
          ].filter(Boolean),
        };
      }

      setLastReport({ type, data });

      // Auto-download JSON
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chengeto-${type}-report-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Report generation failed:', err);
    }
    setGenerating(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Reports</h1>
        <p className="text-soc-muted text-sm">Generate and export security reports</p>
      </div>

      {/* Date range */}
      <div className="card flex items-center gap-4">
        <Calendar className="w-5 h-5 text-soc-muted" />
        <span className="text-sm font-medium">Report period:</span>
        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="input w-auto text-xs" />
        <span className="text-soc-muted">to</span>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="input w-auto text-xs" />
      </div>

      {/* Report cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORT_TYPES.map(report => (
          <div key={report.type} className="card hover:border-brand-500/20 transition-colors">
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center ${report.color}`}>
                <report.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">{report.title}</h3>
                <p className="text-xs text-soc-muted mt-1 leading-relaxed">{report.description}</p>
              </div>
            </div>
            <button onClick={() => generateReport(report.type)} disabled={generating === report.type}
              className="btn-primary w-full justify-center text-xs">
              {generating === report.type ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...</>
              ) : (
                <><Download className="w-3.5 h-3.5" /> Generate &amp; Download</>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Last report preview */}
      {lastReport && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">Report preview — {lastReport.data.reportTitle}</h3>
            <span className="text-[10px] text-soc-muted">Generated: {new Date(lastReport.data.generatedAt).toLocaleString()}</span>
          </div>
          <pre className="text-xs text-soc-muted bg-soc-bg rounded-lg p-4 overflow-auto max-h-64 font-mono">
            {JSON.stringify(lastReport.data.summary || lastReport.data.keyMetrics || lastReport.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
