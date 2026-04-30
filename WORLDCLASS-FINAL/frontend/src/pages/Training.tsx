import { useState } from 'react';
import { GraduationCap, ChevronRight, CheckCircle2, RotateCcw, Brain } from 'lucide-react';
import { TRAINING_SCENARIOS } from '../constants';

// YOUR ORIGINAL COMPONENT
import TrainingScenario from '../components/TrainingScenario';

export default function Training() {
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [showExpert, setShowExpert] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  const handleSubmit = () => {
    if (!userAnswer.trim()) return;
    const scenario = TRAINING_SCENARIOS[selectedScenario!];
    const expertLower = scenario.expertAnalysis.toLowerCase();
    const keywords = ['dns', 'tunneling', 'exfiltration', 'c2', 'command', 'control', 'cdpa', 'breach', 'notification', 'potraz', 'isolate', 'forensic', 'lateral', 'ransomware', 'brute', 'block', 'firewall', 'section 15', 'section 34', 'cert.zw', 'rbz'];
    const userLower = userAnswer.toLowerCase();
    const matched = keywords.filter(k => userLower.includes(k) && expertLower.includes(k));
    const relevantKeywords = keywords.filter(k => expertLower.includes(k));
    const pct = relevantKeywords.length > 0 ? Math.round((matched.length / relevantKeywords.length) * 100) : 0;
    setScore(Math.min(pct + 20, 100));
    setShowExpert(true);
  };

  const reset = () => { setSelectedScenario(null); setUserAnswer(''); setShowExpert(false); setScore(null); };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold">SOC Analyst Training</h1>
        <p className="text-soc-muted text-sm">Practice threat analysis with guided scenarios</p>
      </div>

      {/* YOUR original TrainingScenario component */}
      <TrainingScenario />

      {/* Extended interactive scenarios */}
      <div className="border-t border-soc-border pt-6">
        <h2 className="text-lg font-bold mb-4">Interactive Scenarios</h2>
        {selectedScenario === null ? (
          <div className="space-y-3">
            <p className="text-sm text-soc-muted">Select a scenario, write your analysis, then compare with the expert.</p>
            {TRAINING_SCENARIOS.map((scenario, idx) => (
              <div key={idx} onClick={() => setSelectedScenario(idx)} className="card cursor-pointer hover:border-brand-500/30 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-brand-600/20 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5 text-brand-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{scenario.title}</p>
                    <p className="text-xs text-soc-muted mt-1 line-clamp-2">{scenario.description.slice(0, 120)}...</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-soc-muted shrink-0" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="card border-brand-500/20">
              <h3 className="font-bold text-sm mb-3">{TRAINING_SCENARIOS[selectedScenario].title}</h3>
              <p className="text-sm leading-relaxed">{TRAINING_SCENARIOS[selectedScenario].description}</p>
            </div>
            {!showExpert && (
              <div className="card">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Brain className="w-4 h-4 text-brand-400" /> Your Analysis</h3>
                <textarea value={userAnswer} onChange={e => setUserAnswer(e.target.value)} className="input text-sm h-40 resize-none" placeholder="Write your analysis..." />
                <div className="flex gap-3 mt-4">
                  <button onClick={reset} className="btn-secondary text-xs"><RotateCcw className="w-3.5 h-3.5" /> Back</button>
                  <button onClick={handleSubmit} disabled={!userAnswer.trim()} className="btn-primary text-xs flex-1 justify-center">Submit</button>
                </div>
              </div>
            )}
            {showExpert && (
              <>
                <div className={`card ring-2 text-center py-6 ${score! >= 70 ? 'ring-green-500/30' : score! >= 40 ? 'ring-yellow-500/30' : 'ring-red-500/30'}`}>
                  <p className={`text-5xl font-bold ${score! >= 70 ? 'text-green-400' : score! >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{score}%</p>
                  <p className="text-sm text-soc-muted mt-2">{score! >= 70 ? 'Excellent' : score! >= 40 ? 'Good — review expert analysis' : 'Study the expert analysis'}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="card"><h3 className="font-semibold text-sm mb-3 text-brand-400">Your Analysis</h3><p className="text-xs leading-relaxed whitespace-pre-wrap">{userAnswer}</p></div>
                  <div className="card border-emerald-500/20"><h3 className="font-semibold text-sm mb-3 text-emerald-400">Expert Analysis</h3><p className="text-xs leading-relaxed">{TRAINING_SCENARIOS[selectedScenario].expertAnalysis}</p></div>
                </div>
                <button onClick={reset} className="btn-secondary text-xs"><RotateCcw className="w-3.5 h-3.5" /> Try Another</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
