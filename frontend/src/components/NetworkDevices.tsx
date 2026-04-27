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
  const selectedClasses = "bg-blue-500/20 ring-2 ring-blue-500";
  const unselectedClasses = "bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800";
  const statusColor = device.status === 'Online' ? 'text-green-500' : 'text-gray-500';

  return (
    <div className={`${baseClasses} ${isSelected ? selectedClasses : unselectedClasses}`} onClick={onSelect}>
      <div className="flex items-center gap-3 w-full">
        <div className={`text-gray-600 dark:text-gray-300 ${statusColor}`}>
            {getDeviceIcon(device.type)}
        </div>
        <div className="flex-grow">
            <p className="font-semibold text-sm text-black dark:text-white">{device.hostname}</p>
            <p className="font-mono text-xs text-gray-500 dark:text-gray-400">{device.ipAddress}</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
            <div className={`h-2 w-2 rounded-full ${device.status === 'Online' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            <span className={statusColor}>{device.status}</span>
        </div>
      </div>
    </div>
  );
};

const NetworkDevices: React.FC<NetworkDevicesProps> = ({ devices, onSelectDevice, selectedDeviceId }) => {
  return (
    <div className="bg-white dark:bg-black p-4 rounded-lg border border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <WifiIcon className="h-6 w-6 text-blue-500 transform -rotate-45" />
        <h2 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Connected Devices</h2>
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
