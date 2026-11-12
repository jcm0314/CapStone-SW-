import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { TenantProvider } from './contexts/TenantContext';
import { AuthProvider } from './contexts/AuthContext';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-canvas flex items-center justify-center p-6 text-fg font-sans">
          <div className="max-w-md w-full bg-surface rounded-2xl p-6 border border-line shadow-card text-center space-y-4">
            <h2 className="text-lg font-bold text-bad">화면을 불러오지 못했습니다</h2>
            <p className="text-xs text-fg-muted">
              {this.state.error?.message || "컴포넌트 렌더링 중 오류가 발생했습니다."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-brand hover:bg-brand-strong text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              페이지 새로고침
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <TenantProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </TenantProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
