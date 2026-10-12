import { Link } from 'react-router-dom';
import { LIcon } from '../common/Icon';
import { LpLogo, NAV_LINKS, SectionLink } from './shared';

function NavCta({ authed, mobile }) {
  const cls = mobile ? 'l-btn l-btn-lg' : 'l-btn l-btn-sm';
  if (authed) return <Link className={`${cls} l-btn-gold l-magnetic`} to="/app">Open workspace <LIcon name="arrow-right" /></Link>;
  return mobile
    ? <><Link className={`${cls} l-btn-gold`} to="/register">Get started <LIcon name="arrow-right" /></Link><Link className={`${cls} l-btn-ghost`} to="/login">Sign in</Link></>
    : <><Link className={`${cls} l-btn-ghost`} to="/login">Sign in</Link><Link className={`${cls} l-btn-gold l-magnetic`} to="/register">Get started</Link></>;
}

export default function LandingNav({ authed, menuOpen, setMenuOpen }) {
  return (
    <>
      <header className="l-nav" id="l-nav"><div className="l-wrap l-nav-in">
        <SectionLink to="top" className="l-brand" aria-label="NEXUS AI home"><LpLogo size={30} />NEXUS<span className="l-gold-text">AI</span></SectionLink>
        <nav className="l-nav-links" aria-label="Primary">{NAV_LINKS.map(([id, l]) => <SectionLink key={id} to={id}>{l}</SectionLink>)}</nav>
        <div className="l-nav-cta"><NavCta authed={authed} /></div>
        <button className="l-burger" id="l-burger" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="l-mnav"><span /></button>
      </div></header>
      <nav className="l-mnav" id="l-mnav" aria-label="Mobile">
        {NAV_LINKS.map(([id, l]) => <SectionLink key={id} to={id} onClick={() => setMenuOpen(false)}>{l}</SectionLink>)}
        <NavCta authed={authed} mobile />
      </nav>
    </>
  );
}
