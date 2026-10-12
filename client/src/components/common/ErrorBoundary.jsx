import { Component } from 'react';
import { EmptyState } from './ui';
import { isChunkError, reloadOnce } from '../../utils/chunkReload';

export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    if (isChunkError(error) && reloadOnce()) return; // a new version was deployed: load it
    console.error(error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="nf"><div>
        <EmptyState icon="alert-triangle" title="Something went wrong" text="This screen could not be displayed. Reload the page or go back to the start.">
          <button type="button" className="btn btn-pri" onClick={() => window.location.reload()}>Reload</button>
          <a className="btn" href="/">Go to home</a>
        </EmptyState>
      </div></div>
    );
  }
}
