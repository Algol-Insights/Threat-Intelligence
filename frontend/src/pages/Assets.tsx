import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Monitor, Server, Smartphone, Wifi, Plus, Search, Shield, Edit2, Trash2 } from 'lucide-react';

const DEVICE_ICONS: Record<string, any> = { Server, Workstation: Monitor, Mobile: Smartphone, Network: Wifi };
const CRITICALITY_COLORS: Record<string, string> = { critical: 'badge-critical', high: 'badge-high', medium: 'badge-medium', low: 'badge-low' };

export default function Assets() {
  const { user } = useAuth();
  const [assets, setAssets] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ip_address: '', hostname: '', device_type: 'Workstation', os: '', owner: '', department: '', criticality: 'medium', notes: '' });
  const canEdit = user?.role === 'admin' || user?.role === 'analyst';

  const fetchAssets = () => { setLoading(true); api.getAssets().then(r => setAssets(r.assets || [])).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { fetchAssets(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createAsset(form);
    setShowAdd(false);
    setForm({ ip_address: '', hostname: '', device_type: 'Workstation', os: '', owner: '', department: '', criticality: 'medium', notes: '' });
    fetchAssets();
  };

  const handleDelete = async (id: string) => {
    await api.deleteAsset(id);
    fetchAssets();
  };

  const filtered = assets.filter(a =>
    !search || a.ip_address?.includes(search) || a.hostname?.toLowerCase().includes(search.toLowerCase()) || a.owner?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Asset Inventory</h1>
          <p className="text-soc-muted text-sm">{assets.length} registered assets</p>
        </div>
        {canEdit && <button onClick={() => setShowAdd(!showAdd)} className="btn-primary text-xs"><Plus className="w-3.5 h-3.5" /> Register Asset</button>}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-soc-muted" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input pl-10 text-xs" placeholder="Search by IP, hostname, or owner..." />
      </div>

      {showAdd && (
        <form onSubmit={handleAdd} className="card grid grid-cols-2 lg:grid-cols-4 gap-3">
          <input value={form.ip_address} onChange={e => setForm({ ...form, ip_address: e.target.value })} className="input text-xs" placeholder="IP Address" required />
          <input value={form.hostname} onChange={e => setForm({ ...form, hostname: e.target.value })} className="input text-xs" placeholder="Hostname" required />
          <select value={form.device_type} onChange={e => setForm({ ...form, device_type: e.target.value })} className="input text-xs">
            <option value="Workstation">Workstation</option><option value="Server">Server</option><option value="Mobile">Mobile</option><option value="Network">Network</option>
          </select>
          <input value={form.os} onChange={e => setForm({ ...form, os: e.target.value })} className="input text-xs" placeholder="Operating System" />
          <input value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} className="input text-xs" placeholder="Owner / Responsible" />
          <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="input text-xs" placeholder="Department" />
          <select value={form.criticality} onChange={e => setForm({ ...form, criticality: e.target.value })} className="input text-xs">
            <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
          </select>
          <button type="submit" className="btn-primary text-xs justify-center">Register</button>
        </form>
      )}

      {filtered.length === 0 ? (
        <div className="card text-center py-12 text-soc-muted">
          <Monitor className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>{loading ? 'Loading assets...' : assets.length === 0 ? 'No assets registered. Add manually or import from network scan.' : 'No assets match search'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(asset => {
            const Icon = DEVICE_ICONS[asset.device_type] || Monitor;
            return (
              <div key={asset.id} className="card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-brand-600/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{asset.hostname || asset.ip_address}</p>
                    <p className="text-xs text-soc-muted font-mono">{asset.ip_address}</p>
                  </div>
                  <span className={CRITICALITY_COLORS[asset.criticality] || 'badge-medium'}>{asset.criticality}</span>
                </div>
                <div className="space-y-1.5 text-xs text-soc-muted">
                  {asset.os && <p>OS: {asset.os}</p>}
                  {asset.owner && <p>Owner: {asset.owner}</p>}
                  {asset.department && <p>Dept: {asset.department}</p>}
                  {asset.last_seen && <p>Last seen: {new Date(asset.last_seen).toLocaleString()}</p>}
                </div>
                {canEdit && (
                  <div className="flex justify-end mt-3 pt-2 border-t border-soc-border/30">
                    <button onClick={() => handleDelete(asset.id)} className="btn-ghost text-[10px] py-1 text-red-400"><Trash2 className="w-3 h-3" /> Remove</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
