import { useState, useEffect } from 'react';
import { wsService } from '../services/websocket';
import { api } from '../services/api';
import type { LogEntry, ThreatAnalysis } from '../types';
import { Search, Filter, Zap, Loader2, Shield, Brain, ChevronDown, X } from 'lucide-react';

const SEVERITY_BG: Record<string, string> = { Critical: 'badge-critical', High: 'badge-high', Medium: 'badge-medium', Low: 'badge-low', Informational: 'badge-info' };

export default function Events() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'BLOCKED' | 'ALLOWED'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<LogEntry | null>(null);
  const [analysis, setAnalysis] = useState<ThreatAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisMeta, setAnalysisMeta] = useState<{ model: string; durationMs: number } | null>(null);

  useEffect(() => {
    const unsub = wsService.on('NEW_LOG', (log: LogEntry) => {
      setLogs(prev => [log, ...prev].slice(0, 500));
    });
    return unsub;
  }, []);

  const filtered = logs.filter(l => {
    if (filter !== 'all' && l.action !== filter) return false;
    if (search && !l.sourceIp.includes(search) && !l.destinationIp.includes(search) && !l.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAnalyze = async (log: LogEntry) => {
    setSelected(log);
    setAnalysis(null);
    setAnalyzing(true);
    try {
      const res = await api.analyzeThreat(log);
      setAnalysis(res.analysis);
      setAnalysisMeta(res.meta);
    } catch { setAnalysis(null); }
    setAnalyzing(false);
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-7rem)]">
      {/* Event list */}
      <div className={`flex-1 flex flex-col min-w-0 ${selected ? 'hidden lg:flex' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Security Events</h1>
          <span className="text-xs text-soc-muted">{logs.length} events</span>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-soc-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-10 text-xs" placeholder="Search by IP or description..." />
          </div>
          <div className="flex bg-soc-surface rounded-lg border border-soc-border p-0.5">
            {(['all', 'BLOCKED', 'ALLOWED'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filter === f ? 'bg-brand-600 text-white' : 'text-soc-muted hover:text-soc-text'}`}>
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
        </div>

        {/* Event table */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-soc-border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-soc-surface">
              <tr className="text-soc-muted">
                <th className="text-left p-3 font-medium">Time</th>
                <th className="text-left p-3 font-medium">Source</th>
                <th className="text-left p-3 font-medium">Destination</th>
                <th className="text-left p-3 font-medium">Port</th>
                <th className="text-left p-3 font-medium">Proto</th>
                <th className="text-left p-3 font-medium">Action</th>
                <th className="text-left p-3 font-medium">Source</th>
                <th className="text-right p-3 font-medium">Analyze</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-soc-muted">
                  {logs.length === 0 ? 'Waiting for events on UDP :1514...' : 'No events match filter'}
                </td></tr>
              ) : filtered.slice(0, 100).map(log => (
                <tr key={log.id} className={`border-t border-soc-border/30 hover:bg-white/[0.02] cursor-pointer transition-colors ${selected?.id === log.id ? 'bg-brand-600/10' : ''}`}
                  onClick={() => setSelected(log)}>
                  <td className="p-3 text-soc-muted font-mono whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td className="p-3 font-mono">{log.sourceIp}</td>
                  <td className="p-3 font-mono">{log.destinationIp}</td>
                  <td className="p-3 font-mono">{log.destinationPort}</td>
                  <td className="p-3 text-soc-muted">{log.protocol}</td>
                  <td className="p-3"><span className={log.action === 'BLOCKED' ? 'text-red-400' : 'text-green-400'}>{log.action}</span></td>
                  <td className="p-3 text-soc-muted">{log.parserSource}</td>
                  <td className="p-3 text-right">
                    <button onClick={e => { e.stopPropagation(); handleAnalyze(log); }} className="btn-ghost text-[10px] py-1 px-2">
                      <Brain className="w-3 h-3" /> AI
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Analysis panel */}
      {selected && (
        <div className="w-full lg:w-[420px] shrink-0 flex flex-col bg-soc-surface rounded-xl border border-soc-border overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-soc-border">
            <h3 className="font-semibold text-sm">Event details</h3>
            <button onClick={() => { setSelected(null); setAnalysis(null); }} className="text-soc-muted hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Event summary */}
            <div className="space-y-2 text-xs">
              <Row label="Source" value={`${selected.sourceIp}`} />
              <Row label="Destination" value={`${selected.destinationIp}:${selected.destinationPort}`} />
              <Row label="Protocol" value={selected.protocol} />
              <Row label="Action" value={selected.action} valueClass={selected.action === 'BLOCKED' ? 'text-red-400' : 'text-green-400'} />
              <Row label="Parser" value={selected.parserSource} />
              {selected.cdpa?.cdpaRelevant && <Row label="CDPA" value={selected.cdpa.classification.replace(/_/g, ' ')} valueClass="text-emerald-400" />}
            </div>

            {/* AI Analysis */}
            {!analysis && !analyzing && (
              <button onClick={() => handleAnalyze(selected)} className="btn-primary w-full justify-center text-xs">
                <Brain className="w-4 h-4" /> Analyze with AI
              </button>
            )}
            {analyzing && (
              <div className="flex flex-col items-center py-8 text-soc-muted">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <p className="text-sm">Analyzing threat...</p>
              </div>
            )}
            {analysis && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-white/[0.03] border border-soc-border">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-sm">{analysis.threatName}</p>
                    <span className={SEVERITY_BG[analysis.severity]}>{analysis.severity}</span>
                  </div>
                  <p className="text-xs text-soc-muted leading-relaxed">{analysis.summary}</p>
                </div>
                {analysis.cveId !== 'N/A' && <Section title="CVE" content={analysis.cveId} />}
                <Section title="MITRE ATT&CK TTPs" content={analysis.threatActorDNA.ttps.map(t => `${t.id}: ${t.technique}`).join('\n')} />
                <Section title="Threat actor" content={`${analysis.threatActorDNA.name}\nMotivation: ${analysis.threatActorDNA.motivation}\nTools: ${analysis.threatActorDNA.commonTools}`} />
                <Section title="Predictive analysis" content={analysis.predictiveAnalysis} />
                <Section title="Mitigation" content={analysis.mitigation} />
                <Section title="CDPA compliance impact" content={analysis.complianceImpact} accent />
                {analysisMeta && (
                  <p className="text-[10px] text-soc-muted text-right">
                    Model: {analysisMeta.model} · {analysisMeta.durationMs}ms
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, valueClass = '' }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-soc-border/30">
      <span className="text-soc-muted">{label}</span>
      <span className={`font-mono ${valueClass}`}>{value}</span>
    </div>
  );
}

function Section({ title, content, accent }: { title: string; content: string; accent?: boolean }) {
  return (
    <div className={`p-3 rounded-lg ${accent ? 'bg-emerald-500/5 border border-emerald-500/20' : 'bg-white/[0.02]'}`}>
      <p className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${accent ? 'text-emerald-400' : 'text-soc-muted'}`}>{title}</p>
      <p className="text-xs text-soc-text/80 whitespace-pre-line leading-relaxed">{content}</p>
    </div>
  );
}
