import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Search, Plus, Target, CheckCircle2, XCircle, Clock, Loader2, ChevronDown, ChevronRight } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = { open: 'bg-blue-500/20 text-blue-400', investigating: 'bg-yellow-500/20 text-yellow-400', confirmed: 'bg-red-500/20 text-red-400', dismissed: 'bg-gray-500/20 text-gray-400' };

export default function ThreatHunting() {
  const [hypotheses, setHypotheses] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [searchForm, setSearchForm] = useState({ source_ip: '', destination_ip: '', port_min: '', port_max: '', action: '', protocol: '', time_from: '', time_to: '', cdpa_only: false });
  const [newHunt, setNewHunt] = useState({ title: '', description: '' });

  useEffect(() => { api.getHuntHypotheses().then(r => setHypotheses(r.hypotheses)).catch(() => {}); }, []);

  const handleSearch = async () => {
    setSearching(true);
    try {
      const res = await api.huntSearch(searchForm);
      setResults(res.events);
    } catch { setResults([]); }
    setSearching(false);
  };

  const handleCreateHunt = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createHuntHypothesis({ ...newHunt, query_params: searchForm });
    setShowCreate(false);
    setNewHunt({ title: '', description: '' });
    api.getHuntHypotheses().then(r => setHypotheses(r.hypotheses)).catch(() => {});
  };

  const updateStatus = async (id: string, status: string) => {
    await api.updateHuntHypothesis(id, { status });
    api.getHuntHypotheses().then(r => setHypotheses(r.hypotheses)).catch(() => {});
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Threat Hunting</h1>
          <p className="text-[10px] text-soc-muted">Hypothesis-driven threat investigation</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-[10px]"><Plus className="w-3 h-3" /> New Hunt</button>
      </div>

      {/* Advanced search */}
      <div className="card">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-soc-muted mb-3">Hunt Query</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
          <input value={searchForm.source_ip} onChange={e => setSearchForm({ ...searchForm, source_ip: e.target.value })} className="input text-[11px] h-8" placeholder="Source IP (partial)" />
          <input value={searchForm.destination_ip} onChange={e => setSearchForm({ ...searchForm, destination_ip: e.target.value })} className="input text-[11px] h-8" placeholder="Destination IP" />
          <input value={searchForm.port_min} onChange={e => setSearchForm({ ...searchForm, port_min: e.target.value })} className="input text-[11px] h-8" placeholder="Port min" type="number" />
          <input value={searchForm.port_max} onChange={e => setSearchForm({ ...searchForm, port_max: e.target.value })} className="input text-[11px] h-8" placeholder="Port max" type="number" />
          <select value={searchForm.action} onChange={e => setSearchForm({ ...searchForm, action: e.target.value })} className="input text-[11px] h-8">
            <option value="">Any action</option><option value="BLOCKED">BLOCKED</option><option value="ALLOWED">ALLOWED</option>
          </select>
          <select value={searchForm.protocol} onChange={e => setSearchForm({ ...searchForm, protocol: e.target.value })} className="input text-[11px] h-8">
            <option value="">Any protocol</option><option value="TCP">TCP</option><option value="UDP">UDP</option>
          </select>
          <input value={searchForm.time_from} onChange={e => setSearchForm({ ...searchForm, time_from: e.target.value })} className="input text-[11px] h-8" type="datetime-local" />
          <input value={searchForm.time_to} onChange={e => setSearchForm({ ...searchForm, time_to: e.target.value })} className="input text-[11px] h-8" type="datetime-local" />
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-[10px] text-soc-muted">
            <input type="checkbox" checked={searchForm.cdpa_only} onChange={e => setSearchForm({ ...searchForm, cdpa_only: e.target.checked })} className="rounded w-3 h-3" />
            CDPA relevant only
          </label>
          <button onClick={handleSearch} disabled={searching} className="btn-primary text-[10px] ml-auto">
            {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />} Execute Hunt
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Results */}
        <div className="lg:col-span-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-soc-muted mb-2">Results ({results.length})</h3>
          {results.length === 0 ? (
            <div className="card text-center py-8 text-soc-muted text-xs">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-20" />
              {searching ? 'Searching...' : 'Execute a hunt query to search events'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-soc-border max-h-96">
              <table className="w-full text-[10px]">
                <thead className="sticky top-0 bg-soc-surface">
                  <tr className="text-soc-muted/70">
                    <th className="text-left p-2 font-medium">Time</th>
                    <th className="text-left p-2 font-medium">Source</th>
                    <th className="text-left p-2 font-medium">Dest</th>
                    <th className="text-left p-2 font-medium">Port</th>
                    <th className="text-left p-2 font-medium">Action</th>
                    <th className="text-left p-2 font-medium">CDPA</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((e: any) => (
                    <tr key={e.id} className="border-t border-soc-border/20 hover:bg-white/[0.02]">
                      <td className="p-2 font-mono text-soc-muted">{new Date(e.created_at || e.timestamp).toLocaleString()}</td>
                      <td className="p-2 font-mono">{e.source_ip}</td>
                      <td className="p-2 font-mono text-soc-muted">{e.destination_ip}</td>
                      <td className="p-2 font-mono">{e.destination_port}</td>
                      <td className="p-2"><span className={e.action === 'BLOCKED' ? 'text-red-400' : 'text-green-400'}>{e.action}</span></td>
                      <td className="p-2">{e.cdpa_relevant ? <span className="text-emerald-400 text-[8px]">Yes</span> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Hypotheses sidebar */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-soc-muted mb-2">Hypotheses ({hypotheses.length})</h3>
          {showCreate && (
            <form onSubmit={handleCreateHunt} className="card mb-3 space-y-2">
              <input value={newHunt.title} onChange={e => setNewHunt({ ...newHunt, title: e.target.value })} className="input text-[11px] h-8" placeholder="Hypothesis title" required />
              <textarea value={newHunt.description} onChange={e => setNewHunt({ ...newHunt, description: e.target.value })} className="input text-[11px] h-16 resize-none" placeholder="Description and rationale..." />
              <button type="submit" className="btn-primary text-[10px] w-full justify-center">Save Hunt</button>
            </form>
          )}
          <div className="space-y-2">
            {hypotheses.length === 0 ? (
              <div className="card text-center py-6 text-soc-muted text-[10px]">No hypotheses yet</div>
            ) : hypotheses.map(h => (
              <div key={h.id} className="card">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[h.status]}`}>{h.status}</span>
                  <p className="text-[11px] font-semibold truncate flex-1">{h.title}</p>
                </div>
                {h.description && <p className="text-[10px] text-soc-muted mb-2 line-clamp-2">{h.description}</p>}
                <div className="flex gap-1">
                  {h.status === 'open' && <button onClick={() => updateStatus(h.id, 'investigating')} className="btn-ghost text-[9px] py-0.5 text-yellow-400">Investigate</button>}
                  {h.status === 'investigating' && <button onClick={() => updateStatus(h.id, 'confirmed')} className="btn-ghost text-[9px] py-0.5 text-red-400">Confirm</button>}
                  {h.status === 'investigating' && <button onClick={() => updateStatus(h.id, 'dismissed')} className="btn-ghost text-[9px] py-0.5 text-gray-400">Dismiss</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
