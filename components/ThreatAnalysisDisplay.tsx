import React from 'react';
import { FirewallLog, ThreatAnalysis, Severity } from '../types';
import { CpuChipIcon, ShieldExclamationIcon, DocumentArrowDownIcon, TableCellsIcon } from './icons';

interface ThreatAnalysisDisplayProps {
  selectedLog: FirewallLog | null;
  analysis: ThreatAnalysis | null;
  isLoading: boolean;
  error: string | null;
  onAnalyze: () => void;
}

const SeverityBadge: React.FC<{ analysis: ThreatAnalysis }> = ({ analysis }) => {
    const { severity, contextualSeverity } = analysis;
    
    const getSeverityStyles = (sev: Severity) => ({
        [Severity.Critical]: 'bg-red-500/20 text-red-500 dark:text-red-400 border-red-500',
        [Severity.High]: 'bg-orange-500/20 text-orange-500 dark:text-orange-400 border-orange-500',
        [Severity.Medium]: 'bg-yellow-500/20 text-yellow-500 dark:text-yellow-400 border-yellow-500',
        [Severity.Low]: 'bg-blue-500/20 text-blue-500 dark:text-blue-400 border-blue-500',
        [Severity.Informational]: 'bg-green-500/20 text-green-500 dark:text-green-400 border-green-500',
    }[sev]);
    
    const hasContextualChange = contextualSeverity && contextualSeverity !== severity;

    return (
        <div className="flex flex-col items-end gap-1">
             <span title={hasContextualChange ? `Adaptive Severity (Original: ${severity})` : 'Severity'} className={`px-3 py-1 text-sm font-bold rounded-full border ${getSeverityStyles(contextualSeverity || severity)}`}>
                {contextualSeverity || severity}
            </span>
            {hasContextualChange && (
                 <span className="text-xs text-cyan-600 dark:text-cyan-400">Context-Adjusted</span>
            )}
        </div>
    );
};

const AnalysisSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-6">
        <h3 className="text-sm font-semibold text-cyan-500 dark:text-cyan-400 uppercase tracking-wider mb-2">{title}</h3>
        <div className="text-slate-700 dark:text-slate-300 text-base leading-relaxed bg-slate-200/50 dark:bg-slate-800/40 p-4 rounded-md">{children}</div>
    </div>
);


