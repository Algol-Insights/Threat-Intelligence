import { useState, useEffect, useCallback } from 'react';
import { wsService } from '../services/websocket';
import { api } from '../services/api';
import type { FirewallLog, ThreatAnalysis } from '../types';
import { Search, Loader2, Brain } from 'lucide-react';

// YOUR ORIGINAL COMPONENT
import ThreatAnalysisDisplay from '../components/ThreatAnalysisDisplay';

export default function Events() {
  const [logs, setLogs] = useState<FirewallLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'BLOCKED' | 'ALLOWED'>('all');
  const [search, setSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<FirewallLog | null>(null);
  const [analysis, setAnalysis] = useState<ThreatAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load persisted events
  useEffect(() => {
    api.getEvents({ limit: '500' }).then(r => setLogs(r.events)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Stream live events
  useEffect(() => {
    const unsub = wsService.on('NEW_LOG', (log: FirewallLog) => {
      setLogs(prev => [log, ...prev].slice(0, 500));
    });
    return unsub;
  }, []);

  const filtered = logs.filter(l => {
    if (filter !== 'all' && l.action !== filter) return false;
    if (search && !l.sourceIp.includes(search) && !l.destinationIp.includes(search) && !l.description.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAnalyze = useCallback(async () => {
    if (!selectedLog) return;
    setAnalysis(null);
    setAnalysisError(null);
    setAnalyzing(true);
    try {
      const res = await api.analyzeThreat(selectedLog);
      setAnalysis(res.analysis);
    } catch (err: any) {
      setAnalysisError(err.message || 'Analysis failed');
    }
    setAnalyzing(false);
  }, [selectedLog]);

  return (
    <div className="flex gap-4 h-[calc(100vh-7rem)]">
      {/* Event list */}
      <div className={`flex-1 flex flex-col min-w-0 ${selectedLog ? 'hidden lg:flex' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Security Events</h1>
          <span className="text-xs text-soc-muted">{logs.length} events</span>
        </div>
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-soc-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-10 text-xs" placeholder="Search by IP or description..." />
          </div>
          <div className="flex bg-soc-surface rounded-lg border border-soc-border p-0.5">
            {(['all', 'BLOCKED', 'ALLOWED'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filter === f ? 'bg-brand-600 text-white' : 'text-soc-muted hover:text-soc-text'}`}>
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto rounded-xl border border-soc-border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-soc-surface">
              <tr className="text-soc-muted">
                <th className="text-left p-3 font-medium">Time</th><th className="text-left p-3 font-medium">Source</th>
                <th className="text-left p-3 font-medium">Destination</th><th className="text-left p-3 font-medium">Port</th>
                <th className="text-left p-3 font-medium">Proto</th><th className="text-left p-3 font-medium">Action</th>
                <th className="text-left p-3 font-medium">Parser</th><th className="text-right p-3 font-medium">Analyze</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="p-8 text-center text-soc-muted"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" /> Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-soc-muted">{logs.length === 0 ? 'No events yet. Send syslog to UDP :1514' : 'No match'}</td></tr>
              ) : filtered.slice(0, 200).map(log => (
                <tr key={log.id} className={`border-t border-soc-border/30 hover:bg-white/[0.02] cursor-pointer ${selectedLog?.id === log.id ? 'bg-brand-600/10' : ''}`}
                  onClick={() => { setSelectedLog(log); setAnalysis(null); setAnalysisError(null); }}>
                  <td className="p-3 text-soc-muted font-mono whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</td>
                  <td className="p-3 font-mono">{log.sourceIp}</td>
                  <td className="p-3 font-mono">{log.destinationIp}</td>
                  <td className="p-3 font-mono">{log.destinationPort}</td>
                  <td className="p-3 text-soc-muted">{log.protocol}</td>
                  <td className="p-3"><span className={log.action === 'BLOCKED' ? 'text-red-400' : 'text-green-400'}>{log.action}</span></td>
                  <td className="p-3 text-soc-muted">{log.parserSource || 'unknown'}</td>
                  <td className="p-3 text-right">
                    <button onClick={e => { e.stopPropagation(); setSelectedLog(log); setAnalysis(null); setAnalysisError(null); }} className="btn-ghost text-[10px] py-1 px-2">
                      <Brain className="w-3 h-3" /> AI
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* YOUR ThreatAnalysisDisplay component */}
      {selectedLog && (
        <div className="w-full lg:w-[440px] shrink-0 overflow-y-auto">
          <div className="flex justify-end mb-2 lg:hidden">
            <button onClick={() => setSelectedLog(null)} className="btn-secondary text-xs">← Back to list</button>
          </div>
          <ThreatAnalysisDisplay
            selectedLog={selectedLog}
            analysis={analysis}
            isLoading={analyzing}
            error={analysisError}
            onAnalyze={handleAnalyze}
          />
        </div>
      )}
    </div>
  );
}
