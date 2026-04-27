import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Incident, IncidentTimeline } from '../types';
import { AlertTriangle, Plus, ChevronRight, Clock, CheckCircle2, Shield, Scale, Filter } from 'lucide-react';

const STATUS_FLOW = ['open', 'triaged', 'contained', 'resolved', 'closed'] as const;
const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-500/20 text-red-400', triaged: 'bg-orange-500/20 text-orange-400',
  contained: 'bg-yellow-500/20 text-yellow-400', resolved: 'bg-green-500/20 text-green-400',
  closed: 'bg-gray-500/20 text-gray-400',
};

export default function Incidents() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [timeline, setTimeline] = useState<IncidentTimeline[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', severity: 'Medium', cdpa_relevant: false });

  const fetchIncidents = () => {
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    api.getIncidents(params).then(r => { setIncidents(r.incidents); setTotal(r.total); }).catch(() => {});
  };

  useEffect(fetchIncidents, [statusFilter]);

  const selectIncident = async (inc: Incident) => {
    setSelected(inc);
    const res = await api.getIncident(inc.id);
    setTimeline(res.timeline);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createIncident(form);
    setShowCreate(false);
    setForm({ title: '', description: '', severity: 'Medium', cdpa_relevant: false });
    fetchIncidents();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await api.updateIncidentStatus(id, status);
    fetchIncidents();
    if (selected?.id === id) { const res = await api.getIncident(id); setSelected(res.incident); setTimeline(res.timeline); }
  };

  const canEdit = user?.role === 'admin' || user?.role === 'analyst';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Incident Management</h1>
          <p className="text-soc-muted text-sm">{total} total incidents</p>
        </div>
        <div className="flex gap-3">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input w-auto text-xs">
            <option value="">All statuses</option>
            {STATUS_FLOW.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {canEdit && <button onClick={() => setShowCreate(true)} className="btn-primary text-xs"><Plus className="w-3.5 h-3.5" /> New incident</button>}
        </div>
      </div>

      <div className="flex gap-4">
        {/* List */}
        <div className={`flex-1 space-y-2 ${selected ? 'hidden lg:block' : ''}`}>
          {incidents.length === 0 ? (
            <div className="card text-center py-12 text-soc-muted">
              <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No incidents recorded</p>
            </div>
          ) : incidents.map(inc => (
            <div key={inc.id} onClick={() => selectIncident(inc)}
              className={`card-compact cursor-pointer hover:border-brand-500/30 transition-all ${selected?.id === inc.id ? 'border-brand-500/50 bg-brand-600/5' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-full rounded-full shrink-0 ${inc.severity === 'Critical' ? 'bg-red-500' : inc.severity === 'High' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{inc.title}</p>
                    {inc.cdpa_relevant && <Scale className="w-3 h-3 text-emerald-400 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`badge text-[10px] ${STATUS_COLORS[inc.status]}`}>{inc.status}</span>
                    <span className={`badge-${inc.severity.toLowerCase()}`}>{inc.severity}</span>
                    <span className="text-[10px] text-soc-muted">{new Date(inc.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-soc-muted shrink-0" />
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-full lg:w-[400px] shrink-0 card overflow-y-auto max-h-[calc(100vh-12rem)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm">{selected.title}</h3>
              <button onClick={() => setSelected(null)} className="text-soc-muted hover:text-white text-xs">Close</button>
            </div>

            <div className="space-y-3 text-xs mb-4">
              <div className="flex justify-between"><span className="text-soc-muted">Status</span><span className={`badge text-[10px] ${STATUS_COLORS[selected.status]}`}>{selected.status}</span></div>
              <div className="flex justify-between"><span className="text-soc-muted">Severity</span><span className={`badge-${selected.severity.toLowerCase()}`}>{selected.severity}</span></div>
              {selected.cdpa_relevant && (
                <div className="flex justify-between"><span className="text-soc-muted">CDPA</span><span className="text-emerald-400">{selected.cdpa_section}</span></div>
              )}
              {selected.cdpa_deadline && (
                <div className="flex justify-between"><span className="text-soc-muted">POTRAZ deadline</span><span className="text-yellow-400 font-mono">{new Date(selected.cdpa_deadline).toLocaleString()}</span></div>
              )}
              <div className="flex justify-between"><span className="text-soc-muted">Created</span><span>{new Date(selected.created_at).toLocaleString()}</span></div>
              {selected.description && <p className="text-soc-muted pt-2 border-t border-soc-border">{selected.description}</p>}
            </div>

            {/* Status progression */}
            {canEdit && selected.status !== 'closed' && (
              <div className="mb-4">
                <p className="text-[10px] text-soc-muted uppercase tracking-wider mb-2">Progress incident</p>
                <div className="flex gap-2 flex-wrap">
                  {STATUS_FLOW.filter(s => STATUS_FLOW.indexOf(s) > STATUS_FLOW.indexOf(selected.status as any)).map(s => (
                    <button key={s} onClick={() => handleStatusChange(selected.id, s)} className="btn-secondary text-[10px] py-1 capitalize">{s}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div>
              <p className="text-[10px] text-soc-muted uppercase tracking-wider mb-2">Timeline</p>
              <div className="space-y-3 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-soc-border">
                {timeline.map(t => (
                  <div key={t.id} className="flex gap-3 pl-1">
                    <div className="w-3.5 h-3.5 rounded-full bg-soc-surface border-2 border-brand-500 shrink-0 mt-0.5 z-10" />
                    <div>
                      <p className="text-xs font-medium">{t.action.replace(/_/g, ' ')}</p>
                      <p className="text-[10px] text-soc-muted">{t.details}</p>
                      <p className="text-[10px] text-soc-muted/60 mt-0.5">{t.actor_username} · {new Date(t.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="bg-soc-card rounded-2xl border border-soc-border w-full max-w-md m-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">Create incident</h3>
            <div className="space-y-4">
              <div><label className="block text-xs font-medium mb-1">Title</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input text-sm" required /></div>
              <div><label className="block text-xs font-medium mb-1">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input text-sm h-20 resize-none" /></div>
              <div><label className="block text-xs font-medium mb-1">Severity</label>
                <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} className="input text-sm">
                  {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.cdpa_relevant} onChange={e => setForm({ ...form, cdpa_relevant: e.target.checked })} className="rounded" />
                CDPA 2021 relevant (starts 72-hour notification clock)
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1 justify-center text-xs">Cancel</button>
              <button type="submit" className="btn-primary flex-1 justify-center text-xs">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
