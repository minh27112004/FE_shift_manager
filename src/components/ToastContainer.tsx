import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast, ToastItem, ConfirmItem } from '../lib/toast';

const ICONS = {
  success: CheckCircle2,
  error:   AlertCircle,
  warning: AlertTriangle,
  info:    Info,
};

const STYLES = {
  success: 'bg-white border-green-200 shadow-green-100',
  error:   'bg-white border-red-200 shadow-red-100',
  warning: 'bg-white border-amber-200 shadow-amber-100',
  info:    'bg-white border-blue-200 shadow-blue-100',
};

const ICON_STYLES = {
  success: 'text-green-500 bg-green-50',
  error:   'text-red-500 bg-red-50',
  warning: 'text-amber-500 bg-amber-50',
  info:    'text-blue-500 bg-blue-50',
};

const DURATION = 4500;

export default function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);
  const [confirms, setConfirms] = useState<ConfirmItem[]>([]);

  useEffect(() => {
    const unsubToast = toast.subscribe(item => {
      setItems(prev => [...prev, item]);
      setTimeout(() => setItems(prev => prev.filter(t => t.id !== item.id)), DURATION);
    });
    const unsubConfirm = toast.subscribeConfirm(item => {
      setConfirms(prev => [...prev, item]);
    });
    return () => { unsubToast(); unsubConfirm(); };
  }, []);

  const dismiss = (id: number) => setItems(prev => prev.filter(t => t.id !== id));

  const handleConfirm = (item: ConfirmItem, value: boolean) => {
    item.resolve(value);
    setConfirms(prev => prev.filter(c => c.id !== item.id));
  };

  return (
    <>
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none w-full max-w-sm">
        <AnimatePresence>
          {items.map(item => {
            const Icon = ICONS[item.type];
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: 60, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 60, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={cn(
                  'pointer-events-auto flex items-start gap-3 px-4 py-3.5 rounded-2xl border shadow-xl',
                  STYLES[item.type]
                )}
              >
                <div className={cn('h-8 w-8 rounded-xl flex items-center justify-center shrink-0', ICON_STYLES[item.type])}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="flex-1 text-sm font-medium text-slate-800 leading-relaxed pt-1">
                  {item.message}
                </p>
                <button
                  onClick={() => dismiss(item.id)}
                  className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors mt-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Confirm dialogs */}
      <AnimatePresence>
        {confirms.map(item => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            >
              <div className="flex items-start gap-3 mb-5">
                <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <p className="text-sm font-medium text-slate-700 leading-relaxed pt-1">{item.message}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => handleConfirm(item, false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {item.cancelLabel}
                </button>
                <button
                  onClick={() => handleConfirm(item, true)}
                  className="flex-1 py-2.5 rounded-xl bg-[#005ac2] text-white text-sm font-black hover:bg-[#004fab] transition-colors"
                >
                  {item.confirmLabel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ))}
      </AnimatePresence>
    </>
  );
}
