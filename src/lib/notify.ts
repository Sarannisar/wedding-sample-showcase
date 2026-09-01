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

export const notify = {
  success: (message: string, options?: NotifyOptions) => {
    return toast.success(message, {
      description: options?.description,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
      duration: options?.duration ?? 4000,
      id: options?.id,
    });
  },

  error: (message: string, options?: NotifyOptions) => {
    return toast.error(message, {
      description: options?.description,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
      duration: options?.duration ?? 5000,
      id: options?.id,
    });
  },

  info: (message: string, options?: NotifyOptions) => {
    return toast.info(message, {
      description: options?.description,
      action: options?.action
        ? {
            label: options.action.label,
            onClick: options.action.onClick,
          }
        : undefined,
      duration: options?.duration ?? 4000,
      id: options?.id,
    });
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
