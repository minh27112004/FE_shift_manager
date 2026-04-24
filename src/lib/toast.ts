export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

type Listener = (item: ToastItem) => void;

let listeners: Listener[] = [];
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
  subscribe(listener: Listener): () => void {
    listeners.push(listener);
    return () => { listeners = listeners.filter(l => l !== listener); };
  },
};
