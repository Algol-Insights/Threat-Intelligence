import React from 'react';
import { FirewallLog, ThreatAnalysis, Severity } from '../types';
import { WifiIcon } from './icons';

interface LogFeedProps {
  logs: FirewallLog[];
  onSelectLog: (log: FirewallLog) => void;
  selectedLogId?: string;
  analyzedLogs: Record<string, ThreatAnalysis>;
  severityFilter: Severity | 'All';
  onFilterChange: (severity: Severity | 'All') => void;
}

const getSeverityColor = (severity: Severity) => {
  const styles = {
    [Severity.Critical]: 'bg-red-500/10 text-red-500 border-red-500',
    [Severity.High]: 'bg-orange-500/10 text-orange-500 border-orange-500',
    [Severity.Medium]: 'bg-yellow-500/10 text-yellow-500 border-yellow-500',
    [Severity.Low]: 'bg-blue-500/10 text-blue-500 border-blue-500',
    [Severity.Informational]: 'bg-green-500/10 text-green-500 border-green-500',
  };
  return styles[severity] || styles[Severity.Informational];
};


const ThreatRow: React.FC<{ log: FirewallLog; isSelected: boolean; onSelect: () => void; analysis?: ThreatAnalysis; }> = ({ log, isSelected, onSelect, analysis }) => {
  const baseClasses = "flex items-center p-3 rounded-md cursor-pointer transition-all duration-200 ease-in-out mb-2";
  const selectedClasses = "bg-blue-500/20 ring-2 ring-blue-500";
  const unselectedClasses = "bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800";
  const actionColor = log.action === 'BLOCKED' ? 'text-red-500' : 'text-green-500';

  return (
    <div className={`${baseClasses} ${isSelected ? selectedClasses : unselectedClasses}`} onClick={onSelect}>
      <div className="flex-grow">
        <div className="flex justify-between items-center">
          <span className="font-mono text-sm text-gray-700 dark:text-gray-300">{log.sourceIp}:{log.destinationPort}</span>
          <span className={`font-bold text-xs ${actionColor}`}>{log.action}</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{log.description}</p>
        {analysis && (
             <div className={`mt-2 text-xs font-semibold inline-block px-2 py-0.5 rounded-full border ${getSeverityColor(analysis.contextualSeverity || analysis.severity)}`}>
             {analysis.contextualSeverity || analysis.severity}
           </div>
        )}
      </div>
    </div>
  );
};

const FilterControls: React.FC<{ currentFilter: Severity | 'All'; onFilterChange: (filter: Severity | 'All') => void;}> = ({ currentFilter, onFilterChange }) => {
    const filters: (Severity | 'All')[] = ['All', Severity.Critical, Severity.High, Severity.Medium, Severity.Low];
    return (
        <div className="flex flex-wrap gap-2 mb-4">
            {filters.map(filter => {
                const isActive = currentFilter === filter;
                const activeClasses = 'bg-blue-600 text-white';
                const inactiveClasses = 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-black dark:text-white';
                return (
                    <button 
                        key={filter} 
                        onClick={() => onFilterChange(filter)}
                        className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors duration-200 ${isActive ? activeClasses : inactiveClasses}`}
                    >
                        {filter}
                    </button>
                )
            })}
        </div>
    );
};


const LogFeed: React.FC<LogFeedProps> = ({ logs, onSelectLog, selectedLogId, analyzedLogs, severityFilter, onFilterChange }) => {
  return (
    <div className="bg-white dark:bg-black p-4 rounded-lg border border-gray-200 dark:border-gray-800 flex flex-col flex-grow min-h-[400px]">
      <div className="flex items-center gap-2 mb-2">
        <WifiIcon className="h-6 w-6 text-blue-500" />
        <h2 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Live Firewall Feed</h2>
      </div>
      <FilterControls currentFilter={severityFilter} onFilterChange={onFilterChange} />
      <div className="flex-grow overflow-y-auto pr-2">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
            <WifiIcon className="h-12 w-12 mb-4" />
            <p className="font-semibold">Waiting for incoming firewall logs...</p>
            <p className="text-xs mt-1">Ensure your firewall is configured to send syslog data to this server.</p>
          </div>
        ) : (
          logs.map(log => (
            <ThreatRow
              key={log.id}
              log={log}
              isSelected={log.id === selectedLogId}
              onSelect={() => onSelectLog(log)}
              analysis={analyzedLogs[log.id]}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default LogFeed;