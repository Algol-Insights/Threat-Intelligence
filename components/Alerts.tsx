import React from 'react';
import { Alert } from '../types';
import { BellIcon, XCircleIcon } from './icons';

interface AlertsProps {
  alerts: Alert[];
  onDismiss: (alertId: string) => void;
  onAlertClick: (logId: string) => void;
}

const Alerts: React.FC<AlertsProps> = ({ alerts, onDismiss, onAlertClick }) => {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 w-full max-w-sm z-50 space-y-3">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className="bg-red-900/90 backdrop-blur-md border border-red-700 text-white rounded-lg shadow-2xl p-4 flex items-start gap-3 animate-fade-in-right"
        >
          <BellIcon className="h-6 w-6 text-red-300 mt-0.5 flex-shrink-0" />
          <div className="flex-grow">
            <p className="font-bold text-red-200">Automated Alert</p>
            <p 
                className="text-sm text-red-200/90 cursor-pointer hover:underline"
                onClick={() => onAlertClick(alert.logId)}
                title="Click to view related log"
            >
                {alert.message}
            </p>
          </div>
          <button
            onClick={() => onDismiss(alert.id)}
            className="text-red-300 hover:text-white transition-colors flex-shrink-0"
            title="Dismiss Alert"
          >
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>
      ))}
      <style>{`
        @keyframes fade-in-right {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-fade-in-right {
          animation: fade-in-right 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Alerts;
