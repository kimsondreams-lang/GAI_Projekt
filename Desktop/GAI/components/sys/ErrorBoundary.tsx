import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';
import { db } from '../../services/memoryService';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Fix: Explicitly extending Component from react to ensure this.state and this.props are correctly typed and available.
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    try {
        const stack = String(errorInfo?.componentStack || '').trim();
        const msg = stack ? `KERNEL PANIC: ${error.message}\n${stack}` : `KERNEL PANIC: ${error.message}`;
        db.logSystem('panic', msg);
    } catch (e) {
        // Ignore logging errors during panic
    }
  }

  private handleRecovery = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleFullReset = () => {
    window.location.reload();
  };

  public render() {
    // Access state properties from this.state
    if (this.state.hasError) {
      return (
        <div className="w-full h-full bg-red-900 text-white font-mono flex flex-col items-center justify-center p-6 select-none">
            <div className="max-w-2xl">
                <div className="flex items-center gap-4 mb-6">
                    <AlertTriangle size={48} className="text-yellow-300" />
                    <div className="text-4xl">:(</div>
                </div>
                <h1 className="text-2xl mb-4">Component Error Detected</h1>
                <p className="mb-6 text-red-200">
                    This component encountered an error and has been safely isolated.
                </p>
                
                <div className="bg-red-800 p-4 rounded mb-6 font-bold text-yellow-300 border border-red-600">
                    ERROR DETAILS
                    <div className="mt-2 text-white font-normal opacity-70 text-sm">
                        {this.state.error?.message || 'Unknown error'}
                    </div>
                </div>

                <div className="flex gap-4">
                    <button 
                        onClick={this.handleRecovery}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition-colors"
                    >
                        <RefreshCcw size={16} /> Try Recovery
                    </button>
                    <button 
                        onClick={this.handleFullReset}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-bold rounded hover:bg-red-700 transition-colors"
                    >
                        <AlertTriangle size={16} /> Full Reset
                    </button>
                </div>
            </div>
        </div>
      );
    }

    // Access children from this.props
    return this.props.children;
  }
}
