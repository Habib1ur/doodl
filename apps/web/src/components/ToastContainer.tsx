'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { useGameStore } from '@/stores/useGameStore';

export function ToastContainer() {
  const { toasts, removeToast } = useGameStore();

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
    >
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="pointer-events-auto flex items-center gap-3 rounded-card border border-surface-border bg-surface-card px-4 py-3 shadow-elevated text-sm font-medium text-ink-main"
          >
            {toast.type === 'success' && (
              <CheckCircle2 className="w-5 h-5 text-semantic-success shrink-0" />
            )}
            {toast.type === 'error' && (
              <AlertCircle className="w-5 h-5 text-semantic-danger shrink-0" />
            )}
            {toast.type === 'info' && (
              <Info className="w-5 h-5 text-semantic-info shrink-0" />
            )}
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
              className="p-1 text-ink-muted hover:text-ink-main rounded-control"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
