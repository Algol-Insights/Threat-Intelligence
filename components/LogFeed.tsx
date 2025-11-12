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

const getSeverityColor = (severity: Severity, theme: 'light' | 'dark' = 'dark') => {
  const styles = {
    [Severity.Critical]: 'bg-red-500/20 text-red-500 dark:text-red-400 border-red-500',
    [Severity.High]: 'bg-orange-500/20 text-orange-500 dark:text-orange-400 border-orange-500',
    [Severity.Medium]: 'bg-yellow-500/20 text-yellow-500 dark:text-yellow-400 border-yellow-500',
    [Severity.Low]: 'bg-blue-500/20 text-blue-500 dark:text-blue-400 border-blue-500',
    [Severity.Informational]: 'bg-green-500/20 text-green-500 dark:text-green-400 border-green-500',
  };
  return styles[severity] || styles[Severity.Informational];
};


const ThreatRow: React.FC<{ log: FirewallLog; isSelected: boolean; onSelect: () => void; analysis?: ThreatAnalysis; }> = ({ log, isSelected, onSelect, analysis }) => {
  const baseClasses = "flex items-center p-3 rounded-md cursor-pointer transition-all duration-200 ease-in-out mb-2";
  const selectedClasses = "bg-cyan-500/20 ring-2 ring-cyan-500";
  const unselectedClasses = "bg-slate-200 dark:bg-slate-800/60 hover:bg-slate-300 dark:hover:bg-slate-700/80";
  const actionColor = log.action === 'BLOCKED' ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400';

  return (
    <div className={`${baseClasses} ${isSelected ? selectedClasses : unselectedClasses}`} onClick={onSelect}>
      <div className="flex-grow">
        <div className="flex justify-between items-center">
          <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{log.sourceIp}:{log.destinationPort}</span>
          <span className={`font-bold text-xs ${actionColor}`}>{log.action}</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{log.description}</p>
        {analysis && (
             <div className={`mt-2 text-xs font-semibold inline-block px-2 py-0.5 rounded-full border ${getSeverityColor(analysis.severity)}`}>
             {analysis.severity}
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
                const activeClasses = 'bg-cyan-600 text-white';
                const inactiveClasses = 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-300';
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
    <div className="bg-white/30 dark:bg-slate-800/30 p-4 rounded-lg shadow-lg backdrop-blur-sm flex flex-col flex-grow min-h-[400px]">
      <div className="flex items-center gap-2 mb-2">
        <WifiIcon className="h-6 w-6 text-cyan-500 dark:text-cyan-400" />
        <h2 className="text-lg font-semibold text-cyan-500 dark:text-cyan-400">Live Firewall Feed</h2>
      </div>
      <FilterControls currentFilter={severityFilter} onFilterChange={onFilterChange} />
      <div className="flex-grow overflow-y-auto pr-2">
        {logs.map(log => (
          <ThreatRow
            key={log.id}
            log={log}
            isSelected={log.id === selectedLogId}
            onSelect={() => onSelectLog(log)}
            analysis={analyzedLogs[log.id]}
          />
        ))}
      </div>
    </div>
  );
};

export default LogFeed;