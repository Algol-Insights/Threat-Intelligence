import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FirewallLog, ThreatAnalysis, Severity, GeolocatedThreat, Alert, OrganizationalContext, NetworkDevice, RunningService } from './types';
import { MOCK_LOGS, MOCK_LOG_STREAM, MOCK_NETWORK_DEVICES } from './constants';
import { analyzeThreat, getRemediationSuggestion } from './services/geminiService';
import { getGeolocationsForLogs } from './services/ipGeolocationService';
import Dashboard from './components/Dashboard';
import DeviceDetailsDisplay from './components/DeviceDetailsDisplay';

// Simple rules for the alerting system
const ALERTING_RULES = [
  { keyword: 'sql injection', message: 'High-Priority: Potential SQL Injection attack detected.' },
  { keyword: 'c2', message: 'Critical Alert: Connection to known Command & Control server detected.' },
  { keyword: 'wannacry', message: 'Critical Alert: Activity matches WannaCry ransomware patterns.' },
  { keyword: 'rdp', message: 'High-Priority: Brute-force RDP attempt detected from unusual location.' },
];

const App: React.FC = () => {
  const [logs, setLogs] = useState<FirewallLog[]>(MOCK_LOGS);
  const [selectedLog, setSelectedLog] = useState<FirewallLog | null>(null);
  const [analysis, setAnalysis] = useState<ThreatAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzedLogs, setAnalyzedLogs] = useState<Record<string, ThreatAnalysis>>({});
  const [geolocatedThreats, setGeolocatedThreats] = useState<GeolocatedThreat[]>([]);
  const [severityFilter, setSeverityFilter] = useState<Severity | 'All'>('All');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [organizationalContext, setOrganizationalContext] = useState<OrganizationalContext | null>(null);
  
  // New state for network monitoring
  const [networkDevices, setNetworkDevices] = useState<NetworkDevice[]>(MOCK_NETWORK_DEVICES);
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(null);
  const [remediation, setRemediation] = useState<string | null>(null);
  const [isRemediationLoading, setIsRemediationLoading] = useState<boolean>(false);
  const [remediationError, setRemediationError] = useState<string | null>(null);


  // Effect for managing theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove(theme === 'dark' ? 'light' : 'dark');
    root.classList.add(theme);
  }, [theme]);

  // Effect for initial data load
  useEffect(() => {
    getGeolocationsForLogs(logs.filter(l => l.action === 'BLOCKED')).then(setGeolocatedThreats);
  }, []); // Note: dependency array changed to run once

  // Effect for real-time log streaming simulation
  useEffect(() => {
    let streamIndex = 0;
    const intervalId = setInterval(() => {
      const newLog = {
        ...MOCK_LOG_STREAM[streamIndex],
        id: `log-stream-${Date.now()}`,
        timestamp: new Date().toISOString(),
      };

      // Check for alerts
      ALERTING_RULES.forEach(rule => {
        if (newLog.description.toLowerCase().includes(rule.keyword)) {
          setAlerts(prev => [...prev, {
            id: `alert-${Date.now()}`,
            message: rule.message,
            timestamp: newLog.timestamp,
            logId: newLog.id,
          }]);
        }
      });
      
      // Add new log to the list
      setLogs(prevLogs => [newLog, ...prevLogs]);

      // Update map if it's a blocked threat
      if (newLog.action === 'BLOCKED') {
        getGeolocationsForLogs([newLog]).then(newThreats => {
          if (newThreats.length > 0) {
            setGeolocatedThreats(prev => [...prev, ...newThreats]);
          }
        });
      }

      streamIndex = (streamIndex + 1) % MOCK_LOG_STREAM.length;
    }, 4000); // Add a new log every 4 seconds

    return () => clearInterval(intervalId);
  }, []);

  const handleSelectLog = useCallback((log: FirewallLog) => {
    setSelectedDevice(null); // Deselect any device
    setRemediation(null); // Clear remediation
    setSelectedLog(log);
    if (analyzedLogs[log.id]) {
      setAnalysis(analyzedLogs[log.id]);
      setError(null);
    } else {
      setAnalysis(null);
      setError(null);
    }
  }, [analyzedLogs]);

  const handleAnalyze = useCallback(async () => {
    if (!selectedLog) return;

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const result = await analyzeThreat(selectedLog, organizationalContext);
      setAnalysis(result);
      setAnalyzedLogs(prev => ({...prev, [selectedLog.id]: result}));
    } catch (err) {
      setError('Failed to get analysis from Gemini. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLog, organizationalContext]);
  
  const filteredLogs = useMemo(() => {
    if (severityFilter === 'All') {
      return logs;
    }
    return logs.filter(log => {
      const analysis = analyzedLogs[log.id];
      // Use contextual severity for filtering if available
      const severity = analysis?.contextualSeverity || analysis?.severity;
      // Keep logs that haven't been analyzed OR that match the filter
      return !analysis || severity === severityFilter;
    });
  }, [logs, severityFilter, analyzedLogs]);

  const handleDismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const handleAlertClick = (logId: string) => {
      const log = logs.find(l => l.id === logId);
      if (log) {
          handleSelectLog(log);
      }
  };

  // Handlers for network monitoring
  const handleSelectDevice = useCallback((device: NetworkDevice) => {
    setSelectedLog(null); // Deselect any log
    setAnalysis(null); // Clear analysis
    setSelectedDevice(device);
    setRemediation(null); // Clear previous remediation
    setRemediationError(null);
  }, []);

  const handleGetRemediation = useCallback(async (service: RunningService) => {
    setIsRemediationLoading(true);
    setRemediation(null);
    setRemediationError(null);
    try {
      const result = await getRemediationSuggestion(service);
      setRemediation(result);
    } catch (err) {
      setRemediationError("Failed to get remediation steps from Gemini.");
      console.error(err);
    } finally {
      setIsRemediationLoading(false);
    }
  }, []);

  const mainView = useMemo(() => {
    if (selectedDevice) {
      return (
        <DeviceDetailsDisplay 
          device={selectedDevice}
          remediation={remediation}
          isLoading={isRemediationLoading}
          error={remediationError}
          onGetRemediation={handleGetRemediation}
        />
      );
    }
    // Default to Threat Analysis view, which handles the "no log selected" case internally
    return (
       <Dashboard
        logs={filteredLogs}
        allLogs={logs}
        selectedLog={selectedLog}
        analysis={analysis}
        isLoading={isLoading}
        error={error}
        onSelectLog={handleSelectLog}
        onAnalyze={handleAnalyze}
        analyzedLogs={analyzedLogs}
        geolocatedThreats={geolocatedThreats}
        severityFilter={severityFilter}
        onFilterChange={setSeverityFilter}
        theme={theme}
        onThemeToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        alerts={alerts}
        onDismissAlert={handleDismissAlert}
        onAlertClick={handleAlertClick}
        isSettingsOpen={isSettingsOpen}
        onSettingsToggle={() => setIsSettingsOpen(prev => !prev)}
        organizationalContext={organizationalContext}
        onContextChange={setOrganizationalContext}
        networkDevices={networkDevices}
        onSelectDevice={handleSelectDevice}
        selectedDeviceId={selectedDevice?.id}
      />
    );
  }, [
      selectedDevice, remediation, isRemediationLoading, remediationError, handleGetRemediation,
      filteredLogs, logs, selectedLog, analysis, isLoading, error, handleSelectLog, handleAnalyze,
      analyzedLogs, geolocatedThreats, severityFilter, theme, alerts, isSettingsOpen,
      organizationalContext, networkDevices, handleSelectDevice
  ]);

  return (
    <div className={`min-h-screen font-sans p-4 lg:p-6 transition-colors duration-300 ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-100'}`}>
      {mainView}
    </div>
  );
};

export default App;