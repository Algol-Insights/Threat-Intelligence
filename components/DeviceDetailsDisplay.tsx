import React from 'react';
import { NetworkDevice, RunningService, DeviceType } from '../types';
import { ComputerDesktopIcon, ServerIcon, DevicePhoneMobileIcon, WrenchScrewdriverIcon, CpuChipIcon, AlertTriangleIcon } from './icons';

interface DeviceDetailsDisplayProps {
  device: NetworkDevice;
  remediation: string | null;
  isLoading: boolean;
  error: string | null;
  onGetRemediation: (service: RunningService) => void;
}

const getDeviceIcon = (type: DeviceType) => {
  const iconProps = { className: "h-12 w-12 text-slate-500 dark:text-slate-400" };
  switch (type) {
    case DeviceType.Server: return <ServerIcon {...iconProps} />;
    case DeviceType.Workstation: return <ComputerDesktopIcon {...iconProps} />;
    case DeviceType.Mobile: return <DevicePhoneMobileIcon {...iconProps} />;
  }
};

const RemediationDisplay: React.FC<{ content: string }> = ({ content }) => {
    // A simple markdown-to-HTML converter
    const formatContent = (text: string) => {
        return text
            .replace(/### (.*)/g, '<h3 class="text-lg font-semibold text-slate-800 dark:text-slate-200 mt-4 mb-2">$1</h3>')
            .replace(/\*\*(.*)\*\*/g, '<strong class="font-semibold text-slate-600 dark:text-slate-200">$1</strong>')
            .replace(/`([^`]+)`/g, '<code class="bg-slate-200 dark:bg-slate-900 rounded-md px-1.5 py-1 font-mono text-sm">$1</code>')
            .replace(/^\s*\d\.\s(.*)/gm, '<li class="ml-5 list-decimal">$1</li>')
            .replace(/(\n<li>.*<\/li>)+/g, (match) => `<ul class="space-y-2">${match}</ul>`)
            .replace(/\n/g, '<br />');
    };

    return (
        <div className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed" 
             dangerouslySetInnerHTML={{ __html: formatContent(content) }} />
    );
};

const DeviceDetailsDisplay: React.FC<DeviceDetailsDisplayProps> = ({ device, remediation, isLoading, error, onGetRemediation }) => {
  return (
    <div className="bg-white/30 dark:bg-slate-800/30 p-6 rounded-lg shadow-lg h-full flex flex-col">
      <div className="flex-grow overflow-y-auto pr-2">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          {getDeviceIcon(device.type)}
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{device.hostname}</h2>
            <div className="flex gap-4 text-sm text-slate-500 dark:text-slate-400 font-mono">
              <span>{device.ipAddress}</span>
              <span>{device.macAddress}</span>
            </div>
          </div>
        </div>

        {/* Running Services */}
        <div className="mb-6">
            <h3 className="text-sm font-semibold text-cyan-500 dark:text-cyan-400 uppercase tracking-wider mb-3">Running Services</h3>
            <div className="space-y-3">
                {device.services.length > 0 ? device.services.map(service => (
                    <div key={service.id} className="bg-slate-200/50 dark:bg-slate-800/40 p-3 rounded-md flex items-center justify-between gap-4">
                        <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{service.name} <span className="text-xs font-mono text-slate-500 dark:text-slate-400">({service.port}/{service.protocol})</span></p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">Version: {service.version}</p>
                        </div>
                        {service.isInsecure && (
                            <div className="text-right">
                                <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400 mb-1">
                                    <AlertTriangleIcon className="h-4 w-4" />
                                    <span className="text-xs font-bold">Insecure</span>
                                </div>
                                <button
                                    onClick={() => onGetRemediation(service)}
                                    disabled={isLoading}
                                    className="flex items-center gap-1.5 text-xs bg-cyan-600/80 hover:bg-cyan-600 text-white font-semibold py-1 px-3 rounded-md transition-colors duration-200 disabled:opacity-50"
                                >
                                    <WrenchScrewdriverIcon className="h-3 w-3" />
                                    Get Remediation
                                </button>
                            </div>
                        )}
                    </div>
                )) : (
                    <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">No services detected on this device.</p>
                )}
            </div>
        </div>

        {/* Remediation Section */}
        {(isLoading || error || remediation) && (
             <div className="mt-4">
                <h3 className="text-sm font-semibold text-cyan-500 dark:text-cyan-400 uppercase tracking-wider mb-3">AI Remediation Plan</h3>
                 <div className="bg-slate-200/50 dark:bg-slate-800/40 p-4 rounded-md min-h-[150px]">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <CpuChipIcon className="h-10 w-10 text-cyan-500 dark:text-cyan-400 animate-pulse mb-3" />
                            <p className="text-slate-700 dark:text-slate-300 font-semibold">Gemini is generating remediation steps...</p>
                        </div>
                    )}
                    {error && (
                        <div className="text-red-700 dark:text-red-300 text-center">
                            <p className="font-bold">Failed to get remediation.</p>
                            <p>{error}</p>
                        </div>
                    )}
                    {remediation && !isLoading && (
                        <RemediationDisplay content={remediation} />
                    )}
                </div>
             </div>
        )}

      </div>
    </div>
  );
};

export default DeviceDetailsDisplay;