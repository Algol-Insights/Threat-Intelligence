import React from 'react';
import { NetworkDevice, DeviceType } from '../types';
import { ComputerDesktopIcon, ServerIcon, DevicePhoneMobileIcon, WifiIcon } from './icons';

interface NetworkDevicesProps {
  devices: NetworkDevice[];
  onSelectDevice: (device: NetworkDevice) => void;
  selectedDeviceId?: string;
}

const getDeviceIcon = (type: DeviceType) => {
  switch (type) {
    case DeviceType.Server:
      return <ServerIcon className="h-6 w-6 flex-shrink-0" />;
    case DeviceType.Workstation:
      return <ComputerDesktopIcon className="h-6 w-6 flex-shrink-0" />;
    case DeviceType.Mobile:
      return <DevicePhoneMobileIcon className="h-6 w-6 flex-shrink-0" />;
    default:
      return <ComputerDesktopIcon className="h-6 w-6 flex-shrink-0" />;
  }
};

const DeviceRow: React.FC<{ device: NetworkDevice; isSelected: boolean; onSelect: () => void; }> = ({ device, isSelected, onSelect }) => {
  const baseClasses = "flex items-center p-3 rounded-md cursor-pointer transition-all duration-200 ease-in-out mb-2";
  const selectedClasses = "bg-cyan-500/20 ring-2 ring-cyan-500";
  const unselectedClasses = "bg-slate-200 dark:bg-slate-800/60 hover:bg-slate-300 dark:hover:bg-slate-700/80";
  const statusColor = device.status === 'Online' ? 'text-green-500 dark:text-green-400' : 'text-slate-500';

  return (
    <div className={`${baseClasses} ${isSelected ? selectedClasses : unselectedClasses}`} onClick={onSelect}>
      <div className="flex items-center gap-3 w-full">
        <div className={`text-slate-600 dark:text-slate-300 ${statusColor}`}>
            {getDeviceIcon(device.type)}
        </div>
        <div className="flex-grow">
            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{device.hostname}</p>
            <p className="font-mono text-xs text-slate-500 dark:text-slate-400">{device.ipAddress}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
            <div className={`h-2 w-2 rounded-full ${device.status === 'Online' ? 'bg-green-500' : 'bg-slate-500'}`}></div>
            <span className={statusColor}>{device.status}</span>
        </div>
      </div>
    </div>
  );
};

const NetworkDevices: React.FC<NetworkDevicesProps> = ({ devices, onSelectDevice, selectedDeviceId }) => {
  return (
    <div className="bg-white/30 dark:bg-slate-800/30 p-4 rounded-lg shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4">
        <WifiIcon className="h-6 w-6 text-cyan-500 dark:text-cyan-400 transform -rotate-45" />
        <h2 className="text-lg font-semibold text-cyan-500 dark:text-cyan-400">Connected Devices</h2>
      </div>
      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
        {devices.map(device => (
          <DeviceRow
            key={device.id}
            device={device}
            isSelected={device.id === selectedDeviceId}
            onSelect={() => onSelectDevice(device)}
          />
        ))}
      </div>
    </div>
  );
};

export default NetworkDevices;