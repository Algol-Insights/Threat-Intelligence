import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { wsService } from '../services/websocket';
import { Radar, Play, Square, AlertTriangle, Shield, Clock, Loader2 } from 'lucide-react';

export default function Deception() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = () => { api.getHoneypotStatus().then(setStatus).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { fetchStatus(); const interval = setInterval(fetchStatus, 15000); return () => clearInterval(interval); }, []);

  // Listen for live honeypot events
  useEffect(() => {
    const unsub = wsService.on('HONEYPOT_ALERT', () => fetchStatus());
    return unsub;
  }, []);

  const handleStart = async (port: number) => {
    await api.startHoneypot(port);
    fetchStatus();
  };

  const handleStop = async (port: number) => {
    await api.stopHoneypot(port);
    fetchStatus();
  };

  if (loading) return <div className="flex items-center justify-center h-40"><Loader2 className="w-5 h-5 animate-spin text-soc-muted" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold">Deception Technology</h1>
          <p className="text-[10px] text-soc-muted">Honeypot services — any connection is 100% malicious</p>
        </div>
        <div className="flex gap-3">
          <div className="card-compact flex items-center gap-2 text-xs">
            <Radar className="w-3.5 h-3.5 text-brand-400" />
            <span>{status?.totalHoneypots || 0} active</span>
          </div>
          <div className="card-compact flex items-center gap-2 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
            <span>{status?.totalEvents || 0} intrusions</span>
          </div>
        </div>
      </div>

      {/* Honeypot services */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {status?.availableServices?.map((svc: any) => {
          const active = status.activeHoneypots?.find((h: any) => h.port === svc.port);
          return (
            <div key={svc.port} className={`card ${active ? 'border-brand-500/20' : 'border-soc-border/30'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${active ? 'bg-brand-600/20' : 'bg-white/5'}`}>
                    <Radar className={`w-4.5 h-4.5 ${active ? 'text-brand-400' : 'text-soc-muted'}`} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{svc.name}</p>
                    <p className="text-[10px] text-soc-muted font-mono">:{svc.port} {svc.protocol}</p>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`} />
              </div>
              {active && (
                <p className="text-[10px] text-soc-muted mb-2">Uptime: {active.uptime} minutes</p>
              )}
              <button onClick={() => active ? handleStop(svc.port) : handleStart(svc.port)}
                className={`w-full justify-center text-[10px] ${active ? 'btn-danger' : 'btn-primary'}`}>
                {active ? <><Square className="w-3 h-3" /> Stop</> : <><Play className="w-3 h-3" /> Deploy</>}
              </button>
            </div>
          );
        })}
      </div>

      {/* Intrusion log */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-soc-muted">Intrusion Log</h3>
          <span className="text-[10px] text-soc-muted">{status?.uniqueAttackers || 0} unique attackers</span>
        </div>
        {!status?.recentEvents?.length ? (
          <div className="text-center py-8 text-soc-muted text-xs">
            <Shield className="w-8 h-8 mx-auto mb-2 opacity-20" />
            No intrusions detected — honeypots are watching
          </div>
        ) : (
          <div className="overflow-x-auto max-h-72">
            <table className="w-full text-[10px]">
              <thead className="sticky top-0 bg-soc-surface">
                <tr className="text-soc-muted/70">
                  <th className="text-left p-2 font-medium">Time</th>
                  <th className="text-left p-2 font-medium">Attacker IP</th>
                  <th className="text-left p-2 font-medium">Service</th>
                  <th className="text-left p-2 font-medium">Port</th>
                  <th className="text-left p-2 font-medium">Data Sent</th>
                </tr>
              </thead>
              <tbody>
                {status.recentEvents.map((e: any) => (
                  <tr key={e.id} className="border-t border-soc-border/20 hover:bg-red-500/5">
                    <td className="p-2 font-mono text-soc-muted">{new Date(e.created_at).toLocaleString()}</td>
                    <td className="p-2 font-mono text-red-400 font-semibold">{e.source_ip}</td>
                    <td className="p-2">{e.service_name}</td>
                    <td className="p-2 font-mono">{e.destination_port}</td>
                    <td className="p-2 text-soc-muted truncate max-w-[200px]">{e.data_received ? `${e.data_length} bytes` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="card border-brand-500/10">
        <h3 className="text-xs font-semibold text-brand-400 mb-2">How Deception Works</h3>
        <p className="text-[10px] text-soc-muted leading-relaxed">
          Honeypots are fake services deployed on your network. Since no legitimate user or system should connect to them, any connection is a guaranteed indicator of compromise — an attacker probing your network. This provides 100% confidence detection with zero false positives. When an attacker connects, Chengeto captures their IP, the data they send, and alerts your team immediately.
        </p>
      </div>
    </div>
  );
}
