import { toast } from 'sonner';

export interface NotifyAction {
  label: string;
  onClick: () => void;
}

export interface NotifyOptions {
  description?: string;
  action?: NotifyAction;
  duration?: number;
  id?: string | number;
}

// Fallback timer to guarantee dismissal even if hover/touch prevents native sonner auto-dismiss
const scheduleAutoDismiss = (id: string | number, duration: number) => {
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      toast.dismiss(id);
    }, duration);
  }
};

export const notify = {
  success: (message: string, options?: NotifyOptions) => {
    const duration = options?.duration ?? 4000;
    const id = toast.success(message, {
      description: options?.description,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: () => {
              toast.dismiss(id);
              options.action?.onClick();
            },
          }
        : undefined,
      duration,
      id: options?.id,
    });
    scheduleAutoDismiss(id, duration);
    return id;
  },

  error: (message: string, options?: NotifyOptions) => {
    const duration = options?.duration ?? 5000;
    const id = toast.error(message, {
      description: options?.description,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: () => {
              toast.dismiss(id);
              options.action?.onClick();
            },
          }
        : undefined,
      duration,
      id: options?.id,
    });
    scheduleAutoDismiss(id, duration);
    return id;
  },

  info: (message: string, options?: NotifyOptions) => {
    const duration = options?.duration ?? 4000;
    const id = toast.info(message, {
      description: options?.description,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: () => {
              toast.dismiss(id);
              options.action?.onClick();
            },
          }
        : undefined,
      duration,
      id: options?.id,
    });
    scheduleAutoDismiss(id, duration);
    return id;
  },

  promise: <T>(
    promise: Promise<T>,
    data: {
      loading: string;
      success: string | ((result: T) => string);
      error: string | ((err: any) => string);
    }
  ) => {
    return toast.promise(promise, data);
  },

  dismiss: (id?: string | number) => {
    toast.dismiss(id);
  },
};
