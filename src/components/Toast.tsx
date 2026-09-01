import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 rounded-xl p-3.5 shadow-xl text-xs font-semibold transition-all animate-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-stone-900 text-white border border-stone-850 shadow-stone-950/30 dark:bg-stone-850 dark:border-stone-750'
              : toast.type === 'error'
              ? 'bg-rose-950 text-rose-100 border border-rose-800 shadow-rose-950/30'
              : 'bg-stone-900 text-white border border-stone-800 shadow-stone-950/20'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {toast.type === 'success' && <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Info className="h-4 w-4 text-amber-400 shrink-0" />}
            <span className="leading-snug">{typeof toast.message === 'string' ? toast.message : String(toast.message || '')}</span>
          </div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="rounded-md p-1 opacity-70 hover:opacity-100 transition cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
