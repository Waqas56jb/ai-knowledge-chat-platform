import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BRAND, LP_IMG } from '../../data/config';
import { LIcon } from '../common/Icon';
import { LpLogo, SectionLink } from './shared';

const FAQS = [
  ['What is ' + BRAND.name + '?', BRAND.name + ' is an AI chat assistant for entrepreneurs building businesses that resell sealed, unexpired diabetic testing supplies and other medical commodities to wholesalers and pharmacies. You ask business questions; it answers from an industry expert\'s video library.'],
  ['Where do the answers come from?', 'From a curated library of 209 expert YouTube videos, indexed into roughly 1,900 knowledge passages. Topics include sourcing, negotiation and pricing, Facebook ads and lead generation, hiring, pharmacy and wholesaler relationships, LLCs and funding, and scaling.'],
  ['What happens if the library doesn\'t cover my question?', 'DTS AI tells you so. It is designed to answer only from the indexed expert knowledge, and it will not fill the gap with a made-up answer.'],
  ['How do I check where an answer came from?', 'Each supported answer lists its sources. Select a citation to read the matching transcript excerpt, or open the video at the exact timestamp where the point is made.'],
  ['Is this legal, financial or medical advice?', 'No. DTS AI shares business know-how from an experienced operator. Rules for buying and reselling medical supplies vary by location, so confirm your obligations with qualified professionals and work with licensed partners. It does not give medical advice or promise any business result.'],
  ['How do I get access?', 'Access is by invitation only. An administrator sends you an invitation; open it to create your account, then sign in any time.'],
  ['Are my conversations saved?', 'Yes. Conversations are saved to your account, so you can reopen, rename or delete them from any device.']
];

export function Faq() {
  const [open, setOpen] = useState(0);
  return (
    <section className="l-sec" id="faq"><div className="l-wrap l-faq-g">
      <div className="l-sec-h l-rv"><div><span className="l-eyebrow">FAQ</span><h2>Good questions, <em className="l-gold-text">straight answers.</em></h2></div><p>The essentials about how DTS AI works, where its knowledge comes from and how to get in.</p></div>
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
    <section className="l-cta" id="access"><div className="l-cta-bg" style={{ backgroundImage: `url("${LP_IMG.cta}")` }} aria-hidden="true" /><div className="l-wrap">
      <span className="l-eyebrow l-rv">Your next question</span>
      <h2 className="l-rv" style={{ marginTop: 22 }}>Stop guessing.<br /><em className="l-gold-text">Ask the expert.</em></h2>
      <p className="l-rv">Bring the deal, the hire or the pharmacy pitch you are working on today. DTS AI answers from the library and shows you exactly where it came from.</p>
      <div className="l-hero-cta l-rv" style={{ justifyContent: 'center' }}>
        {authed
          ? <Link className="l-btn l-btn-lg l-btn-gold l-magnetic" to="/app">Open DTS AI <LIcon name="arrow-right" /></Link>
          : <><Link className="l-btn l-btn-lg l-btn-gold l-magnetic" to="/register">I have an invitation <LIcon name="arrow-right" /></Link><Link className="l-btn l-btn-lg l-btn-ghost l-magnetic" to="/login">Sign in</Link></>}
      </div>
    </div></section>
  );
}

export function Footer() {
  return (
    <footer className="l-foot"><div className="l-wrap">
      <div className="l-foot-g">
        <div><Link className="l-brand" to="/"><LpLogo size={28} />DTS<span className="l-gold-text">AI</span></Link><p>Expert answers for entrepreneurs reselling diabetic testing supplies and medical commodities, every one traceable to its source.</p></div>
        <div><h4>Product</h4><ul><li><SectionLink to="audience">Who it's for</SectionLink></li><li><SectionLink to="topics">Topics</SectionLink></li><li><SectionLink to="how">How it works</SectionLink></li><li><SectionLink to="trust">Trust</SectionLink></li></ul></div>
        <div><h4>Access</h4><ul><li><Link to="/login">Sign in</Link></li><li><Link to="/register">I have an invitation</Link></li><li><SectionLink to="faq">FAQ</SectionLink></li></ul></div>
        <div><h4>Legal</h4><ul><li><Link to="/privacy">Privacy Policy</Link></li><li><Link to="/terms">Terms of Service</Link></li></ul></div>
      </div>
      <p className="l-foot-note">DTS AI provides business education drawn from an expert video library. It is not legal, financial or medical advice and makes no promise of business results.</p>
      <div className="l-foot-big" aria-hidden="true">DTS AI</div>
      <div className="l-foot-b"><span>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</span><SectionLink to="top" className="l-to-top">Back to top <LIcon name="arrow-up" /></SectionLink></div>
    </div></footer>
  );
}
