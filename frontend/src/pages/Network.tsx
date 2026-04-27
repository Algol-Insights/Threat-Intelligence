import { useState, useEffect } from 'react';
import { wsService } from '../services/websocket';
import { api } from '../services/api';
import type { NetworkDevice } from '../types';
import { Network, Wifi, Server, Monitor, Smartphone, AlertTriangle, Shield, Brain, Loader2 } from 'lucide-react';

const DEVICE_ICONS: Record<string, any> = { Server, Workstation: Monitor, Mobile: Smartphone, Network: Wifi };

export default function NetworkPage() {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [selected, setSelected] = useState<NetworkDevice | null>(null);
  const [remediation, setRemediation] = useState<string | null>(null);
  const [remLoading, setRemLoading] = useState(false);

  useEffect(() => {
    const unsub = wsService.on('NETWORK_UPDATE', (devs: NetworkDevice[]) => setDevices(devs));
    return unsub;
  }, []);

  const insecureCount = devices.reduce((sum, d) => sum + d.services.filter(s => s.isInsecure).length, 0);

  const handleRemediation = async (service: any) => {
    setRemediation(null);
    setRemLoading(true);
    try {
      const res = await api.getRemediation(service);
      setRemediation(res.remediation);
    } catch { setRemediation('Failed to generate remediation advice.'); }
    setRemLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Network Discovery</h1>
          <p className="text-soc-muted text-sm">Live device and service detection via nmap</p>
        </div>
        <div className="flex gap-3">
          <div className="card-compact flex items-center gap-2 text-xs">
            <Monitor className="w-4 h-4 text-brand-400" />
            <span>{devices.length} devices</span>
          </div>
          {insecureCount > 0 && (
            <div className="card-compact flex items-center gap-2 text-xs border-orange-500/20">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <span className="text-orange-400">{insecureCount} insecure services</span>
            </div>
          )}
        </div>
      </div>

      {devices.length === 0 ? (
        <div className="card flex flex-col items-center py-16 text-soc-muted">
          <Network className="w-12 h-12 mb-4 opacity-30" />
          <p>Waiting for network scan results...</p>
          <p className="text-xs mt-1">Scan runs automatically when clients connect</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {devices.map(device => {
            const Icon = DEVICE_ICONS[device.type] || Monitor;
            const hasInsecure = device.services.some(s => s.isInsecure);
            return (
              <div key={device.id} className={`card cursor-pointer hover:border-brand-500/30 transition-all ${hasInsecure ? 'border-orange-500/20' : ''}`}
                onClick={() => { setSelected(device); setRemediation(null); }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${hasInsecure ? 'bg-orange-500/20' : 'bg-brand-600/20'}`}>
                    <Icon className={`w-5 h-5 ${hasInsecure ? 'text-orange-400' : 'text-brand-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{device.hostname}</p>
                    <p className="text-xs text-soc-muted font-mono">{device.ipAddress}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${device.status === 'Online' ? 'bg-green-500' : 'bg-gray-500'}`} />
                </div>
                <div className="text-xs text-soc-muted space-y-1">
                  <p>OS: {device.os}</p>
                  <p>MAC: {device.macAddress}</p>
                  <p>Services: {device.services.length}</p>
                </div>
                {device.services.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {device.services.map(svc => (
                      <span key={svc.id} className={`text-[10px] px-2 py-0.5 rounded-full ${svc.isInsecure ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-soc-muted'}`}>
                        {svc.name}:{svc.port}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Device detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="bg-soc-card rounded-2xl border border-soc-border w-full max-w-lg max-h-[80vh] overflow-y-auto m-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{selected.hostname}</h3>
            <div className="space-y-2 text-sm mb-4">
              <p><span className="text-soc-muted">IP:</span> {selected.ipAddress}</p>
              <p><span className="text-soc-muted">OS:</span> {selected.os}</p>
              <p><span className="text-soc-muted">Type:</span> {selected.type}</p>
            </div>
            <h4 className="font-semibold text-sm mb-2">Services</h4>
            <div className="space-y-2">
              {selected.services.map(svc => (
                <div key={svc.id} className={`card-compact ${svc.isInsecure ? 'border-orange-500/20' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{svc.name} <span className="text-soc-muted">:{svc.port}/{svc.protocol}</span></p>
                      <p className="text-xs text-soc-muted">{svc.version}</p>
                    </div>
                    {svc.isInsecure && (
                      <button onClick={() => handleRemediation(svc)} className="btn-ghost text-xs text-orange-400">
                        <Brain className="w-3 h-3" /> Fix
                      </button>
                    )}
                  </div>
                  {svc.isInsecure && <p className="text-xs text-orange-400 mt-1">{svc.insecurityReason}</p>}
                </div>
              ))}
            </div>
            {remLoading && <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-brand-400" /></div>}
            {remediation && (
              <div className="mt-4 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <p className="text-xs font-semibold text-emerald-400 mb-2">AI Remediation</p>
                <div className="text-xs text-soc-text/80 whitespace-pre-line leading-relaxed">{remediation}</div>
              </div>
            )}
            <button onClick={() => setSelected(null)} className="btn-secondary w-full mt-4 justify-center text-xs">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
