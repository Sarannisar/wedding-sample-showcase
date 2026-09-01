import { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertCircle, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  showHomeButton?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6 bg-theme-bg/60">
          <div className="max-w-md w-full p-8 text-center rounded-2xl bg-white/90 backdrop-blur-md border border-theme-border shadow-card-3d relative overflow-hidden">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-theme-secondary-light flex items-center justify-center text-theme-primary-dark">
              <AlertCircle className="w-7 h-7" />
            </div>

            <h2 className="font-display text-2xl text-theme-text font-medium mb-2">
              {this.props.fallbackTitle || 'Something went wrong'}
            </h2>

            <p className="font-body text-sm text-theme-muted mb-6">
              {this.props.fallbackMessage ||
                'An unexpected error occurred while loading this page. Please try refreshing or returning home.'}
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-theme-primary text-white hover:bg-theme-primary-dark transition shadow-sm text-sm font-label uppercase tracking-wider cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>

              {this.props.showHomeButton && (
                <a
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-theme-secondary-light text-theme-text hover:bg-theme-secondary transition border border-theme-border text-sm font-label uppercase tracking-wider cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  Dashboard
                </a>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
