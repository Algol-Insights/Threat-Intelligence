import { useState, useEffect, useCallback } from 'react';
import { wsService } from '../services/websocket';
import { api } from '../services/api';
import type { FirewallLog, ThreatAnalysis } from '../types';
import ThreatAnalysisDisplay from '../components/ThreatAnalysisDisplay';
import { Search, Loader2, Brain, ChevronLeft, ChevronRight, X, Filter } from 'lucide-react';

const PAGE_SIZE = 50;

export default function Events() {
  const [logs, setLogs] = useState<FirewallLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<'all' | 'BLOCKED' | 'ALLOWED'>('all');
  const [search, setSearch] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [selected, setSelected] = useState<FirewallLog | null>(null);
  const [analysis, setAnalysis] = useState<ThreatAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [portFilter, setPortFilter] = useState('');
  const [cdpaFilter, setCdpaFilter] = useState(false);

  // Load persisted events with pagination
  const fetchEvents = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) };
    if (filter !== 'all') params.action = filter;
    if (searchApplied) params.source_ip = searchApplied;
    if (cdpaFilter) params.cdpa = '1';
    api.getEvents(params).then(r => { setLogs(r.events); setTotal(r.total); }).catch(() => {}).finally(() => setLoading(false));
  }, [page, filter, searchApplied, cdpaFilter]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Stream live events (only on page 0 with no filters)
  useEffect(() => {
    if (page !== 0 || filter !== 'all' || searchApplied || cdpaFilter) return;
    const unsub = wsService.on('NEW_LOG', (log: FirewallLog) => {
      setLogs(prev => [log, ...prev].slice(0, PAGE_SIZE));
      setTotal(prev => prev + 1);
    });
    return unsub;
  }, [page, filter, searchApplied, cdpaFilter]);

  const handleSearch = () => { setPage(0); setSearchApplied(search.trim()); };
  const clearSearch = () => { setSearch(''); setSearchApplied(''); setPortFilter(''); setCdpaFilter(false); setPage(0); };

  const handleAnalyze = useCallback(async () => {
    if (!selected) return;
    setAnalysis(null); setAnalysisError(null); setAnalyzing(true);
    try {
      const res = await api.analyzeThreat(selected);
      setAnalysis(res.analysis);
    } catch (err: any) { setAnalysisError(err.message || 'Analysis failed'); }
    setAnalyzing(false);
  }, [selected]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex gap-3 h-[calc(100vh-5.5rem)]">
      {/* Event list */}
      <div className={`flex-1 flex flex-col min-w-0 ${selected ? 'hidden lg:flex' : ''}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold">Security Events</h1>
            <p className="text-[10px] text-soc-muted">{total} events · Page {page + 1} of {totalPages || 1}</p>
          </div>
        </div>

        {/* Search and filters */}
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-soc-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="input pl-8 pr-8 text-xs h-8" placeholder="Search by IP address..." />
            {(searchApplied || cdpaFilter) && (
              <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-soc-muted hover:text-white"><X className="w-3 h-3" /></button>
            )}
          </div>
          <button onClick={() => setShowFilters(!showFilters)} className={`btn-ghost text-[10px] h-8 ${showFilters ? 'text-brand-400' : ''}`}>
            <Filter className="w-3 h-3" /> Filters
          </button>
          <div className="flex bg-soc-surface rounded-md border border-soc-border p-0.5">
            {(['all', 'BLOCKED', 'ALLOWED'] as const).map(f => (
              <button key={f} onClick={() => { setFilter(f); setPage(0); }}
                className={`px-2.5 py-1 rounded text-[10px] font-medium transition-all ${filter === f ? 'bg-brand-600 text-white' : 'text-soc-muted hover:text-soc-text'}`}>
                {f === 'all' ? 'All' : f}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="flex gap-2 mb-3 items-center">
            <label className="flex items-center gap-1.5 text-[10px] text-soc-muted">
              <input type="checkbox" checked={cdpaFilter} onChange={e => { setCdpaFilter(e.target.checked); setPage(0); }} className="rounded w-3 h-3" />
              CDPA relevant only
            </label>
            <button onClick={handleSearch} className="btn-primary text-[10px] h-7 px-3">Apply</button>
          </div>
        )}

        {/* Table */}
        <div className="flex-1 overflow-y-auto rounded-lg border border-soc-border">
          <table className="w-full text-[11px]">
            <thead className="sticky top-0 bg-soc-surface z-10">
              <tr className="text-soc-muted/70">
                <th className="text-left p-2.5 font-medium">Time</th>
                <th className="text-left p-2.5 font-medium">Source</th>
                <th className="text-left p-2.5 font-medium">Destination</th>
                <th className="text-left p-2.5 font-medium">Port</th>
                <th className="text-left p-2.5 font-medium">Proto</th>
                <th className="text-left p-2.5 font-medium">Action</th>
                <th className="text-left p-2.5 font-medium">CDPA</th>
                <th className="text-left p-2.5 font-medium">Parser</th>
                <th className="text-right p-2.5 font-medium w-16">AI</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="p-6 text-center text-soc-muted"><Loader2 className="w-4 h-4 animate-spin mx-auto mb-1" /><span className="text-[10px]">Loading...</span></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={9} className="p-6 text-center text-soc-muted text-[10px]">{total === 0 ? 'No events. Send syslog to UDP :1514' : 'No events match filter'}</td></tr>
              ) : logs.map(l => (
                <tr key={l.id} className={`border-t border-soc-border/20 hover:bg-white/[0.02] cursor-pointer transition-colors ${selected?.id === l.id ? 'bg-brand-600/8' : ''}`}
                  onClick={() => { setSelected(l); setAnalysis(null); setAnalysisError(null); }}>
                  <td className="p-2.5 text-soc-muted font-mono whitespace-nowrap">{new Date(l.timestamp).toLocaleTimeString()}</td>
                  <td className="p-2.5 font-mono">{l.sourceIp}</td>
                  <td className="p-2.5 font-mono text-soc-muted">{l.destinationIp}</td>
                  <td className="p-2.5 font-mono">{l.destinationPort}</td>
                  <td className="p-2.5 text-soc-muted">{l.protocol}</td>
                  <td className="p-2.5"><span className={l.action === 'BLOCKED' ? 'text-red-400' : 'text-green-400'}>{l.action}</span></td>
                  <td className="p-2.5">
                    {l.cdpa?.cdpaRelevant ? (
                      <span className="text-[8px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">
                        {l.cdpa.classification?.replace(/_/g, ' ')?.replace('personal data ', '') || 'Yes'}
                      </span>
                    ) : <span className="text-soc-muted/30">—</span>}
                  </td>
                  <td className="p-2.5 text-soc-muted/50">{l.parserSource || 'syslog'}</td>
                  <td className="p-2.5 text-right">
                    <button onClick={e => { e.stopPropagation(); setSelected(l); setAnalysis(null); setAnalysisError(null); }}
                      className="text-[9px] text-brand-400/60 hover:text-brand-400 transition-colors px-1.5 py-0.5 rounded hover:bg-brand-500/10">
                      <Brain className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-2 pt-2">
            <span className="text-[10px] text-soc-muted">{total} events total</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="btn-ghost text-[10px] h-7 px-2 disabled:opacity-30"><ChevronLeft className="w-3 h-3" /></button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = page < 3 ? i : page > totalPages - 3 ? totalPages - 5 + i : page - 2 + i;
                if (p < 0 || p >= totalPages) return null;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 rounded text-[10px] font-medium transition-all ${page === p ? 'bg-brand-600 text-white' : 'text-soc-muted hover:text-soc-text hover:bg-white/5'}`}>{p + 1}</button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="btn-ghost text-[10px] h-7 px-2 disabled:opacity-30"><ChevronRight className="w-3 h-3" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Analysis panel — YOUR ThreatAnalysisDisplay component */}
      {selected && (
        <div className="w-full lg:w-[400px] shrink-0 overflow-y-auto">
          <div className="flex justify-end mb-1.5 lg:hidden">
            <button onClick={() => setSelected(null)} className="btn-secondary text-[10px]">← Back</button>
          </div>
          <ThreatAnalysisDisplay selectedLog={selected} analysis={analysis} isLoading={analyzing} error={analysisError} onAnalyze={handleAnalyze} />
        </div>
      )}
    </div>
  );
}
