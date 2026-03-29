import React from 'react';
import { FirewallLog } from '../types';
import { BarChartIcon, AlertTriangleIcon, ShieldOffIcon, CpuChipIcon } from './icons';

type LogActionFilter = 'all' | 'blocked' | 'allowed' | 'analyzed';

interface SummaryMetricsProps {
  logs: FirewallLog[];
  analyzedCount: number;
  activeFilter: LogActionFilter;
  onFilterChange: (filter: LogActionFilter) => void;
}

const SummaryMetrics: React.FC<SummaryMetricsProps> = ({ logs, analyzedCount, activeFilter, onFilterChange }) => {
  const totalLogs = logs.length;
  const blockedCount = logs.filter(log => log.action === 'BLOCKED').length;
  const allowedCount = totalLogs - blockedCount;

  const MetricCard: React.FC<{ 
    icon: React.ReactNode; 
    label: string; 
    value: string | number; 
    color: string; 
    filterType: LogActionFilter;
  }> = ({ icon, label, value, color, filterType }) => {
    const isActive = activeFilter === filterType;
    const activeClasses = 'ring-2 ring-blue-500 shadow-lg';
    const baseClasses = `bg-gray-100 dark:bg-gray-900 p-4 rounded-lg flex items-center gap-4 border-l-4 w-full text-left transition-all duration-200 ease-in-out`;
    const hoverClasses = 'hover:bg-gray-200 dark:hover:bg-gray-800';

    return (
        <button 
            onClick={() => onFilterChange(filterType)}
            className={`${baseClasses} ${color} ${isActive ? activeClasses : hoverClasses}`}
        >
            {icon}
            <div>
                <div className="text-2xl font-bold text-black dark:text-white">{value}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
            </div>
        </button>
    )
};

  return (
    <div className="bg-white dark:bg-black p-4 rounded-lg border border-gray-200 dark:border-gray-800">
       <h2 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-4">Threat Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 gap-4">
        <MetricCard
          icon={<BarChartIcon className="h-8 w-8 text-blue-500" />}
          label="Total Events"
          value={totalLogs}
          color="border-blue-500"
          filterType="all"
        />
        <MetricCard
          icon={<ShieldOffIcon className="h-8 w-8 text-red-500" />}
          label="Threats Blocked"
          value={blockedCount}
          color="border-red-500"
          filterType="blocked"
        />
        <MetricCard
          icon={<AlertTriangleIcon className="h-8 w-8 text-yellow-500" />}
          label="Allowed Traffic"
          value={allowedCount}
          color="border-yellow-500"
          filterType="allowed"
        />
        <MetricCard
          icon={<CpuChipIcon className="h-8 w-8 text-green-500" />}
          label="AI Analyzed"
          value={analyzedCount}
          color="border-green-500"
          filterType="analyzed"
        />
      </div>
    </div>
  );
};

export default SummaryMetrics;