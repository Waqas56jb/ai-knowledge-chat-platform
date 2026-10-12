import { Component } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, RotateCw, LayoutDashboard } from 'lucide-react';
import { isChunkError, reloadOnce } from '../../utils/chunkReload';

class Boundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    if (isChunkError(error) && reloadOnce()) return;
    console.error(error, info?.componentStack);
  }
  componentDidUpdate(prev) { if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null }); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="grid min-h-[60vh] place-items-center px-4">
        <div className="max-w-md text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-danger-soft text-danger"><AlertTriangle className="h-6 w-6" aria-hidden="true" /></span>
          <h1 className="mt-4 text-[19px] font-semibold text-ink">This screen could not be displayed</h1>
          <p className="mt-2 text-[13.5px] text-muted">Your data is safe. Reload the page, or go back to the dashboard.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => window.location.reload()} className="btn btn-primary"><RotateCw aria-hidden="true" />Reload</button>
            <a href="/admin/dashboard" className="btn btn-secondary"><LayoutDashboard aria-hidden="true" />Dashboard</a>
          </div>
        </div>
      </div>
    );
  }
}

/** Catches render errors so one broken screen never blanks the whole app; resets when the route changes. */
export default function ErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <Boundary resetKey={pathname}>{children}</Boundary>;
}
