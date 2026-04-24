export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

export interface ConfirmItem {
  id: number;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  resolve: (value: boolean) => void;
}

type Listener = (item: ToastItem) => void;
type ConfirmListener = (item: ConfirmItem) => void;

let listeners: Listener[] = [];
let confirmListeners: ConfirmListener[] = [];
let _nextId = 1;

function emit(message: string, type: ToastType) {
  const item: ToastItem = { id: _nextId++, message, type };
  listeners.forEach(l => l(item));
}

export const toast = {
  success: (message: string) => emit(message, 'success'),
  error:   (message: string) => emit(message, 'error'),
  info:    (message: string) => emit(message, 'info'),
  warning: (message: string) => emit(message, 'warning'),
  confirm(message: string, confirmLabel = 'Xác nhận', cancelLabel = 'Hủy'): Promise<boolean> {
    return new Promise(resolve => {
      const item: ConfirmItem = { id: _nextId++, message, confirmLabel, cancelLabel, resolve };
      confirmListeners.forEach(l => l(item));
    });
  },
  subscribe(listener: Listener): () => void {
    listeners.push(listener);
    return () => { listeners = listeners.filter(l => l !== listener); };
  },
  subscribeConfirm(listener: ConfirmListener): () => void {
    confirmListeners.push(listener);
    return () => { confirmListeners = confirmListeners.filter(l => l !== listener); };
  },
};
