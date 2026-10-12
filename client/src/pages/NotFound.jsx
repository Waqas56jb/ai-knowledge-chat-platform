import { Link } from 'react-router-dom';
import { EmptyState } from '../components/common/ui';

export default function NotFound() {
  return (
    <main id="main" className="nf"><div>
      <div className="code">404</div>
      <h1 style={{ fontSize: 26, margin: '14px 0 8px' }}>This page does not exist</h1>
      <p className="muted" style={{ marginBottom: 22 }}>The link may be out of date, or the address was typed incorrectly.</p>
      <div className="hero-cta" style={{ justifyContent: 'center' }}><Link className="btn btn-pri" to="/">Go to home</Link><Link className="btn btn-out" to="/app">Open workspace</Link></div>
    </div></main>
  );
}

/** Unknown route inside the workspace shell. */
export function AppNotFound() {
  return <div className="page card"><EmptyState icon="map" title="This page does not exist" text="Use the navigation to get back to your workspace."><Link className="btn btn-pri" to="/app">Go to overview</Link></EmptyState></div>;
}
