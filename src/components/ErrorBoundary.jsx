import React from 'react';

function isChunkError(error) {
  if (!error) return false;
  return (
    error.name === 'ChunkLoadError' ||
    error.message?.includes('Failed to fetch dynamically imported module') ||
    error.message?.includes('Importing a module script failed') ||
    error.message?.includes('error loading dynamically imported module') ||
    error.message?.includes('Unable to preload CSS for') ||
    (error.request && typeof error.request === 'string')
  );
}

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, reloading: false };
  }

  static getDerivedStateFromError(error) {
    if (isChunkError(error)) {
      // Stale JS chunks after a Vercel deployment — reload to pick up new URLs.
      return { hasError: true, reloading: true };
    }
    return { hasError: true, reloading: false };
  }

  componentDidCatch(error, info) {
    if (isChunkError(error)) {
      window.location.reload();
    } else {
      console.error('[ErrorBoundary]', error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.state.reloading) {
        // Briefly shown before the window.location.reload() fires
        return (
          <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        );
      }
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="text-center max-w-sm">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-5">An unexpected error occurred. Refreshing usually fixes it.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
