import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Zap, Plus, Play, Clock, CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronRight, Loader2, Trash2 } from 'lucide-react';

const ACTION_TYPES = [
  { value: 'block_ip', label: 'Block IP (UFW)', description: 'Add deny rule to UFW firewall' },
  { value: 'send_alert', label: 'Send Alert', description: 'Dispatch alert via configured channels' },
  { value: 'create_incident', label: 'Create Incident', description: 'Auto-create incident record' },
  { value: 'enrich_ioc', label: 'Enrich IOC', description: 'Add source IP to IOC watchlist' },
  { value: 'quarantine_host', label: 'Quarantine Host', description: 'Isolate host (requires EDR)' },
  { value: 'update_firewall', label: 'Update Firewall', description: 'Push firewall rule (requires adapter)' },
  { value: 'notify_email', label: 'Email Notification', description: 'Send email (requires SMTP)' },
];

const STATUS_ICONS: Record<string, any> = { success: CheckCircle2, failed: XCircle, warning: AlertTriangle, skipped: Clock, logged: Clock, running: Loader2 };
const STATUS_COLORS: Record<string, string> = { success: 'text-green-400', failed: 'text-red-400', warning: 'text-yellow-400', skipped: 'text-soc-muted', logged: 'text-blue-400', running: 'text-brand-400', completed: 'text-green-400', partial: 'text-yellow-400' };

