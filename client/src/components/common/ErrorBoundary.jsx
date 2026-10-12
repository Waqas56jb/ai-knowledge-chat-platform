import { Component } from 'react';
import { EmptyState } from './ui';

export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error(error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="nf"><div>
        <EmptyState icon="alert-triangle" title="Something went wrong" text="This screen could not be displayed. Reload the page or go back to the start.">
          <a className="btn btn-pri" href="/">Go to home</a>
        </EmptyState>
      </div></div>
    );
  }
}
