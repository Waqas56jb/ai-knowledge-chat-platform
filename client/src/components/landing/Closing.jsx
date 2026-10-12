import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BRAND } from '../../data/config';
import { LIcon } from '../common/Icon';
import { LpLogo, SectionLink } from './shared';

const FAQS = [
  ['What is ' + BRAND.name + '?', BRAND.name + ' is an AI workspace for asking questions about your own knowledge: videos, documents, text resources and client conversations. Answers point back to the sources they came from.'],
  ['Which knowledge sources can it use?', 'YouTube videos and transcripts, documents, text resources and client conversation records, all searched together. Sources are added and indexed by your workspace administrators.'],
  ['Does it answer from general AI knowledge?', 'No. The assistant is designed to answer from the indexed knowledge only. When your sources do not cover a question, it says so instead of guessing.'],
  ['Can I review the sources behind an answer?', 'Yes. Every supported answer lists its sources. Select a citation to read the exact excerpt, and for videos, open the timestamp.'],
  ['How do I get access?', 'Access is by invitation. You need an invitation code from a workspace administrator to create an account.'],
  ['Can my conversations be saved?', 'Yes. Conversations are saved to your account, so you can reopen, rename or delete them from any device.']
];

export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="l-sec" id="faq" style={{ paddingTop: 0 }}><div className="l-wrap l-faq-g">
      <div className="l-sec-h l-rv"><div><span className="l-eyebrow">FAQ</span><h2>Questions people <em className="l-gold-text">ask first.</em></h2></div><p>Can't find what you need? Request access and we'll walk you through it.</p></div>
      <div className="l-faq l-rv" id="l-faqList">
        {FAQS.map(([q, a], i) => (
          <div className="l-faq-i" key={q}>
            <button className="l-faq-q" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i} aria-controls={`lfa${i}`}><span>{q}</span><span className="l-pm" aria-hidden="true" /></button>
            <div className="l-faq-a" id={`lfa${i}`} role="region"><div><p>{a}</p></div></div>
          </div>
        ))}
      </div>
    </div></section>
  );
}

export function Cta({ authed }) {
  return (
    <section className="l-cta" id="access"><div className="l-cta-bg" aria-hidden="true" /><div className="l-wrap">
      <span className="l-eyebrow l-rv">Get started</span>
      <h2 className="l-rv" style={{ marginTop: 22 }}>Make your knowledge<br /><em className="l-gold-text">more useful.</em></h2>
      <p className="l-rv">Access is by invitation. Create your account with an invitation code, or sign in to your workspace.</p>
      <div className="l-hero-cta l-rv" style={{ justifyContent: 'center' }}>
        {authed
          ? <Link className="l-btn l-btn-lg l-btn-gold l-magnetic" to="/app">Open workspace <LIcon name="arrow-right" /></Link>
          : <><Link className="l-btn l-btn-lg l-btn-gold l-magnetic" to="/register">Create your account <LIcon name="arrow-right" /></Link><Link className="l-btn l-btn-lg l-btn-ghost l-magnetic" to="/login">Sign in</Link></>}
      </div>
    </div></section>
  );
}

export function Footer() {
  return (
    <footer className="l-foot"><div className="l-wrap">
      <div className="l-foot-g">
        <div><Link className="l-brand" to="/"><LpLogo size={28} />NEXUS<span className="l-gold-text">AI</span></Link><p>An AI workspace for asking questions about your own videos, documents and business knowledge.</p></div>
        <div><h4>Product</h4><ul><li><SectionLink to="features">Features</SectionLink></li><li><SectionLink to="how">How it works</SectionLink></li><li><SectionLink to="sources">Sources</SectionLink></li><li><SectionLink to="product">Workspace</SectionLink></li></ul></div>
        <div><h4>Access</h4><ul><li><Link to="/login">Sign in</Link></li><li><Link to="/register">Register with an invitation</Link></li><li><SectionLink to="faq">FAQ</SectionLink></li></ul></div>
        <div><h4>Legal</h4><ul><li><Link to="/privacy">Privacy Policy</Link></li><li><Link to="/terms">Terms of Service</Link></li></ul></div>
      </div>
      <div className="l-foot-big" aria-hidden="true">NEXUS</div>
      <div className="l-foot-b"><span>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</span><SectionLink to="top" className="l-to-top">Back to top <LIcon name="arrow-up" /></SectionLink></div>
    </div></footer>
  );
}
