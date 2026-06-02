import type { AppProps } from 'next/app';
import { Provider } from 'react-redux';
import { store, useAppDispatch } from '@/store';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/context/ThemeContext';
import '@/styles/globals.css';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import FloatingFeedbackButton from '@/components/feedback/FloatingFeedbackButton';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-primary p-6">
          <div className="bg-secondary border border-subtle rounded-lg p-8 max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-primary mb-2">Something went wrong</h1>
            <p className="text-muted mb-6 pb-6 border-b border-subtle">
              An unexpected error occurred. Please refresh the page or try again later.
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="btn-primary w-full"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import { useEffect } from 'react';
import { setupMultiTabLogout } from '@/services/logoutService';
import { logout } from '@/store/authSlice';

// A tiny invisible component inside the Redux Provider to setup multi-tab logout sync
function MultiTabSync() {
  const dispatch = useAppDispatch();
  useEffect(() => {
    return setupMultiTabLogout(() => {
      dispatch(logout());
    });
  }, [dispatch]);
  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ThemeProvider>
          <MultiTabSync />
          <Component {...pageProps} />
          <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-subtle)',
              padding: '16px 24px',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            },
            duration: 3500,
          }}
        />
        <FloatingFeedbackButton />
        </ThemeProvider>
      </Provider>
    </ErrorBoundary>
  );
}
