import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ActivityIcon, RefreshIcon, HomeIcon } from './Icons';

interface Props {
  children: ReactNode;
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
    console.error('[DokitaAI Uncaught Error]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900">
          <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-slate-300 shadow-xl text-center space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center mx-auto shadow-xs">
              <ActivityIcon className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Application Recovered</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                DokitaAI encountered an unexpected display issue. Your session data is safe.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-95"
              >
                <RefreshIcon className="w-3.5 h-3.5" />
                <span>Reload App</span>
              </button>

              <button
                onClick={this.handleReset}
                className="w-full sm:w-1/2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer active:scale-95"
              >
                <HomeIcon className="w-3.5 h-3.5" />
                <span>Go to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
