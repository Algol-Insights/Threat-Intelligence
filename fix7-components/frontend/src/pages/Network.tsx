import { useState, useEffect, useCallback } from 'react';
import { wsService } from '../services/websocket';
import { api } from '../services/api';
import type { NetworkDevice, RunningService } from '../types';
import { Network, Monitor, AlertTriangle } from 'lucide-react';

// YOUR ORIGINAL COMPONENTS
import NetworkDevices from '../components/NetworkDevices';
import DeviceDetailsDisplay from '../components/DeviceDetailsDisplay';

export default function NetworkPage() {
  const [devices, setDevices] = useState<NetworkDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(null);
  const [remediation, setRemediation] = useState<string | null>(null);
  const [remLoading, setRemLoading] = useState(false);
  const [remError, setRemError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = wsService.on('NETWORK_UPDATE', (devs: NetworkDevice[]) => setDevices(devs));
    return unsub;
  }, []);

  const handleSelectDevice = useCallback((device: NetworkDevice) => {
    setSelectedDevice(device);
    setRemediation(null);
    setRemError(null);
  }, []);

  const handleGetRemediation = useCallback(async (service: RunningService) => {
    setRemediation(null);
    setRemError(null);
    setRemLoading(true);
    try {
      const res = await api.getRemediation(service);
      setRemediation(res.remediation);
    } catch (err: any) {
      setRemError(err.message || 'Failed to get remediation');
    }
    setRemLoading(false);
  }, []);

  const insecureCount = devices.reduce((sum, d) => sum + d.services.filter(s => s.isInsecure).length, 0);

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
        <div className="flex gap-4">
          {/* YOUR NetworkDevices component */}
          <div className={`flex-1 ${selectedDevice ? 'hidden lg:block' : ''}`}>
            <NetworkDevices
              devices={devices}
              onSelectDevice={handleSelectDevice}
              selectedDeviceId={selectedDevice?.id}
            />
          </div>

          {/* YOUR DeviceDetailsDisplay component */}
          {selectedDevice && (
            <div className="w-full lg:w-[440px] shrink-0">
              <div className="flex justify-end mb-2 lg:hidden">
                <button onClick={() => setSelectedDevice(null)} className="btn-secondary text-xs">← Back</button>
              </div>
              <DeviceDetailsDisplay
                device={selectedDevice}
                remediation={remediation}
                isLoading={remLoading}
                error={remError}
                onGetRemediation={handleGetRemediation}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
