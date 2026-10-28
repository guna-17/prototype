import React from 'react';
import { useERP } from '../../context/ERPContext';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

export const NotificationToast: React.FC = () => {
  const { notifications, dismissNotification } = useERP();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none">
      {notifications.map((n) => {
        let borderClass = 'border-slate-200';
        let bgClass = 'bg-white';
        let icon = <Info className="w-5 h-5 text-blue-600 shrink-0" />;

        if (n.type === 'success') {
          borderClass = 'border-emerald-200';
          bgClass = 'bg-emerald-50/90';
          icon = <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
        } else if (n.type === 'error') {
          borderClass = 'border-rose-200';
          bgClass = 'bg-rose-50/90';
          icon = <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />;
        } else if (n.type === 'warning') {
          borderClass = 'border-amber-200';
          bgClass = 'bg-amber-50/90';
          icon = <TriangleAlert className="w-5 h-5 text-amber-600 shrink-0" />;
        }

        return (
          <div
            key={n.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border backdrop-blur-md flex items-start gap-3 transition-all transform animate-in fade-in slide-in-from-bottom-2 duration-200 ${bgClass} ${borderClass}`}
          >
            {icon}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-slate-900">{n.title}</h4>
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
            </div>
            <button
              onClick={() => dismissNotification(n.id)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
