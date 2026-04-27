import React from 'react';
import { FirewallLog, ThreatAnalysis, GeolocatedThreat, Severity, Alert, OrganizationalContext, NetworkDevice } from '../types';
import LogFeed from './LogFeed';
import SummaryMetrics from './SummaryMetrics';
import ThreatAnalysisDisplay from './ThreatAnalysisDisplay';
import ThreatMap from './ThreatMap';
import TopThreats from './TopThreats';
import Alerts from './Alerts';
import SettingsModal from './SettingsModal';
import TrainingScenario from './TrainingScenario';
import NetworkDevices from './NetworkDevices';
import { ShieldCheckIcon, SunIcon, MoonIcon, Cog6ToothIcon } from './icons';

interface DashboardProps {
  logs: FirewallLog[];
  allLogs: FirewallLog[]; // For TopThreats, which needs all logs regardless of filter
  selectedLog: FirewallLog | null;
  analysis: ThreatAnalysis | null;
  isLoading: boolean;
  error: string | null;
  onSelectLog: (log: FirewallLog) => void;
  onAnalyze: () => void;
  analyzedLogs: Record<string, ThreatAnalysis>;
  geolocatedThreats: GeolocatedThreat[];
  severityFilter: Severity | 'All';
  onFilterChange: (severity: Severity | 'All') => void;
  theme: 'dark' | 'light';
  onThemeToggle: () => void;
  alerts: Alert[];
  onDismissAlert: (alertId: string) => void;
  onAlertClick: (logId: string) => void;
  isSettingsOpen: boolean;
  onSettingsToggle: () => void;
  organizationalContext: OrganizationalContext | null;
  onContextChange: (context: OrganizationalContext | null) => void;
  networkDevices: NetworkDevice[];
  onSelectDevice: (device: NetworkDevice) => void;
  selectedDeviceId: string | undefined;
}

const Dashboard: React.FC<DashboardProps> = ({
  logs,
  allLogs,
  selectedLog,
  analysis,
  isLoading,
  error,
  onSelectLog,
  onAnalyze,
  analyzedLogs,
  geolocatedThreats,
  severityFilter,
  onFilterChange,
  theme,
  onThemeToggle,
  alerts,
  onDismissAlert,
  onAlertClick,
  isSettingsOpen,
  onSettingsToggle,
  organizationalContext,
  onContextChange,
  networkDevices,
  onSelectDevice,
  selectedDeviceId,
}) => {
  return (
    <div className="flex flex-col gap-4 lg:gap-6 h-full">
      <header className="flex items-center justify-between gap-3 border-b-2 border-blue-500/30 pb-4">
        <div className="flex items-center gap-3">
            <ShieldCheckIcon className="h-10 w-10 text-blue-500" />
            <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-black dark:text-white tracking-wider">
                Algol CTI Platform
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Cyber Threat Intelligence & Network Security</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <button
                onClick={onSettingsToggle}
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                title="Organizational Context Settings"
            >
                <Cog6ToothIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
            </button>
            <button
                onClick={onThemeToggle}
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
                title="Toggle Theme"
            >
                {theme === 'dark' ? <SunIcon className="h-6 w-6 text-yellow-400" /> : <MoonIcon className="h-6 w-6 text-gray-700" />}
            </button>
        </div>
      </header>
      
      <Alerts alerts={alerts} onDismiss={onDismissAlert} onAlertClick={onAlertClick} />
      
      {isSettingsOpen && (
        <SettingsModal
          onClose={onSettingsToggle}
          currentContext={organizationalContext}
          onSave={onContextChange}
        />
      )}

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 min-h-0">
        <div className="lg:col-span-1 flex flex-col gap-4 lg:gap-6 overflow-y-auto pr-2">
          <SummaryMetrics logs={allLogs} analyzedCount={Object.keys(analyzedLogs).length} />
          <NetworkDevices devices={networkDevices} onSelectDevice={onSelectDevice} selectedDeviceId={selectedDeviceId} />
          <TopThreats analyzedLogs={analyzedLogs} logs={allLogs} onSelectLog={onSelectLog} />
          <TrainingScenario />
          <ThreatMap threats={geolocatedThreats} />
          <LogFeed 
            logs={logs} 
            onSelectLog={onSelectLog} 
            selectedLogId={selectedLog?.id} 
            analyzedLogs={analyzedLogs}
            severityFilter={severityFilter}
            onFilterChange={onFilterChange}
          />
        </div>
        <div className="lg:col-span-2">
          <ThreatAnalysisDisplay
            selectedLog={selectedLog}
            analysis={analysis}
            isLoading={isLoading}
            error={error}
            onAnalyze={onAnalyze}
          />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
