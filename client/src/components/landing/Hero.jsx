import { Link } from 'react-router-dom';
import { LP_IMG } from '../../data/config';
import { LIcon } from '../common/Icon';
import { LpAvatar, SectionLink } from './shared';

export default function Hero({ authed }) {
  return (
    <section className="l-hero" id="top">
      <div className="l-hero-bg" id="l-heroBg" style={{ backgroundImage: `url("${LP_IMG.hero}")` }} role="img" aria-label="A long warehouse aisle lined with shelves of boxed stock" />
      <div className="l-hero-shade" /><div className="l-hero-glow" />
      <div className="l-wrap l-hero-g">
        <div>
          <span className="l-eyebrow l-fade l-d1">The AI advisor for medical supply resellers</span>
          <h1><span className="l-line"><span>Build your supply</span></span><span className="l-line"><span>business on</span></span><span className="l-line"><span><em className="l-gold-text">expert answers.</em></span></span></h1>
          <p className="l-lead l-fade l-d2">DTS AI puts a seasoned operator's playbook one question away. Ask about sourcing diabetic testing supplies, pricing a deal or winning over a pharmacy, and get a clear answer drawn from an expert video library, with a link to the exact moment it was said.</p>
          <div className="l-hero-cta l-fade l-d3">
            {authed
              ? <Link className="l-btn l-btn-lg l-btn-gold l-magnetic" to="/app">Open DTS AI <LIcon name="arrow-right" /></Link>
              : <><Link className="l-btn l-btn-lg l-btn-gold l-magnetic" to="/register">I have an invitation <LIcon name="arrow-right" /></Link>
                <Link className="l-btn l-btn-lg l-btn-ghost l-magnetic" to="/login">Sign in</Link></>}
          </div>
          <div className="l-hero-meta l-fade l-d4">
            <div><LIcon name="play-circle" />209 expert videos</div>
            <div><LIcon name="clock" />Timestamped citations</div>
            <div><LIcon name="key" />Invitation only</div>
          </div>
        </div>

        <div className="l-hcard l-fade l-d5" id="l-hcard" role="img" aria-label="Illustrative preview of a DTS AI answer citing two expert videos">
          <div className="l-hcard-in" aria-hidden="true">
            <div className="l-hc-top"><span className="l-dots"><i /><i /><i /></span><b>Example · Pharmacy outreach</b><span className="l-chip"><LIcon name="sparkles" />2 sources</span></div>
            <div className="l-hc-q">How should I approach an independent pharmacy as a new supplier?</div>
            <div className="l-hc-a">
              <LpAvatar className="l-av" />
              <div style={{ flex: 1 }}><p id="l-typed" />
                <div className="l-cites">
                  <div className="l-cite"><span className="l-t"><LIcon name="play-circle" /></span><div><b>Building pharmacy relationships</b><small>Expert video · opens at 04:32</small></div></div>
                  <div className="l-cite"><span className="l-t"><LIcon name="play-circle" /></span><div><b>Doing it the right way</b><small>Expert video · opens at 11:08</small></div></div>
                </div></div>
            </div>
            <div className="l-hc-comp"><span>Ask about your supply business…</span><span><LIcon name="arrow-up" /></span></div>
          </div>
          <div className="l-hfloat" aria-hidden="true"><b><LIcon name="clock" />Transcript · 04:32</b>"Walk in with something specific they can say yes to, and then be the supplier who always follows up."</div>
        </div>
      </div>
      <SectionLink to="audience" className="l-scroll-cue" aria-label="Scroll to who it is for">Scroll<i /></SectionLink>
    </section>
  );
}
