import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    message: '',
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message || 'An unexpected rendering error occurred.',
    };
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught application error:', error, info);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#07090D] text-slate-900 dark:text-slate-100 p-6">
          <div className="max-w-lg w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] rounded-2xl p-8 space-y-4">
            <h1 className="text-xl font-display font-semibold">Application Recovery</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Something interrupted the interface. You can reload to restore a clean session.
            </p>
            <pre className="text-xs font-mono p-3 rounded-lg bg-slate-100 dark:bg-slate-900 overflow-auto max-h-40 text-slate-700 dark:text-slate-300">
              {this.state.message}
            </pre>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
