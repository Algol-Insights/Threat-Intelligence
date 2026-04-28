import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Bug, Plus, RefreshCw, Loader2, Search, Shield, Trash2, Upload, Database } from 'lucide-react';

type Tab = 'iocs' | 'feeds';

export default function Threats() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('iocs');
  const canEdit = user?.role === 'admin' || user?.role === 'analyst';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Threat Intelligence</h1>
          <p className="text-soc-muted text-sm">IOC watchlist and threat feed management</p>
        </div>
      </div>
      <div className="flex gap-2 border-b border-soc-border pb-0">
        {([
          { id: 'iocs' as Tab, label: 'IOC Watchlist', icon: Shield },
          { id: 'feeds' as Tab, label: 'Threat Feeds', icon: Database },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px
            ${tab === t.id ? 'border-brand-500 text-brand-400' : 'border-transparent text-soc-muted hover:text-soc-text'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'iocs' && <IOCTab canEdit={canEdit} />}
      {tab === 'feeds' && <FeedsTab canEdit={canEdit} />}
    </div>
  );
}

function IOCTab({ canEdit }: { canEdit: boolean }) {
  const [iocs, setIocs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type: 'ip', value: '', threat_type: '', confidence: 0.7, source: 'manual' });
  const [loading, setLoading] = useState(true);

  const fetchIOCs = () => { setLoading(true); api.getIOCs().then(r => setIocs(r.iocs)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { fetchIOCs(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.addIOC(form);
    setShowAdd(false);
    setForm({ type: 'ip', value: '', threat_type: '', confidence: 0.7, source: 'manual' });
    fetchIOCs();
  };

  const handleDelete = async (id: string) => {
    await api.deleteIOC(id);
    fetchIOCs();
  };

  const filtered = iocs.filter(i =>
    !search || i.value.includes(search) || (i.threat_type || '').toLowerCase().includes(search.toLowerCase())
  );

  const typeColors: Record<string, string> = {
    ip: 'bg-blue-500/20 text-blue-400',
    domain: 'bg-purple-500/20 text-purple-400',
    hash: 'bg-orange-500/20 text-orange-400',
    url: 'bg-yellow-500/20 text-yellow-400',
    email: 'bg-green-500/20 text-green-400',
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-soc-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-10 text-xs" placeholder="Search IOCs..." />
        </div>
        <span className="text-xs text-soc-muted">{iocs.length} indicators</span>
        {canEdit && (
          <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-xs">
            <Plus className="w-3.5 h-3.5" /> Add IOC
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="card grid grid-cols-2 lg:grid-cols-5 gap-3">
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input text-xs">
            <option value="ip">IP Address</option>
            <option value="domain">Domain</option>
            <option value="hash">Hash</option>
            <option value="url">URL</option>
            <option value="email">Email</option>
          </select>
          <input value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} className="input text-xs" placeholder="Indicator value" required />
          <input value={form.threat_type} onChange={e => setForm({ ...form, threat_type: e.target.value })} className="input text-xs" placeholder="Threat type (e.g. botnet_cc)" />
          <input type="number" min="0" max="1" step="0.1" value={form.confidence} onChange={e => setForm({ ...form, confidence: parseFloat(e.target.value) })} className="input text-xs" placeholder="Confidence" />
          <button type="submit" className="btn-primary text-xs justify-center">Add</button>
        </form>
      )}

      {loading ? (
        <div className="card flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-soc-muted" /></div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-soc-muted">
          <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{iocs.length === 0 ? 'No IOCs in watchlist — add manually or sync from threat feeds' : 'No IOCs match search'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-soc-border">
          <table className="w-full text-xs">
            <thead className="bg-soc-surface">
              <tr className="text-soc-muted">
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Value</th>
                <th className="text-left p-3 font-medium">Threat</th>
                <th className="text-left p-3 font-medium">Confidence</th>
                <th className="text-left p-3 font-medium">Source</th>
                <th className="text-left p-3 font-medium">Added</th>
                {canEdit && <th className="text-right p-3 font-medium">Action</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 100).map(ioc => (
                <tr key={ioc.id} className="border-t border-soc-border/30 hover:bg-white/[0.02]">
                  <td className="p-3"><span className={`badge text-[10px] ${typeColors[ioc.type] || 'bg-white/5 text-soc-muted'}`}>{ioc.type}</span></td>
                  <td className="p-3 font-mono">{ioc.value}</td>
                  <td className="p-3 text-soc-muted">{ioc.threat_type || '—'}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-soc-border rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${ioc.confidence >= 0.8 ? 'bg-red-500' : ioc.confidence >= 0.5 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${ioc.confidence * 100}%` }} />
                      </div>
                      <span className="text-soc-muted">{(ioc.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-soc-muted">{ioc.source}</td>
                  <td className="p-3 text-soc-muted">{new Date(ioc.created_at).toLocaleDateString()}</td>
                  {canEdit && (
                    <td className="p-3 text-right">
                      <button onClick={() => handleDelete(ioc.id)} className="btn-ghost text-[10px] py-1 text-red-400 hover:text-red-300">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FeedsTab({ canEdit }: { canEdit: boolean }) {
  const [feeds, setFeeds] = useState<any[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFeeds = () => { setLoading(true); api.getFeeds().then(r => setFeeds(r.feeds)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { fetchFeeds(); }, []);

  const handleSync = async (id: string) => {
    setSyncing(id);
    try { await api.syncFeed(id); fetchFeeds(); } catch { /* */ }
    setSyncing(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-soc-muted">{feeds.length} configured feeds</p>
      {loading ? (
        <div className="card flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-soc-muted" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {feeds.map(f => (
            <div key={f.id} className={`card ${f.error ? 'border-red-500/20' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${f.enabled ? 'bg-brand-600/20' : 'bg-white/5'}`}>
                    <Database className={`w-5 h-5 ${f.enabled ? 'text-brand-400' : 'text-soc-muted'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{f.name}</p>
                    <p className="text-[10px] text-soc-muted uppercase tracking-wider">{f.type}</p>
                  </div>
                </div>
                <div className={`w-2.5 h-2.5 rounded-full ${f.status === 'syncing' ? 'bg-yellow-500 animate-pulse' : f.status === 'error' ? 'bg-red-500' : f.enabled ? 'bg-green-500' : 'bg-gray-500'}`} />
              </div>

              <div className="space-y-1.5 text-xs text-soc-muted mb-4">
                <div className="flex justify-between">
                  <span>IOCs</span>
                  <span className="font-mono text-soc-text">{f.ioc_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last sync</span>
                  <span>{f.last_sync ? new Date(f.last_sync).toLocaleString() : 'Never'}</span>
                </div>
                {f.error && <p className="text-red-400 text-[10px] mt-1">{f.error}</p>}
              </div>

              {canEdit && (
                <button onClick={() => handleSync(f.id)} disabled={syncing === f.id}
                  className="btn-secondary w-full justify-center text-xs">
                  {syncing === f.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  {syncing === f.id ? 'Syncing...' : 'Sync now'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
