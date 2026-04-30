import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Settings, Users, Rss, Shield, FileText, Plus, Trash2, RefreshCw, Loader2, Lock, Bell, Copy } from 'lucide-react';

type Tab = 'users' | 'feeds' | 'rules' | 'audit' | 'mfa' | 'alerts';

export default function SettingsPage() {
  const { user } = useAuth();
  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'users', label: 'Users', icon: Users },
    { id: 'rules', label: 'Correlation Rules', icon: Shield },
    { id: 'alerts', label: 'Alert Config', icon: Bell },
    { id: 'mfa', label: 'MFA / TOTP', icon: Lock },
    { id: 'audit', label: 'Audit Log', icon: FileText },
  ];
  const [tab, setTab] = useState<Tab>('users');

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Settings</h1>
      <div className="flex gap-2 border-b border-soc-border pb-0 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap
            ${tab === t.id ? 'border-brand-500 text-brand-400' : 'border-transparent text-soc-muted hover:text-soc-text'}`}>
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'users' && <UsersTab />}
      {tab === 'rules' && <RulesTab />}
      {tab === 'alerts' && <AlertsTab />}
      {tab === 'mfa' && <MfaTab />}
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
    e.preventDefault(); await api.createUser(form);
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
            <div className="flex items-center gap-2">
              {u.mfa_enabled ? <Lock className="w-3 h-3 text-green-400" title="MFA enabled" /> : null}
              <span className="badge bg-white/5 text-soc-muted text-[10px] capitalize">{u.role}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RulesTab() {
  const [rules, setRules] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', condition_type: 'port_scan', threshold: 10, window_seconds: 60, severity: 'High', auto_respond: false, respond_action: '' });

  const fetchRules = () => { api.getCorrelationRules().then(r => setRules(r.rules)).catch(() => {}); };
  useEffect(() => { fetchRules(); }, []);

  const toggle = async (id: string, enabled: boolean) => { await api.updateCorrelationRule(id, { enabled: enabled ? 1 : 0 }); fetchRules(); };
  const handleDelete = async (id: string) => { await api.deleteCorrelationRule(id); fetchRules(); };
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); await api.createCorrelationRule(form);
    setShowAdd(false); setForm({ name: '', description: '', condition_type: 'port_scan', threshold: 10, window_seconds: 60, severity: 'High', auto_respond: false, respond_action: '' }); fetchRules();
  };

  const conditionTypes = [
    { value: 'port_scan', label: 'Port Scan' }, { value: 'brute_force_ssh', label: 'SSH Brute Force' },
    { value: 'brute_force_rdp', label: 'RDP Brute Force' }, { value: 'known_malicious', label: 'Known Malicious IP' },
    { value: 'tor_exit', label: 'TOR Exit Node' }, { value: 'dns_abuse', label: 'DNS Abuse' },
    { value: 'c2_beacon', label: 'C2 Beacon' }, { value: 'data_exfil', label: 'Data Exfiltration' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-soc-muted">{rules.length} rules</p>
        <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-xs"><Plus className="w-3.5 h-3.5" /> Create Rule</button>
      </div>
      {showAdd && (
        <form onSubmit={handleAdd} className="card space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[10px] text-soc-muted mb-1">Rule Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input text-xs" required /></div>
            <div><label className="block text-[10px] text-soc-muted mb-1">Condition Type</label>
              <select value={form.condition_type} onChange={e => setForm({ ...form, condition_type: e.target.value })} className="input text-xs">
                {conditionTypes.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select></div>
            <div><label className="block text-[10px] text-soc-muted mb-1">Threshold</label>
              <input type="number" value={form.threshold} onChange={e => setForm({ ...form, threshold: parseInt(e.target.value) })} className="input text-xs" min="1" /></div>
            <div><label className="block text-[10px] text-soc-muted mb-1">Window (seconds)</label>
              <input type="number" value={form.window_seconds} onChange={e => setForm({ ...form, window_seconds: parseInt(e.target.value) })} className="input text-xs" min="1" /></div>
            <div><label className="block text-[10px] text-soc-muted mb-1">Severity</label>
              <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} className="input text-xs">
                {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}
              </select></div>
            <div><label className="block text-[10px] text-soc-muted mb-1">Auto-respond Action</label>
              <select value={form.respond_action} onChange={e => setForm({ ...form, respond_action: e.target.value, auto_respond: !!e.target.value })} className="input text-xs">
                <option value="">None</option><option value="block_ip">Block IP (UFW)</option>
              </select></div>
          </div>
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input text-xs" placeholder="Description" />
          <button type="submit" className="btn-primary text-xs w-full justify-center">Create Rule</button>
        </form>
      )}
      <div className="space-y-2">
        {rules.map(r => (
          <div key={r.id} className="card-compact flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => toggle(r.id, !r.enabled)} className={`w-9 h-5 rounded-full transition-colors relative ${r.enabled ? 'bg-brand-600' : 'bg-soc-border'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${r.enabled ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
              <div>
                <p className="text-sm font-medium">{r.name}</p>
                <p className="text-xs text-soc-muted">{r.description} · {r.condition_type} · ≥{r.threshold} in {r.window_seconds}s</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className={`badge-${r.severity?.toLowerCase()}`}>{r.severity}</span>
              <span className="text-soc-muted font-mono">{r.match_count} hits</span>
              {r.auto_respond ? <span className="text-brand-400 text-[10px]">Auto</span> : null}
              <button onClick={() => handleDelete(r.id)} className="btn-ghost text-[10px] py-1 text-red-400"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertsTab() {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  useEffect(() => { api.getAlertConfig().then(setConfig).catch(() => {}).finally(() => setLoading(false)); }, []);

  const handleTest = async () => { setTesting(true); await api.testAlert().catch(() => {}); setTesting(false); };
  const updateConfig = async (key: string, value: string) => { await api.setAlertConfig(key, value); api.getAlertConfig().then(setConfig).catch(() => {}); };

  if (loading) return <div className="card flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-soc-muted" /></div>;

  return (
    <div className="space-y-4">
      <div className="card">
        <h3 className="font-semibold text-sm mb-4">Alert Channels</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]">
            <div><p className="text-sm font-medium">SMS / WhatsApp (Africa's Talking)</p><p className="text-xs text-soc-muted">Configure API key and recipients for mobile alerts</p></div>
            <span className={`badge text-[10px] ${config?.sms?.enabled ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-soc-muted'}`}>{config?.sms?.enabled ? 'Active' : 'Not configured'}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]">
            <div><p className="text-sm font-medium">Email (SMTP)</p><p className="text-xs text-soc-muted">Configure SMTP server for email notifications</p></div>
            <span className={`badge text-[10px] ${config?.email?.enabled ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-soc-muted'}`}>{config?.email?.enabled ? 'Active' : 'Not configured'}</span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]">
            <div><p className="text-sm font-medium">Dashboard (WebSocket)</p><p className="text-xs text-soc-muted">Real-time alerts to connected analyst dashboards</p></div>
            <span className="badge text-[10px] bg-green-500/20 text-green-400">Always active</span>
          </div>
        </div>
      </div>
      <div className="card">
        <h3 className="font-semibold text-sm mb-3">Severity threshold</h3>
        <p className="text-xs text-soc-muted mb-3">Only alerts at or above this severity will trigger notifications</p>
        <select defaultValue={config?.thresholdSeverity || 'Critical'} onChange={e => updateConfig('alerts.threshold', e.target.value)} className="input text-xs w-auto">
          {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
      <button onClick={handleTest} disabled={testing} className="btn-secondary text-xs">
        {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />} Send test alert
      </button>
    </div>
  );
}

function MfaTab() {
  const [status, setStatus] = useState<any>(null);
  const [setupData, setSetupData] = useState<any>(null);
  const [token, setToken] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.getMfaStatus().then(setStatus).catch(() => {}).finally(() => setLoading(false)); }, []);

  const handleSetup = async () => {
    const data = await api.setupMfa();
    setSetupData(data);
    setMessage('');
  };

  const handleConfirm = async () => {
    try { await api.confirmMfa(token); setStatus({ mfaEnabled: true }); setSetupData(null); setToken(''); setMessage('MFA enabled successfully'); }
    catch { setMessage('Invalid code — try again'); }
  };

  const handleDisable = async () => {
    try { await api.disableMfa(token); setStatus({ mfaEnabled: false }); setToken(''); setMessage('MFA disabled'); }
    catch { setMessage('Invalid code'); }
  };

  if (loading) return <div className="card flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-soc-muted" /></div>;

  return (
    <div className="space-y-4 max-w-lg">
      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Lock className={`w-5 h-5 ${status?.mfaEnabled ? 'text-green-400' : 'text-soc-muted'}`} />
          <div>
            <p className="font-semibold text-sm">Two-Factor Authentication (TOTP)</p>
            <p className="text-xs text-soc-muted">{status?.mfaEnabled ? 'MFA is enabled on your account' : 'Add an extra layer of security to your login'}</p>
          </div>
        </div>

        {!status?.mfaEnabled && !setupData && (
          <button onClick={handleSetup} className="btn-primary text-xs w-full justify-center">Enable MFA</button>
        )}

        {setupData && (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-white/[0.03] border border-soc-border">
              <p className="text-xs text-soc-muted mb-2">Enter this secret in your authenticator app (Google Authenticator, Authy, etc.):</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono bg-soc-bg px-3 py-2 rounded flex-1 break-all">{setupData.secret}</code>
                <button onClick={() => navigator.clipboard.writeText(setupData.secret)} className="btn-ghost text-xs"><Copy className="w-3.5 h-3.5" /></button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Enter the 6-digit code from your app</label>
              <div className="flex gap-2">
                <input value={token} onChange={e => setToken(e.target.value)} className="input text-sm font-mono tracking-widest" placeholder="000000" maxLength={6} />
                <button onClick={handleConfirm} disabled={token.length !== 6} className="btn-primary text-xs">Confirm</button>
              </div>
            </div>
          </div>
        )}

        {status?.mfaEnabled && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <Lock className="w-4 h-4 text-green-400" />
              <span className="text-sm text-green-400">MFA is active</span>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Enter code to disable MFA</label>
              <div className="flex gap-2">
                <input value={token} onChange={e => setToken(e.target.value)} className="input text-sm font-mono tracking-widest" placeholder="000000" maxLength={6} />
                <button onClick={handleDisable} disabled={token.length !== 6} className="btn-danger text-xs">Disable</button>
              </div>
            </div>
          </div>
        )}

        {message && <p className="text-xs text-brand-400 mt-2">{message}</p>}
      </div>
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
          {entries.length === 0 ? <tr><td colSpan={5} className="py-8 text-center text-soc-muted">No audit entries</td></tr> :
          entries.map(e => (
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