export default function Playbooks() {
  const { user } = useAuth();
  const [playbooks, setPlaybooks] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [executing, setExecuting] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const canEdit = user?.role === 'admin' || user?.role === 'analyst';

  const fetchPlaybooks = () => { api.getPlaybooks().then(r => setPlaybooks(r.playbooks)).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { fetchPlaybooks(); }, []);

  const selectPlaybook = async (pb: any) => {
    setSelected(pb);
    setLastResult(null);
    try { const r = await api.getPlaybook(pb.id); setExecutions(r.executions); } catch { setExecutions([]); }
  };

  const handleExecute = async (pb: any) => {
    setExecuting(pb.id);
    setLastResult(null);
    try {
      const result = await api.executePlaybook(pb.id);
      setLastResult(result);
      fetchPlaybooks();
      if (selected?.id === pb.id) { const r = await api.getPlaybook(pb.id); setExecutions(r.executions); }
    } catch { }
    setExecuting(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">SOAR Playbooks</h1>
          <p className="text-soc-muted text-sm">Automated response workflows</p>
        </div>
        {canEdit && <button onClick={() => setShowCreate(true)} className="btn-primary text-xs"><Plus className="w-3.5 h-3.5" /> New Playbook</button>}
      </div>

      <div className="flex gap-4">
        {/* Playbook list */}
        <div className={`flex-1 space-y-3 ${selected ? 'hidden lg:block' : ''}`}>
          {loading ? <div className="card flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-soc-muted" /></div> :
           playbooks.length === 0 ? <div className="card text-center py-12 text-soc-muted"><Zap className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No playbooks configured</p></div> :
           playbooks.map(pb => (
            <div key={pb.id} onClick={() => selectPlaybook(pb)} className={`card cursor-pointer hover:border-brand-500/30 transition-all ${selected?.id === pb.id ? 'border-brand-500/50' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${pb.enabled ? 'bg-brand-600/20' : 'bg-white/5'}`}>
                    <Zap className={`w-5 h-5 ${pb.enabled ? 'text-brand-400' : 'text-soc-muted'}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{pb.name}</p>
                    <p className="text-xs text-soc-muted">{pb.description}</p>
                  </div>
                </div>
                {canEdit && (
                  <button onClick={e => { e.stopPropagation(); handleExecute(pb); }} disabled={executing === pb.id} className="btn-primary text-[10px] py-1.5">
                    {executing === pb.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Run
                  </button>
                )}
              </div>
              <div className="flex items-center gap-4 text-[10px] text-soc-muted">
                <span>Trigger: {pb.trigger_type}</span>
                <span>Severity: {pb.trigger_severity}</span>
                <span>{pb.actions?.length || 0} actions</span>
                <span>Runs: {pb.execution_count}</span>
                {pb.last_executed && <span>Last: {new Date(pb.last_executed).toLocaleString()}</span>}
              </div>
              {/* Action steps preview */}
              <div className="mt-3 flex gap-1.5 flex-wrap">
                {(pb.actions || []).map((a: any, i: number) => (
                  <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-soc-muted">
                    {a.order}. {a.type.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Detail/execution panel */}
        {selected && (
          <div className="w-full lg:w-[400px] shrink-0 card overflow-y-auto max-h-[calc(100vh-12rem)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm">{selected.name}</h3>
              <button onClick={() => setSelected(null)} className="text-xs text-soc-muted hover:text-white">Close</button>
            </div>

            {/* Last execution result */}
            {lastResult && (
              <div className={`mb-4 p-3 rounded-lg border ${lastResult.status === 'completed' ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold ${STATUS_COLORS[lastResult.status]}`}>{lastResult.status.toUpperCase()}</span>
                  <span className="text-[10px] text-soc-muted">{lastResult.durationMs}ms</span>
                </div>
                {lastResult.results?.map((r: any, i: number) => {
                  const Icon = STATUS_ICONS[r.status] || Clock;
                  return (
                    <div key={i} className="flex items-start gap-2 py-1.5 text-xs">
                      <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${STATUS_COLORS[r.status]}`} />
                      <div>
                        <span className="font-medium">{r.type.replace(/_/g, ' ')}</span>
                        <span className="text-soc-muted ml-2">{r.message}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Execution history */}
            <p className="text-[10px] text-soc-muted uppercase tracking-wider mb-2">Execution History</p>
            <div className="space-y-2">
              {executions.length === 0 ? <p className="text-xs text-soc-muted py-4 text-center">No executions yet</p> :
               executions.slice(0, 10).map(ex => (
                <div key={ex.id} className="card-compact">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${STATUS_COLORS[ex.status]}`}>{ex.status}</span>
                    <span className="text-soc-muted">{new Date(ex.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-soc-muted">
                    <span>{ex.duration_ms}ms</span>
                    <span>{ex.results?.length || 0} actions</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && <CreatePlaybookModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchPlaybooks(); }} />}
    </div>
  );
}

function CreatePlaybookModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', description: '', trigger_type: 'manual', trigger_severity: 'High', actions: [{ order: 1, type: 'block_ip', params: {} }] });

  const addAction = () => setForm({ ...form, actions: [...form.actions, { order: form.actions.length + 1, type: 'send_alert', params: {} }] });
  const removeAction = (idx: number) => setForm({ ...form, actions: form.actions.filter((_, i) => i !== idx).map((a, i) => ({ ...a, order: i + 1 })) });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createPlaybook(form);
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <form onSubmit={handleSubmit} className="bg-soc-card rounded-2xl border border-soc-border w-full max-w-lg m-4 p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold mb-4">Create Playbook</h3>
        <div className="space-y-4">
          <div><label className="block text-xs font-medium mb-1">Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input text-sm" required /></div>
          <div><label className="block text-xs font-medium mb-1">Description</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input text-sm" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium mb-1">Trigger</label>
              <select value={form.trigger_type} onChange={e => setForm({ ...form, trigger_type: e.target.value })} className="input text-sm">
                <option value="manual">Manual</option><option value="correlation_alert">Correlation Alert</option><option value="ioc_hit">IOC Hit</option><option value="cdpa_breach">CDPA Breach</option>
              </select>
            </div>
            <div><label className="block text-xs font-medium mb-1">Min Severity</label>
              <select value={form.trigger_severity} onChange={e => setForm({ ...form, trigger_severity: e.target.value })} className="input text-sm">
                {['Critical', 'High', 'Medium', 'Low'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2"><label className="text-xs font-medium">Actions (in order)</label><button type="button" onClick={addAction} className="text-xs text-brand-400">+ Add</button></div>
            {form.actions.map((action, idx) => (
              <div key={idx} className="flex items-center gap-2 mb-2">
                <span className="text-xs text-soc-muted w-6">{action.order}.</span>
                <select value={action.type} onChange={e => { const a = [...form.actions]; a[idx].type = e.target.value; setForm({ ...form, actions: a }); }} className="input text-xs flex-1">
                  {ACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                {form.actions.length > 1 && <button type="button" onClick={() => removeAction(idx)} className="text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center text-xs">Cancel</button>
          <button type="submit" className="btn-primary flex-1 justify-center text-xs">Create</button>
        </div>
      </form>
    </div>
  );
}
