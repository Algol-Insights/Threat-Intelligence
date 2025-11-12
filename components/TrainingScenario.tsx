import React, { useState } from 'react';
import { TRAINING_SCENARIO } from '../constants';
import { AcademicCapIcon } from './icons';

const TrainingScenario: React.FC = () => {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div className="bg-white/30 dark:bg-slate-800/30 p-4 rounded-lg shadow-lg backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-4">
        <AcademicCapIcon className="h-6 w-6 text-cyan-500 dark:text-cyan-400" />
        <h2 className="text-lg font-semibold text-cyan-500 dark:text-cyan-400">Analyst Training Scenario</h2>
      </div>
      <div className="space-y-3 text-sm">
        <h3 className="font-bold text-slate-800 dark:text-slate-200">{TRAINING_SCENARIO.title}</h3>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{TRAINING_SCENARIO.description}</p>
        
        {!isRevealed && (
            <button
                onClick={() => setIsRevealed(true)}
                className="w-full mt-2 px-4 py-2 rounded-md text-sm font-semibold bg-cyan-600/20 dark:bg-cyan-500/20 hover:bg-cyan-600/40 dark:hover:bg-cyan-500/40 text-cyan-700 dark:text-cyan-300 transition-colors"
            >
                Reveal Expert Analysis
            </button>
        )}

        {isRevealed && (
            <div className="mt-3 pt-3 border-t border-slate-300 dark:border-slate-700 animate-fade-in">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-1">Expert Analysis:</h4>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{TRAINING_SCENARIO.expertAnalysis}</p>
                <button
                    onClick={() => setIsRevealed(false)}
                    className="w-full mt-3 px-4 py-2 rounded-md text-sm font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600"
                >
                    Hide Analysis
                </button>
            </div>
        )}
      </div>
       <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default TrainingScenario;