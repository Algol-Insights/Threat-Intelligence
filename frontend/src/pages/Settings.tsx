import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Settings, Users, Rss, Shield, FileText, Plus, Trash2, RefreshCw, Loader2, Check } from 'lucide-react';

type Tab = 'users' | 'feeds' | 'rules' | 'audit';

export default function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('users');

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'feeds', label: 'Threat feeds', icon: Rss },
    { id: 'rules', label: 'Correlation rules', icon: Shield },
    { id: 'audit', label: 'Audit log', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>
      <div className="flex gap-2 border-b border-soc-border pb-0">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px
            ${tab === t.id ? 'border-brand-500 text-brand-400' : 'border-transparent text-soc-muted hover:text-soc-text'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'feeds' && <FeedsTab />}
      {tab === 'rules' && <RulesTab />}
      {tab === 'audit' && <AuditTab />}
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', role: 'viewer', displayName: '' });

  const fetchUsers = () => { api.getUsers().then(r => setUsers(r.users)).catch(() => {}); };
  useEffect(() => { fetchUsers(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createUser(form);
    setShowAdd(false); setForm({ username: '', password: '', role: 'viewer', displayName: '' }); fetchUsers();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-soc-muted">{users.length} users</p>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-xs"><Plus className="w-3.5 h-3.5" /> Add user</button>
      </div>
      {showAdd && (
        <form onSubmit={handleAdd} className="card grid grid-cols-2 gap-3">
          <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="input text-xs" placeholder="Username" required />
          <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="input text-xs" placeholder="Password" type="password" required />
          <input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} className="input text-xs" placeholder="Display name" />
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="input text-xs">
            <option value="viewer">Viewer</option><option value="analyst">Analyst</option><option value="admin">Admin</option>
          </select>
          <button type="submit" className="btn-primary text-xs col-span-2 justify-center">Create user</button>
        </form>
      )}
      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="card-compact flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-xs font-bold text-brand-400">{u.username[0].toUpperCase()}</div>
              <div><p className="text-sm font-medium">{u.display_name || u.username}</p><p className="text-xs text-soc-muted">@{u.username}</p></div>
            </div>
            <span className="badge bg-white/5 text-soc-muted text-[10px] capitalize">{u.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeedsTab() {
  const [feeds, setFeeds] = useState<any[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);

  const fetchFeeds = () => { api.getFeeds().then(r => setFeeds(r.feeds)).catch(() => {}); };
  useEffect(() => { fetchFeeds(); }, []);

  const handleSync = async (id: string) => {
    setSyncing(id);
    try { await api.syncFeed(id); fetchFeeds(); } catch { /* */ }
    setSyncing(null);
  };

  return (
    <div className="space-y-2">
      {feeds.map(f => (
        <div key={f.id} className="card-compact flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">{f.name}</p>
            <p className="text-xs text-soc-muted">
              {f.last_sync ? `Last synced: ${new Date(f.last_sync).toLocaleString()} · ${f.ioc_count} IOCs` : 'Never synced'}
            </p>
            {f.error && <p className="text-xs text-red-400 mt-0.5">{f.error}</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${f.status === 'syncing' ? 'bg-yellow-500 animate-pulse' : f.status === 'error' ? 'bg-red-500' : 'bg-green-500'}`} />
            <button onClick={() => handleSync(f.id)} disabled={syncing === f.id} className="btn-secondary text-[10px] py-1">
              {syncing === f.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Sync
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function RulesTab() {
  const [rules, setRules] = useState<any[]>([]);
  const fetchRules = () => { api.getCorrelationRules().then(r => setRules(r.rules)).catch(() => {}); };
  useEffect(() => { fetchRules(); }, []);

  const toggle = async (id: string, enabled: boolean) => {
    await api.updateCorrelationRule(id, { enabled: enabled ? 1 : 0 });
    fetchRules();
  };

  return (
    <div className="space-y-2">
      {rules.map(r => (
        <div key={r.id} className="card-compact flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => toggle(r.id, !r.enabled)}
              className={`w-9 h-5 rounded-full transition-colors relative ${r.enabled ? 'bg-brand-600' : 'bg-soc-border'}`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${r.enabled ? 'left-[18px]' : 'left-0.5'}`} />
            </button>
            <div>
              <p className="text-sm font-medium">{r.name}</p>
              <p className="text-xs text-soc-muted">{r.description} · Threshold: {r.threshold} in {r.window_seconds}s</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className={`badge-${r.severity.toLowerCase()}`}>{r.severity}</span>
            <span className="text-soc-muted font-mono">{r.match_count} hits</span>
            {r.auto_respond ? <span className="text-brand-400 text-[10px]">Auto-respond</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function AuditTab() {
  const [entries, setEntries] = useState<any[]>([]);
  useEffect(() => { api.getAuditLog().then(r => setEntries(r.entries)).catch(() => {}); }, []);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead><tr className="text-soc-muted border-b border-soc-border">
          <th className="text-left py-2 font-medium">Time</th><th className="text-left py-2 font-medium">Actor</th>
          <th className="text-left py-2 font-medium">Action</th><th className="text-left py-2 font-medium">Target</th>
          <th className="text-left py-2 font-medium">Details</th>
        </tr></thead>
        <tbody>
          {entries.length === 0 ? (
            <tr><td colSpan={5} className="py-8 text-center text-soc-muted">No audit entries</td></tr>
          ) : entries.map(e => (
            <tr key={e.id} className="border-b border-soc-border/30 hover:bg-white/[0.02]">
              <td className="py-2 text-soc-muted font-mono">{new Date(e.created_at).toLocaleString()}</td>
              <td className="py-2">{e.actor_username}</td>
              <td className="py-2"><span className="badge bg-white/5 text-soc-muted text-[10px]">{e.action}</span></td>
              <td className="py-2 text-soc-muted">{e.target_type}:{e.target_id?.slice(0, 8)}</td>
              <td className="py-2 text-soc-muted max-w-xs truncate">{e.details}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
