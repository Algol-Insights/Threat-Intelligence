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
        className="bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md m-4 relative animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black dark:hover:text-white transition-colors">
            <XCircleIcon className="h-7 w-7" />
        </button>
        <h2 className="text-2xl font-bold text-black dark:text-white mb-2">Organizational Context</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">Provide this context to enable adaptive severity scoring and more relevant compliance analysis.</p>
        
        <div className="space-y-4">
            <div>
                <label htmlFor="industry" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Industry Sector
                </label>
                <select 
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full p-2 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="">Select an industry...</option>
                    {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Primary Country of Operation
                </label>
                <select 
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full p-2 rounded-md bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="">Select a country...</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
        </div>
        
        <div className="mt-8 flex justify-end gap-3">
             <button
                onClick={handleClear}
                className="px-4 py-2 rounded-md text-sm font-semibold bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-black dark:text-white transition-colors"
            >
                Clear and Close
            </button>
            <button
                onClick={handleSave}
                className="px-6 py-2 rounded-md text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-colors"
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
