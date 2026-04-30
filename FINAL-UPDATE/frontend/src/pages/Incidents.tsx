import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Incident, IncidentTimeline } from '../types';
import { AlertTriangle, Plus, ChevronRight, Clock, CheckCircle2, Shield, Scale, Timer } from 'lucide-react';

const STATUS_FLOW = ['open', 'triaged', 'contained', 'resolved', 'closed'] as const;
const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-500/20 text-red-400', triaged: 'bg-orange-500/20 text-orange-400',
  contained: 'bg-yellow-500/20 text-yellow-400', resolved: 'bg-green-500/20 text-green-400',
  closed: 'bg-gray-500/20 text-gray-400',
};

function calcSLA(incident: Incident, timeline: IncidentTimeline[]) {
  const created = new Date(incident.created_at).getTime();
  const triaged = timeline.find(t => t.details?.includes('triaged'));
  const contained = timeline.find(t => t.details?.includes('contained'));
  const resolved = incident.resolved_at ? new Date(incident.resolved_at).getTime() : null;

  const fmt = (ms: number) => {
    const mins = Math.round(ms / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ${mins % 60}m`;
    return `${Math.round(hrs / 24)}d ${hrs % 24}h`;
  };

  return {
    timeToAcknowledge: triaged ? fmt(new Date(triaged.created_at).getTime() - created) : null,
    timeToContain: contained ? fmt(new Date(contained.created_at).getTime() - created) : null,
    timeToResolve: resolved ? fmt(resolved - created) : null,
  };
}

export default function Incidents() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Incident | null>(null);
  const [timeline, setTimeline] = useState<IncidentTimeline[]>([]);
  const [sla, setSla] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', severity: 'Medium', cdpa_relevant: false });
  const canEdit = user?.role === 'admin' || user?.role === 'analyst';

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
    setSla(calcSLA(inc, res.timeline));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createIncident(form);
    setShowCreate(false); setForm({ title: '', description: '', severity: 'Medium', cdpa_relevant: false }); fetchIncidents();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await api.updateIncidentStatus(id, status);
    fetchIncidents();
    if (selected?.id === id) { const res = await api.getIncident(id); setSelected(res.incident); setTimeline(res.timeline); setSla(calcSLA(res.incident, res.timeline)); }
  };

  // SLA summary across all incidents
  const openCount = incidents.filter(i => i.status === 'open').length;
  const avgResolveTime = (() => {
    const resolved = incidents.filter(i => i.resolved_at);
    if (resolved.length === 0) return null;
    const total = resolved.reduce((sum, i) => sum + (new Date(i.resolved_at!).getTime() - new Date(i.created_at).getTime()), 0);
    const avgMs = total / resolved.length;
    const hrs = Math.round(avgMs / 3600000);
    return hrs < 24 ? `${hrs}h` : `${Math.round(hrs / 24)}d`;
  })();

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

      {/* SLA overview */}
      {incidents.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center"><p className="text-2xl font-bold text-red-400">{openCount}</p><p className="text-[10px] text-soc-muted uppercase tracking-wider mt-1">Open</p></div>
          <div className="card text-center"><p className="text-2xl font-bold text-green-400">{incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length}</p><p className="text-[10px] text-soc-muted uppercase tracking-wider mt-1">Resolved</p></div>
          <div className="card text-center"><p className="text-2xl font-bold text-brand-400">{avgResolveTime || '—'}</p><p className="text-[10px] text-soc-muted uppercase tracking-wider mt-1">Avg resolve time</p></div>
          <div className="card text-center"><p className="text-2xl font-bold text-emerald-400">{incidents.filter(i => i.cdpa_relevant).length}</p><p className="text-[10px] text-soc-muted uppercase tracking-wider mt-1">CDPA relevant</p></div>
        </div>
      )}

      <div className="flex gap-4">
        {/* List */}
        <div className={`flex-1 space-y-2 ${selected ? 'hidden lg:block' : ''}`}>
          {incidents.length === 0 ? (
            <div className="card text-center py-12 text-soc-muted"><Shield className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No incidents recorded</p></div>
          ) : incidents.map(inc => (
            <div key={inc.id} onClick={() => selectIncident(inc)} className={`card-compact cursor-pointer hover:border-brand-500/30 transition-all ${selected?.id === inc.id ? 'border-brand-500/50 bg-brand-600/5' : ''}`}>
              <div className="flex items-center gap-3">
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

        {/* Detail panel with SLA */}
        {selected && (
          <div className="w-full lg:w-[420px] shrink-0 card overflow-y-auto max-h-[calc(100vh-12rem)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm">{selected.title}</h3>
              <button onClick={() => setSelected(null)} className="text-xs text-soc-muted hover:text-white">Close</button>
            </div>

            {/* SLA metrics */}
            {sla && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                  <p className="text-xs font-bold text-brand-400">{sla.timeToAcknowledge || '—'}</p>
                  <p className="text-[9px] text-soc-muted mt-0.5">Time to ack</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                  <p className="text-xs font-bold text-yellow-400">{sla.timeToContain || '—'}</p>
                  <p className="text-[9px] text-soc-muted mt-0.5">Time to contain</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-white/[0.03]">
                  <p className="text-xs font-bold text-green-400">{sla.timeToResolve || '—'}</p>
                  <p className="text-[9px] text-soc-muted mt-0.5">Time to resolve</p>
                </div>
              </div>
            )}

            <div className="space-y-3 text-xs mb-4">
              <div className="flex justify-between"><span className="text-soc-muted">Status</span><span className={`badge text-[10px] ${STATUS_COLORS[selected.status]}`}>{selected.status}</span></div>
              <div className="flex justify-between"><span className="text-soc-muted">Severity</span><span className={`badge-${selected.severity.toLowerCase()}`}>{selected.severity}</span></div>
              {selected.cdpa_relevant && <div className="flex justify-between"><span className="text-soc-muted">CDPA</span><span className="text-emerald-400">{selected.cdpa_section || 'Relevant'}</span></div>}
              {selected.cdpa_deadline && <div className="flex justify-between"><span className="text-soc-muted">POTRAZ deadline</span><span className="text-yellow-400 font-mono">{new Date(selected.cdpa_deadline).toLocaleString()}</span></div>}
              <div className="flex justify-between"><span className="text-soc-muted">Created</span><span>{new Date(selected.created_at).toLocaleString()}</span></div>
              {selected.description && <p className="text-soc-muted pt-2 border-t border-soc-border">{selected.description}</p>}
            </div>

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
              <div><label className="block text-xs font-medium mb-1">Severity</label><select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} className="input text-sm">{['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}</select></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.cdpa_relevant} onChange={e => setForm({ ...form, cdpa_relevant: e.target.checked })} className="rounded" /> CDPA 2021 relevant (starts 72-hour clock)</label>
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
