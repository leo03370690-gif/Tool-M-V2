import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center p-8">
          <AlertTriangle className="h-12 w-12 text-red-400" />
          <h2 className="text-lg font-bold text-zinc-800">頁面發生錯誤</h2>
          <p className="text-sm text-zinc-500 max-w-md">{this.state.error?.message || '未知錯誤'}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-2 px-4 py-2 text-sm font-bold bg-zinc-900 text-white rounded-xl hover:bg-zinc-700 transition-colors"
          >
            重試
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
