import { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import useLandingEffects from '../hooks/useLandingEffects';
import LandingNav from '../components/landing/LandingNav';
import Hero from '../components/landing/Hero';
import { Access, Audience, Band, Evidence, HowItWorks, Marquee, Showcase, Stats, Topics } from '../components/landing/Sections';
import { Cta, Faq, Footer } from '../components/landing/Closing';

export default function Landing() {
  const { session, ui, setUi } = useApp();
  const rootRef = useRef(null);
  const [seenAtMount] = useState(ui.lpSeen); // preloader shows on the first landing visit of the session only
  const [menuOpen, setMenuOpen] = useState(false);
  const authed = !!session;

  useLandingEffects(rootRef, { seen: seenAtMount, markSeen: () => setUi({ lpSeen: true }) });

  useEffect(() => {
    const B = document.body;
    B.classList.toggle('l-menu-open', menuOpen); B.style.overflow = menuOpen ? 'hidden' : '';
    if (!menuOpen) return undefined;
    const onKey = e => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  return (
    <div className="l-root" ref={rootRef}>
      {!seenAtMount && <div className="l-loader" id="l-loader" aria-hidden="true"><div className="l-loader-in"><div className="l-loader-word"><span>DTS AI</span></div><div className="l-loader-bar"><i /></div></div></div>}
      <div className="l-grain" aria-hidden="true" />
      <div className="l-cursor" aria-hidden="true" /><div className="l-cursor-ring" aria-hidden="true" />
      <div className="l-progress" id="l-progress" aria-hidden="true" />
      <LandingNav authed={authed} menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <Hero authed={authed} />
      <Marquee />
      <main id="main">
        <Stats />
        <Audience />
        <Topics />
        <HowItWorks />
        <Showcase />
        <Band />
        <Evidence />
        <Access authed={authed} />
        <Faq />
      </main>
      <Cta authed={authed} />
      <Footer />
    </div>
  );
}
