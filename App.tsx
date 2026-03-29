import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FirewallLog, ThreatAnalysis, Severity, GeolocatedThreat, Alert, OrganizationalContext, NetworkDevice, RunningService } from './types';
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
  { keyword: 'tor', message: 'Medium-Priority: Outbound connection to TOR network detected.' },
];

type LogActionFilter = 'all' | 'blocked' | 'allowed' | 'analyzed';

const App: React.FC = () => {
  const [logs, setLogs] = useState<FirewallLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<FirewallLog | null>(null);
  const [analysis, setAnalysis] = useState<ThreatAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzedLogs, setAnalyzedLogs] = useState<Record<string, ThreatAnalysis>>({});
  const [geolocatedThreats, setGeolocatedThreats] = useState<GeolocatedThreat[]>([]);
  const [severityFilter, setSeverityFilter] = useState<Severity | 'All'>('All');
  const [logActionFilter, setLogActionFilter] = useState<LogActionFilter>('all');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [organizationalContext, setOrganizationalContext] = useState<OrganizationalContext | null>(null);
  
  // New state for network monitoring
  const [networkDevices, setNetworkDevices] = useState<NetworkDevice[]>([]);
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

  // Effect for real-time data from WebSocket backend
  useEffect(() => {
    // Make WebSocket URL dynamic to improve deployment flexibility
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:8080`;
    console.log(`Attempting to connect to WebSocket at ${wsUrl}`);
    
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connection established with Algol backend.");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'NEW_LOG') {
        const newLog: FirewallLog = data.payload;
        
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
        
        setLogs(prevLogs => [newLog, ...prevLogs]);

        if (newLog.action === 'BLOCKED') {
          getGeolocationsForLogs([newLog]).then(newThreats => {
            if (newThreats.length > 0) {
              setGeolocatedThreats(prev => [...prev, ...newThreats]);
            }
          });
        }
      } else if (data.type === 'NETWORK_UPDATE') {
        const devices: NetworkDevice[] = data.payload;
        setNetworkDevices(devices);
      }
    };

    socket.onclose = (event: CloseEvent) => {
      console.warn(`WebSocket connection closed. Code: ${event.code}, Reason: '${event.reason}'. Cleanly closed: ${event.wasClean}.`);
      // Optional: implement reconnect logic here
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    // Cleanup on component unmount
    return () => {
      socket.close();
    };
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
      setError('Failed to get analysis from Algol. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedLog, organizationalContext]);
  
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Action filter
      if (logActionFilter !== 'all') {
        if (logActionFilter === 'blocked' && log.action !== 'BLOCKED') return false;
        if (logActionFilter === 'allowed' && log.action !== 'ALLOWED') return false;
        if (logActionFilter === 'analyzed' && !analyzedLogs[log.id]) return false;
      }
      
      // Severity filter
      if (severityFilter !== 'All') {
        const analysis = analyzedLogs[log.id];
        const severity = analysis?.contextualSeverity || analysis?.severity;
        if (!analysis || severity !== severityFilter) return false;
      }
      
      return true;
    });
  }, [logs, severityFilter, analyzedLogs, logActionFilter]);

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
  
  const handleBackToDashboard = useCallback(() => {
    setSelectedDevice(null);
  }, []);

  const handleGetRemediation = useCallback(async (service: RunningService) => {
    setIsRemediationLoading(true);
    setRemediation(null);
    setRemediationError(null);
    try {
      const result = await getRemediationSuggestion(service);
      setRemediation(result);
    } catch (err) {
      setRemediationError("Failed to get remediation steps from Algol.");
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
          onBack={handleBackToDashboard}
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
        logActionFilter={logActionFilter}
        onLogActionFilterChange={setLogActionFilter}
      />
    );
  }, [
      selectedDevice, remediation, isRemediationLoading, remediationError, handleGetRemediation, handleBackToDashboard,
      filteredLogs, logs, selectedLog, analysis, isLoading, error, handleSelectLog, handleAnalyze,
      analyzedLogs, geolocatedThreats, severityFilter, logActionFilter, theme, alerts, isSettingsOpen,
      organizationalContext, networkDevices, handleSelectDevice
  ]);

  return (
    <div className={`min-h-screen font-sans p-4 lg:p-6 transition-colors duration-300 ${theme === 'dark' ? 'bg-black' : 'bg-white'}`}>
      {mainView}
    </div>
  );
};

export default App;
