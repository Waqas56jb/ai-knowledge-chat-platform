import { Link } from 'react-router-dom';
import { LIcon } from '../common/Icon';
import { LpAvatar, SectionLink } from './shared';

export default function Hero({ authed }) {
  return (
    <section className="l-hero" id="top">
      <div className="l-hero-bg" id="l-heroBg" role="img" aria-label="Earth at night with city lights forming a glowing network" />
      <div className="l-hero-shade" /><div className="l-hero-glow" />
      <div className="l-wrap l-hero-g">
        <div>
          <span className="l-eyebrow l-fade l-d1">Your knowledge · One intelligent workspace</span>
          <h1><span className="l-line"><span>Answers grounded</span></span><span className="l-line"><span>in what you</span></span><span className="l-line"><span><em className="l-gold-text">actually know.</em></span></span></h1>
          <p className="l-lead l-fade l-d2">Bring your videos, documents and business knowledge together in one AI workspace. Ask anything, and get answers backed by your own sources, with every claim traceable.</p>
          <div className="l-hero-cta l-fade l-d3">
            <Link className="l-btn l-btn-lg l-btn-gold l-magnetic" to={authed ? '/app' : '/register'}>Start exploring <LIcon name="arrow-right" /></Link>
            <SectionLink to="how" className="l-btn l-btn-lg l-btn-ghost l-magnetic"><LIcon name="play" /> See how it works</SectionLink>
          </div>
          <div className="l-hero-meta l-fade l-d4">
            <div><LIcon name="quote" />Source-grounded answers</div>
            <div><LIcon name="layers" />Knowledge, organized</div>
            <div><LIcon name="shield-check" />Private by design</div>
          </div>
        </div>

        <div className="l-hcard l-fade l-d5" id="l-hcard" role="img" aria-label="Preview of a NEXUS AI answer citing two sources">
          <div className="l-hcard-in" aria-hidden="true">
            <div className="l-hc-top"><span className="l-dots"><i /><i /><i /></span><b>Negotiation prep</b><span className="l-chip"><LIcon name="sparkles" />2 sources</span></div>
            <div className="l-hc-q">What should I prepare before a pricing negotiation?</div>
            <div className="l-hc-a">
              <LpAvatar className="l-av" />
              <div style={{ flex: 1 }}><p id="l-typed" />
                <div className="l-cites">
                  <div className="l-cite"><span className="l-t"><LIcon name="play-circle" /></span><div><b>Preparing for a Customer Negotiation</b><small>YouTube · at 02:15</small></div></div>
                  <div className="l-cite"><span className="l-t"><LIcon name="file-text" /></span><div><b>Pricing Playbook 2026</b><small>Document · page 9</small></div></div>
                </div></div>
            </div>
            <div className="l-hc-comp"><span>Ask about your knowledge…</span><span><LIcon name="arrow-up" /></span></div>
          </div>
          <div className="l-hfloat" aria-hidden="true"><b><LIcon name="clock" />Transcript · 02:15</b>"Write down your objective, your ideal outcome, and the point at which you would walk away."</div>
        </div>
      </div>
      <SectionLink to="features" className="l-scroll-cue" aria-label="Scroll to features">Scroll<i /></SectionLink>
    </section>
  );
}
