import { Component } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

// Error boundaries must be class components — React has no hook equivalent
// for getDerivedStateFromError/componentDidCatch (still true as of React 18).
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info?.componentStack)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback(this.state.error, this.handleRetry)
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="card p-8 max-w-md w-full text-center">
            <div className="w-14 h-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28}/>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-1.5">Something went wrong</h2>
            <p className="text-sm text-slate-500 mb-6">
              This part of the app hit an unexpected error. You can try again, or head back to the dashboard.
            </p>
            {this.state.error?.message && (
              <p className="text-xs text-slate-400 font-mono bg-slate-50 rounded-lg px-3 py-2 mb-6 break-words">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button onClick={this.handleRetry} className="btn-secondary text-sm">
                <RefreshCw size={14}/> Try again
              </button>
              <a href="/" className="btn-primary text-sm">
                <Home size={14}/> Dashboard
              </a>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
