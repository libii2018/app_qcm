import { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Toast as ToastComponent, ToastProps, ToastContainerProps } from './Toast';
import { cn } from '../../utils/cn';

// Simple toast container that renders toasts
interface ToastItem {
  id: string;
  type: ToastProps['type'];
  message: string;
  title?: string;
}

export function ToastContainer({ 
  position = 'top-right', 
  children 
}: ToastContainerProps) {
  const positions = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div className={cn('fixed z-50 flex flex-col gap-3', positions[position])}>
      {children}
    </div>
  );
}

// Global toast manager
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ShowToastOptions {
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

class ToastManager {
  private static toasts: ToastItem[] = [];
  private static listeners: ((toasts: ToastItem[]) => void)[] = [];

  static addToast(options: ShowToastOptions) {
    const id = crypto.randomUUID();
    const toast: ToastItem = {
      id,
      type: options.type,
      message: options.message,
      title: options.title
    };
    this.toasts.push(toast);
    this.notifyListeners();
    
    // Auto-remove after duration
    const duration = options.duration || 5000;
    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t.id !== id);
      this.notifyListeners();
    }, duration);
  }

  static removeToast(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notifyListeners();
  }

  static getToasts() {
    return [...this.toasts];
  }

  static subscribe(listener: (toasts: ToastItem[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private static notifyListeners() {
    this.listeners.forEach(listener => listener(this.toasts));
  }
}

// Hook for using toasts
export function useToast() {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  React.useEffect(() => {
    const unsubscribe = ToastManager.subscribe(setToasts);
    return unsubscribe;
  }, []);

  const showToast = React.useCallback((options: ShowToastOptions) => {
    ToastManager.addToast(options);
  }, []);

  return { toasts, showToast };
}

// Functional toast component for easier use
export function showToast(options: ShowToastOptions) {
  ToastManager.addToast(options);
}
