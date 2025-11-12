import React, { useMemo } from 'react';
import { FirewallLog, ThreatAnalysis, Severity } from '../types';
import { TrophyIcon } from './icons';

interface TopThreatsProps {
  analyzedLogs: Record<string, ThreatAnalysis>;
  logs: FirewallLog[];
  onSelectLog: (log: FirewallLog) => void;
}

const SeverityBadge: React.FC<{ severity: Severity }> = ({ severity }) => {
    const severityStyles: { [key in Severity]: string } = {
        [Severity.Critical]: 'bg-red-500/20 text-red-500 dark:text-red-400 border-red-500',
        [Severity.High]: 'bg-orange-500/20 text-orange-500 dark:text-orange-400 border-orange-500',
        [Severity.Medium]: 'bg-yellow-500/20 text-yellow-500 dark:text-yellow-400 border-yellow-500',
        [Severity.Low]: 'bg-blue-500/20 text-blue-500 dark:text-blue-400 border-blue-500',
        [Severity.Informational]: 'bg-green-500/20 text-green-500 dark:text-green-400 border-green-500',
    };
    return (
        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${severityStyles[severity]}`}>
            {severity}
        </span>
    );
};


const TopThreats: React.FC<TopThreatsProps> = ({ analyzedLogs, logs, onSelectLog }) => {
  const topThreats = useMemo(() => {
    const severityOrder: Severity[] = [
      Severity.Critical,
      Severity.High,
      Severity.Medium,
      Severity.Low,
      Severity.Informational,
    ];

    const allAnalyzed = Object.entries(analyzedLogs)
      .map(([logId, analysis]) => {
        const log = logs.find(l => l.id === logId);
        return log ? { log, analysis } : null;
      })
      .filter(item => item !== null) as { log: FirewallLog; analysis: ThreatAnalysis }[];

    return allAnalyzed
      .sort((a, b) => {
        const severityA = severityOrder.indexOf(a.analysis.contextualSeverity || a.analysis.severity);
        const severityB = severityOrder.indexOf(b.analysis.contextualSeverity || b.analysis.severity);
        return severityA - severityB;
      })
      .slice(0, 5);
  }, [analyzedLogs, logs]);

  if (topThreats.length === 0) {
    return (
      <div className="bg-white/30 dark:bg-slate-800/30 p-4 rounded-lg shadow-lg backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-2">
            <TrophyIcon className="h-6 w-6 text-cyan-500 dark:text-cyan-400" />
            <h2 className="text-lg font-semibold text-cyan-500 dark:text-cyan-400">Top 5 Critical Threats</h2>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">No threats have been analyzed yet. Analyze a threat to see rankings here.</p>
    </div>
    )
  }

  return (
    <div className="bg-white/30 dark:bg-slate-800/30 p-4 rounded-lg shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4">
        <TrophyIcon className="h-6 w-6 text-cyan-500 dark:text-cyan-400" />
        <h2 className="text-lg font-semibold text-cyan-500 dark:text-cyan-400">Top 5 Critical Threats</h2>
      </div>
      <ol className="space-y-3">
        {topThreats.map(({ log, analysis }, index) => (
          <li
            key={log.id}
            onClick={() => onSelectLog(log)}
            className="flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors duration-200 bg-slate-200 dark:bg-slate-800/40 hover:bg-slate-300 dark:hover:bg-slate-700/60"
          >
            <span className="text-lg font-bold text-slate-400 dark:text-slate-500">{index + 1}</span>
            <div className="flex-grow">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{analysis.threatName}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">{log.sourceIp}</p>
            </div>
            <SeverityBadge severity={analysis.contextualSeverity || analysis.severity} />
          </li>
        ))}
      </ol>
    </div>
  );
};

export default TopThreats;