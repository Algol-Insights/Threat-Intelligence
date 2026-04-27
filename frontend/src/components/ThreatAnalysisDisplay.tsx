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
        [Severity.Critical]: 'bg-red-500/10 text-red-500 border-red-500',
        [Severity.High]: 'bg-orange-500/10 text-orange-500 border-orange-500',
        [Severity.Medium]: 'bg-yellow-500/10 text-yellow-500 border-yellow-500',
        [Severity.Low]: 'bg-blue-500/10 text-blue-500 border-blue-500',
        [Severity.Informational]: 'bg-green-500/10 text-green-500 border-green-500',
    }[sev]);
    
    const hasContextualChange = contextualSeverity && contextualSeverity !== severity;

    return (
        <div className="flex flex-col items-end gap-1">
             <span title={hasContextualChange ? `Adaptive Severity (Original: ${severity})` : 'Severity'} className={`px-3 py-1 text-sm font-bold rounded-full border ${getSeverityStyles(contextualSeverity || severity)}`}>
                {contextualSeverity || severity}
            </span>
            {hasContextualChange && (
                 <span className="text-xs text-blue-600 dark:text-blue-400">Context-Adjusted</span>
            )}
        </div>
    );
};

const AnalysisSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-6">
        <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">{title}</h3>
        <div className="text-black dark:text-gray-300 text-base leading-relaxed bg-gray-100 dark:bg-gray-900 p-4 rounded-md">{children}</div>
    </div>
);


const ThreatAnalysisDisplay: React.FC<ThreatAnalysisDisplayProps> = ({ selectedLog, analysis, isLoading, error, onAnalyze }) => {
  if (!selectedLog) {
    return (
      <div className="bg-white dark:bg-black p-6 rounded-lg border border-gray-200 dark:border-gray-800 flex flex-col justify-center items-center h-full text-center">
        <ShieldExclamationIcon className="h-16 w-16 text-gray-400 dark:text-gray-600 mb-4" />
        <h2 className="text-xl font-bold text-black dark:text-white">No Threat Selected</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Please select a log from the feed to view its analysis.</p>
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
      { header: 'Actor TTPs', value: analysis.threatActorDNA.ttps.map(t => `${t.technique} (${t.id})`).join('; ') },
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
    <div className="bg-white dark:bg-black p-6 rounded-lg border border-gray-200 dark:border-gray-800 h-full flex flex-col">
      <div className="flex-grow overflow-y-auto pr-2">
        <div className="flex justify-between items-start mb-4">
            <div>
                 <h2 className="text-2xl font-bold text-black dark:text-white">{analysis ? analysis.threatName : 'Threat Details'}</h2>
                 <p className="font-mono text-sm text-gray-500 dark:text-gray-400">{selectedLog.sourceIp} &rarr; {selectedLog.destinationIp}:{selectedLog.destinationPort}</p>
            </div>
            <div className="flex items-center gap-2">
                {analysis && <SeverityBadge analysis={analysis} />}
                {analysis && (
                    <>
                        <button 
                            onClick={handleExportJson}
                            title="Export JSON Report"
                            className="p-2 rounded-md bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 transition-colors duration-200">
                            <DocumentArrowDownIcon className="h-5 w-5" />
                        </button>
                        <button 
                            onClick={handleExportCsv}
                            title="Export CSV Report"
                            className="p-2 rounded-md bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 transition-colors duration-200">
                            <TableCellsIcon className="h-5 w-5" />
                        </button>
                    </>
                )}
            </div>
        </div>
        
        {isLoading && (
             <div className="flex flex-col items-center justify-center h-full">
                <CpuChipIcon className="h-12 w-12 text-blue-500 animate-pulse mb-4" />
                <p className="text-lg text-black dark:text-white font-semibold">Algol is analyzing the threat...</p>
                <p className="text-gray-500 dark:text-gray-400">This may take a moment.</p>
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
                        <p><strong className="text-black dark:text-white">Actor:</strong> {analysis.threatActorDNA.name}</p>
                        <p><strong className="text-black dark:text-white">Motivation:</strong> {analysis.threatActorDNA.motivation}</p>
                        <p><strong className="text-black dark:text-white">Common Tools:</strong> {analysis.threatActorDNA.commonTools}</p>
                        <div>
                            <strong className="text-black dark:text-white">TTPs (MITRE ATT&amp;CK):</strong>
                            {analysis.threatActorDNA.ttps && analysis.threatActorDNA.ttps.length > 0 ? (
                                <ul className="mt-1 list-disc list-inside space-y-1">
                                    {analysis.threatActorDNA.ttps.map((ttp) => (
                                        <li key={ttp.id}>
                                            {ttp.technique}{' - '}
                                            <a
                                                href={`https://attack.mitre.org/techniques/${ttp.id.replace('.', '/')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-mono text-blue-500 hover:underline"
                                            >
                                                {ttp.id}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="pl-4 italic">None identified.</p>
                            )}
                        </div>
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
                <p className="text-gray-500 dark:text-gray-400 mb-4">Click below to begin the AI-powered threat analysis.</p>
                <button
                    onClick={onAnalyze}
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                >
                    <CpuChipIcon className="h-5 w-5" />
                    Analyze with Algol
                </button>
            </div>
        )}

      </div>
    </div>
  );
};

export default ThreatAnalysisDisplay;