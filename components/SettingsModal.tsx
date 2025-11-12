import React, { useState } from 'react';
import { OrganizationalContext } from '../types';
import { COUNTRIES, INDUSTRIES } from '../constants';
import { XCircleIcon } from './icons';

interface SettingsModalProps {
  onClose: () => void;
  currentContext: OrganizationalContext | null;
  onSave: (context: OrganizationalContext | null) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, currentContext, onSave }) => {
  const [industry, setIndustry] = useState(currentContext?.industry || '');
  const [country, setCountry] = useState(currentContext?.country || '');

  const handleSave = () => {
    if (industry && country) {
      onSave({ industry, country });
    } else {
      onSave(null);
    }
    onClose();
  };

  const handleClear = () => {
      setIndustry('');
      setCountry('');
      onSave(null);
      onClose();
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex justify-center items-center"
      onClick={onClose}
    >
      <div 
        className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-2xl p-6 w-full max-w-md m-4 relative animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
            <XCircleIcon className="h-7 w-7" />
        </button>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Organizational Context</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">Provide this context to enable adaptive severity scoring and more relevant compliance analysis.</p>
        
        <div className="space-y-4">
            <div>
                <label htmlFor="industry" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Industry Sector
                </label>
                <select 
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full p-2 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                >
                    <option value="">Select an industry...</option>
                    {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="country" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Primary Country of Operation
                </label>
                <select 
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full p-2 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                >
                    <option value="">Select a country...</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
        </div>
        
        <div className="mt-8 flex justify-end gap-3">
             <button
                onClick={handleClear}
                className="px-4 py-2 rounded-md text-sm font-semibold bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 transition-colors"
            >
                Clear and Close
            </button>
            <button
                onClick={handleSave}
                className="px-6 py-2 rounded-md text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
            >
                Save
            </button>
        </div>
         <style>{`
            @keyframes fade-in-up {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
            }
            .animate-fade-in-up {
            animation: fade-in-up 0.3s ease-out forwards;
            }
      `}</style>
      </div>
    </div>
  );
};

export default SettingsModal;