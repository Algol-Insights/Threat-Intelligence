import React from 'react';
import { FirewallLog } from '../types';
import { BarChartIcon, AlertTriangleIcon, ShieldOffIcon, CpuChipIcon } from './icons';

interface SummaryMetricsProps {
  logs: FirewallLog[];
  analyzedCount: number;
}

const SummaryMetrics: React.FC<SummaryMetricsProps> = ({ logs, analyzedCount }) => {
  const totalLogs = logs.length;
  const blockedCount = logs.filter(log => log.action === 'BLOCKED').length;
  const allowedCount = totalLogs - blockedCount;

  const MetricCard: React.FC<{ icon: React.ReactNode; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
    <div className={`bg-gray-100 dark:bg-gray-900 p-4 rounded-lg flex items-center gap-4 border-l-4 ${color}`}>
      {icon}
      <div>
        <div className="text-2xl font-bold text-black dark:text-white">{value}</div>
        <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-black p-4 rounded-lg border border-gray-200 dark:border-gray-800">
       <h2 className="text-lg font-semibold text-blue-600 dark:text-blue-400 mb-4">Threat Overview</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 gap-4">
        <MetricCard
          icon={<BarChartIcon className="h-8 w-8 text-blue-500" />}
          label="Total Events"
          value={totalLogs}
          color="border-blue-500"
        />
        <MetricCard
          icon={<ShieldOffIcon className="h-8 w-8 text-red-500" />}
          label="Threats Blocked"
          value={blockedCount}
          color="border-red-500"
        />
        <MetricCard
          icon={<AlertTriangleIcon className="h-8 w-8 text-yellow-500" />}
          label="Allowed Traffic"
          value={allowedCount}
          color="border-yellow-500"
        />
        <MetricCard
          icon={<CpuChipIcon className="h-8 w-8 text-green-500" />}
          label="AI Analyzed"
          value={analyzedCount}
          color="border-green-500"
        />
      </div>
    </div>
  );
};

export default SummaryMetrics;
