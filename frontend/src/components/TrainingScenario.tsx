import React, { useState } from 'react';
import { TRAINING_SCENARIO } from '../constants';
import { AcademicCapIcon } from './icons';

const TrainingScenario: React.FC = () => {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div className="bg-white dark:bg-black p-4 rounded-lg border border-gray-200 dark:border-gray-800">
      <div className="flex items-center gap-2 mb-4">
        <AcademicCapIcon className="h-6 w-6 text-blue-500" />
        <h2 className="text-lg font-semibold text-blue-600 dark:text-blue-400">Analyst Training Scenario</h2>
      </div>
      <div className="space-y-3 text-sm">
        <h3 className="font-bold text-black dark:text-white">{TRAINING_SCENARIO.title}</h3>
        <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{TRAINING_SCENARIO.description}</p>
        
        {!isRevealed && (
            <button
                onClick={() => setIsRevealed(true)}
                className="w-full mt-2 px-4 py-2 rounded-md text-sm font-semibold bg-blue-500/10 dark:bg-blue-500/20 hover:bg-blue-500/20 dark:hover:bg-blue-500/30 text-blue-700 dark:text-blue-300 transition-colors"
            >
                Reveal Expert Analysis
            </button>
        )}

        {isRevealed && (
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 animate-fade-in">
                <h4 className="font-bold text-black dark:text-white mb-1">Expert Analysis:</h4>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">{TRAINING_SCENARIO.expertAnalysis}</p>
                <button
                    onClick={() => setIsRevealed(false)}
                    className="w-full mt-3 px-4 py-2 rounded-md text-sm font-semibold bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
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