const ThreatAnalysisDisplay: React.FC<ThreatAnalysisDisplayProps> = ({ selectedLog, analysis, isLoading, error, onAnalyze }) => {
  if (!selectedLog) {
    return (
      <div className="bg-white/30 dark:bg-slate-800/30 p-6 rounded-lg shadow-lg flex flex-col justify-center items-center h-full text-center">
        <ShieldExclamationIcon className="h-16 w-16 text-slate-400 dark:text-slate-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300">No Threat Selected</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Please select a log from the feed to view its analysis.</p>
      </div>
    );
  }
  
  const handleExportJson = () => {
    if (!selectedLog || !analysis) return;

    const reportData = {
      logDetails: selectedLog,
      threatAnalysis: analysis,
      reportGeneratedAt: new Date().toISOString(),
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(reportData, null, 2)
    )}`;
    
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `threat-report-${selectedLog.id}.json`;

    link.click();
  };

  const handleExportCsv = () => {
    if (!selectedLog || !analysis) return;

    const reportData = [
      { header: 'Log ID', value: selectedLog.id },
      { header: 'Timestamp', value: selectedLog.timestamp },
      { header: 'Source IP', value: selectedLog.sourceIp },
      { header: 'Destination IP', value: selectedLog.destinationIp },
      { header: 'Destination Port', value: selectedLog.destinationPort },
      { header: 'Protocol', value: selectedLog.protocol },
      { header: 'Action', value: selectedLog.action },
      { header: 'Log Description', value: selectedLog.description },
      { header: 'Threat Name', value: analysis.threatName },
      { header: 'Baseline Severity', value: analysis.severity },
      { header: 'Contextual Severity', value: analysis.contextualSeverity },
      { header: 'CVE ID', value: analysis.cveId },
      { header: 'Threat Actor', value: analysis.threatActorDNA.name },
      { header: 'Actor TTPs', value: analysis.threatActorDNA.ttps },
      { header: 'Actor Tools', value: analysis.threatActorDNA.commonTools },
      { header: 'Actor Motivation', value: analysis.threatActorDNA.motivation },
      { header: 'Predictive Analysis', value: analysis.predictiveAnalysis },
      { header: 'Cross-Domain Correlation', value: analysis.crossDomainCorrelation },
      { header: 'Summary', value: analysis.summary },
      { header: 'Mitigation', value: analysis.mitigation },
      { header: 'Firewall Action Analysis', value: analysis.firewallActionAnalysis },
      { header: 'Compliance Impact', value: analysis.complianceImpact },
    ];

    const escapeCsvValue = (value: any) => {
        const stringValue = String(value ?? '');
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    };

    const headers = reportData.map(d => d.header).join(',');
    const values = reportData.map(d => escapeCsvValue(d.value)).join(',');
    const csvContent = `${headers}\n${values}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `threat-report-${selectedLog.id}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white/30 dark:bg-slate-800/30 p-6 rounded-lg shadow-lg h-full flex flex-col">
      <div className="flex-grow overflow-y-auto pr-2">
        <div className="flex justify-between items-start mb-4">
            <div>
                 <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{analysis ? analysis.threatName : 'Threat Details'}</h2>
                 <p className="font-mono text-sm text-slate-500 dark:text-slate-400">{selectedLog.sourceIp} &rarr; {selectedLog.destinationIp}:{selectedLog.destinationPort}</p>
            </div>
            <div className="flex items-center gap-2">
                {analysis && <SeverityBadge analysis={analysis} />}
                {analysis && (
                    <>
                        <button 
                            onClick={handleExportJson}
                            title="Export JSON Report"
                            className="p-2 rounded-md bg-slate-300/50 dark:bg-slate-700/50 hover:bg-slate-400/70 dark:hover:bg-slate-600/70 text-cyan-600 dark:text-cyan-400 transition-colors duration-200">
                            <DocumentArrowDownIcon className="h-5 w-5" />
                        </button>
                        <button 
                            onClick={handleExportCsv}
                            title="Export CSV Report"
                            className="p-2 rounded-md bg-slate-300/50 dark:bg-slate-700/50 hover:bg-slate-400/70 dark:hover:bg-slate-600/70 text-cyan-600 dark:text-cyan-400 transition-colors duration-200">
                            <TableCellsIcon className="h-5 w-5" />
                        </button>
                    </>
                )}
            </div>
        </div>
        
        {isLoading && (
             <div className="flex flex-col items-center justify-center h-full">
                <CpuChipIcon className="h-12 w-12 text-cyan-500 dark:text-cyan-400 animate-pulse mb-4" />
                <p className="text-lg text-slate-700 dark:text-slate-300 font-semibold">Gemini is analyzing the threat...</p>
                <p className="text-slate-500 dark:text-slate-400">This may take a moment.</p>
            </div>
        )}

        {error && (
            <div className="bg-red-500/10 text-red-700 dark:text-red-300 p-4 rounded-md text-center">
                <p className="font-bold">Analysis Failed</p>
                <p>{error}</p>
            </div>
        )}

        {analysis && !isLoading && (
            <div>
                <AnalysisSection title="Threat Summary">
                    <p>{analysis.summary}</p>
                </AnalysisSection>
                 <AnalysisSection title="Threat Actor DNA">
                    <div className="space-y-2">
                        <p><strong className="text-slate-600 dark:text-slate-100">Actor:</strong> {analysis.threatActorDNA.name}</p>
                        <p><strong className="text-slate-600 dark:text-slate-100">Motivation:</strong> {analysis.threatActorDNA.motivation}</p>
                        <p><strong className="text-slate-600 dark:text-slate-100">Common Tools:</strong> {analysis.threatActorDNA.commonTools}</p>
                        <p><strong className="text-slate-600 dark:text-slate-100">TTPs:</strong> {analysis.threatActorDNA.ttps}</p>
                    </div>
                </AnalysisSection>
                 <AnalysisSection title="Predictive Analysis (Attacker's Next Steps)">
                    <p>{analysis.predictiveAnalysis}</p>
                </AnalysisSection>
                 <AnalysisSection title="Cross-Domain Correlation">
                    <p>{analysis.crossDomainCorrelation}</p>
                </AnalysisSection>
                <AnalysisSection title="CVE Information">
                    <p className="font-mono">{analysis.cveId}</p>
                </AnalysisSection>
                <AnalysisSection title="Compliance & Data Protection Impact">
                    <p>{analysis.complianceImpact}</p>
                </AnalysisSection>
                <AnalysisSection title="Firewall Response">
                    <p>{analysis.firewallActionAnalysis}</p>
                </AnalysisSection>
                <AnalysisSection title="Recommended Mitigation">
                    <p>{analysis.mitigation}</p>
                </AnalysisSection>
            </div>
        )}

        {!analysis && !isLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-slate-500 dark:text-slate-400 mb-4">Click below to begin the AI-powered threat analysis.</p>
                <button
                    onClick={onAnalyze}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                >
                    <CpuChipIcon className="h-5 w-5" />
                    Analyze with Gemini
                </button>
            </div>
        )}

      </div>
    </div>
  );
};

export default ThreatAnalysisDisplay;