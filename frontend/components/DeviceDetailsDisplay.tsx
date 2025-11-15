import React from 'react';
import { NetworkDevice, RunningService, DeviceType } from '../types';
import { ComputerDesktopIcon, ServerIcon, DevicePhoneMobileIcon, WrenchScrewdriverIcon, CpuChipIcon, AlertTriangleIcon, ArrowLeftIcon } from './icons';

interface DeviceDetailsDisplayProps {
  device: NetworkDevice;
  remediation: string | null;
  isLoading: boolean;
  error: string | null;
  onGetRemediation: (service: RunningService) => void;
  onBack: () => void;
}

const getDeviceIcon = (type: DeviceType) => {
  const iconProps = { className: "h-12 w-12 text-gray-500 dark:text-gray-400" };
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
            .replace(/### (.*)/g, '<h3 class="text-lg font-semibold text-black dark:text-white mt-4 mb-2">$1</h3>')
            .replace(/\*\*(.*)\*\*/g, '<strong class="font-semibold text-black dark:text-white">$1</strong>')
            .replace(/`([^`]+)`/g, '<code class="bg-gray-200 dark:bg-gray-800 rounded-md px-1.5 py-1 font-mono text-sm">$1</code>')
            .replace(/^\s*\d\.\s(.*)/gm, '<li class="ml-5 list-decimal">$1</li>')
            .replace(/(?:\n<li>.*<\/li>)+/s, (match) => `<ul class="space-y-2">${match}</ul>`)
            .replace(/\n/g, '<br />');
    };

    return (
        <div className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 leading-relaxed" 
             dangerouslySetInnerHTML={{ __html: formatContent(content) }} />
    );
};

const DeviceDetailsDisplay: React.FC<DeviceDetailsDisplayProps> = ({ device, remediation, isLoading, error, onGetRemediation, onBack }) => {
  return (
    <div className="bg-white dark:bg-black p-6 rounded-lg border border-gray-200 dark:border-gray-800 h-full flex flex-col">
       <div className="flex-shrink-0 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-black rounded-md p-1 -ml-1"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Main Dashboard
        </button>
      </div>
      <div className="flex-grow overflow-y-auto pr-2">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          {getDeviceIcon(device.type)}
          <div>
            <h2 className="text-2xl font-bold text-black dark:text-white">{device.hostname}</h2>
            <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400 font-mono">
              <span>{device.ipAddress}</span>
              <span>{device.macAddress}</span>
            </div>
          </div>
        </div>

        {/* Running Services */}
        <div className="mb-6">
            <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">Running Services</h3>
            <div className="space-y-3">
                {device.services.length > 0 ? device.services.map(service => (
                    <div key={service.id} className="bg-gray-100 dark:bg-gray-900 p-3 rounded-md flex items-center justify-between gap-4">
                        <div>
                            <p className="font-semibold text-black dark:text-white">{service.name} <span className="text-xs font-mono text-gray-500 dark:text-gray-400">({service.port}/{service.protocol})</span></p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Version: {service.version}</p>
                        </div>
                        {service.isInsecure && (
                            <div className="text-right">
                                <div className="flex items-center gap-2 text-red-500 mb-1">
                                    <AlertTriangleIcon className="h-4 w-4" />
                                    <span className="text-xs font-bold">Insecure</span>
                                </div>
                                <button
                                    onClick={() => onGetRemediation(service)}
                                    disabled={isLoading}
                                    className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold py-1 px-3 rounded-md transition-colors duration-200 disabled:opacity-50"
                                >
                                    <WrenchScrewdriverIcon className="h-3 w-3" />
                                    Get Remediation
                                </button>
                            </div>
                        )}
                    </div>
                )) : (
                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">No services detected on this device.</p>
                )}
            </div>
        </div>

        {/* Remediation Section */}
        {(isLoading || error || remediation) && (
             <div className="mt-4">
                <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">AI Remediation Plan</h3>
                 <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-md min-h-[150px]">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <CpuChipIcon className="h-10 w-10 text-blue-500 animate-pulse mb-3" />
                            <p className="text-black dark:text-white font-semibold">Algol is generating remediation steps...</p>
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