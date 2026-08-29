import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('KiraPuasaKu Uncaught Runtime Error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.removeItem('qadatrack_auth_token_v1');
    } catch (e) {
      console.warn(e);
    }
    window.location.href = '/';
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 p-6 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
          <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-6 shadow-xl text-center dark:border-stone-800 dark:bg-stone-900">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400 mb-4">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <h2 className="text-base font-bold text-stone-900 dark:text-white">
              Memulihkan Sesi Aplikasi
            </h2>
            <p className="mt-2 text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              Terdapat sedikit ralat pemuatan sesi sementara. Sila tekan butang di bawah untuk memuat semula sistem.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white py-2.5 px-4 text-xs font-bold shadow-2xs transition cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Muat Semula</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetCache}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-700 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 py-2.5 px-4 text-xs font-bold transition cursor-pointer"
              >
                <Home className="h-3.5 w-3.5" />
                <span>Halaman Utama</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
