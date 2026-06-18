import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100%', padding: '40px',
          gap: '16px'
        }}>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>
            Something went wrong
          </h2>
          <p style={{ color: 'var(--text-muted)', textAlign: 'center',
                      maxWidth: '400px', margin: 0 }}>
            {this.props.context || 'An unexpected error occurred'}.
            Your progress has been saved.
          </p>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={this.reset} style={{
              background: 'var(--accent-green)', color: '#000',
              border: 'none', borderRadius: '6px',
              padding: '8px 20px', cursor: 'pointer', fontWeight: 'bold'
            }}>
              Try Again
            </button>
            <button onClick={() => window.location.href = '/'}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-muted)', borderRadius: '6px',
                padding: '8px 20px', cursor: 'pointer'
              }}>
              Go Home
            </button>
          </div>
          {process.env.NODE_ENV === 'development' && (
            <details style={{ color: 'var(--accent-red)', fontSize: '12px',
                             maxWidth: '600px', whiteSpace: 'pre-wrap' }}>
              <summary style={{ cursor: 'pointer' }}>Error details</summary>
              {this.state.error?.toString()}
              {this.state.errorInfo?.componentStack}
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
