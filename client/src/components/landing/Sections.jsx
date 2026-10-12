import { Link } from 'react-router-dom';
import { LP_IMG } from '../../data/config';
import { LIcon } from '../common/Icon';
import { LpAvatar, SectionLink } from './shared';

const MARQUEE = [['Sourcing inventory'], ['Negotiation', true], ['Pricing'], ['Lead generation', true], ['Facebook ads'], ['Hiring', true], ['Pharmacy relationships'], ['Wholesalers', true], ['LLCs & funding'], ['Scaling up', true]];

export function Marquee() {
  const items = [...MARQUEE, ...MARQUEE];
  return (
    <div className="l-marquee" aria-hidden="true"><div className="l-mq-track">
      {items.map(([t, em], i) => <span key={i}>{em ? <em>{t}</em> : t}</span>)}
    </div></div>
  );
}

function SecHead({ eyebrow, title, text, center }) {
  return (
    <div className={`l-sec-h ${center ? 'l-center' : ''}`}>
      <div className="l-rv"><span className="l-eyebrow">{eyebrow}</span><h2>{title}</h2></div>
      <p className="l-rv">{text}</p>
    </div>
  );
}

/* Real figures only: the size of the indexed library and the topic areas it covers. */
export function Stats() {
  const stats = [[209, '', 'Expert videos indexed, from sourcing to scaling'], [1900, '~', 'Searchable knowledge passages behind every answer'], [7, '', 'Core business topics covered by the library'], [1, '', 'Click from an answer to the exact video moment']];
  return (
    <section className="l-sec l-stats-sec" aria-label="The library in numbers"><div className="l-wrap">
      <div className="l-stats l-rv">
        {stats.map(([n, pre, p]) => <div className="l-stat" key={p}><div className="l-v">{pre && <small>{pre}</small>}<span data-count={n}>0</span></div><p>{p}</p></div>)}
      </div>
    </div></section>
  );
}

export function Audience() {
  const groups = [
    [LP_IMG.starter, 'A small business owner working at a counter with a tablet', 'Starting out', 'New resellers', 'You have the drive and need the map: how the model works, where inventory comes from, how to set up properly and how to land your first buyers.', ['Forming an LLC and getting set up', 'Finding and vetting first inventory', 'Pricing your first deals with confidence']],
    [LP_IMG.scaling, 'A growing team collaborating in an open-plan office', 'Growing', 'Scaling operators', 'You already move product and want more of it, with less chaos: steadier lead flow, a team that runs without you and stronger wholesaler relationships.', ['Ads that keep a pipeline full', 'Hiring and training your first team', 'Systems for higher volume']]
  ];
  return (
    <section className="l-sec" id="audience"><div className="l-wrap">
      <SecHead eyebrow="Who it's for" title={<>For founders in the <em className="l-gold-text">medical supply</em> resale space.</>} text="Reselling sealed, unexpired diabetic testing supplies and other medical commodities to licensed wholesalers and pharmacies is a real business, with real rules. DTS AI helps you learn it from someone who has done it." />
      <div className="l-aud-g l-stagger">
        {groups.map(([img, alt, tag, h, p, li], i) => (
          <article key={h} className="l-card l-img l-aud l-rv" style={{ '--i': i }}>
            <img src={img} alt={alt} loading="lazy" />
            <div className="l-body"><span className="l-tag"><LIcon name={i ? 'activity' : 'sparkles'} />{tag}</span><h3>{h}</h3><p>{p}</p>
              <ul>{li.map(x => <li key={x}><LIcon name="check" />{x}</li>)}</ul></div>
          </article>
        ))}
        <article className="l-card l-aud-dts l-rv" style={{ '--i': 2 }}>
          <div className="l-aud-media"><img src={LP_IMG.glucose} alt="A blood glucose meter, lancing device and sealed tubs of test strips" loading="lazy" /></div>
          <div className="l-aud-txt">
            <span className="l-tag"><LIcon name="info" />Why "DTS"</span>
            <h3>Named for diabetic test strips.</h3>
            <p>Diabetic testing supplies are the heart of this market, so they are the heart of the library. The same expert thinking carries over to the wider world of medical commodities.</p>
          </div>
        </article>
      </div>
    </div></section>
  );
}

export function Topics() {
  const items = [
    [LP_IMG.sourcing, 'Stacks of shipping cartons waiting to be sorted', 'package', 'Sourcing & buying', 'Where good inventory comes from, how to check condition and dating, and how to buy without overpaying.'],
    [LP_IMG.negotiation, 'Two business people shaking hands', 'scale', 'Negotiation & pricing', 'Price with margin in mind, hold your number and structure offers both sides can accept.'],
    [LP_IMG.leads, 'A laptop showing a marketing analytics dashboard', 'activity', 'Facebook ads & leads', 'Campaigns, targeting and follow-up that turn attention into a steady supply of leads.'],
    [LP_IMG.team, 'A team planning together at a whiteboard', 'users', 'Hiring & team', 'Who to hire first, how to train them and how to keep quality high as you hand work off.'],
    [LP_IMG.pharmacy, 'The bright interior of a retail pharmacy', 'shield-check', 'Pharmacies & wholesalers', 'Open doors with licensed buyers and keep relationships that last beyond the first order.'],
    [LP_IMG.funding, 'A person signing business paperwork', 'file-text', 'Funding & LLCs', 'Structuring the business, getting the paperwork right and funding early growth.'],
    [LP_IMG.scale, 'A large fulfilment warehouse with rows of stocked shelving', 'layers', 'Scaling the business', 'Processes, volume and the decisions that change as a one-person operation grows.']
  ];
  return (
    <section className="l-sec" id="topics"><div className="l-wrap">
      <SecHead eyebrow="What the library covers" title={<>Seven disciplines. <em className="l-gold-text">One expert</em> to ask.</>} text="The knowledge base is built from 209 videos recorded by an operator in this industry, broken into roughly 1,900 searchable passages and organized around the questions resellers actually ask." />
      <div className="l-top-g l-stagger">
        {items.map(([img, alt, icon, h, p], i) => (
          <SectionLink key={h} to="how" className="l-src l-rv" style={{ '--i': i }}>
            <img src={img} alt={alt} loading="lazy" />
            <span className="l-num">0{i + 1}</span><span className="l-ico"><LIcon name={icon} /></span>
            <div className="l-body"><h3>{h}</h3><p>{p}</p></div>
          </SectionLink>
        ))}
        <div className="l-top-ask l-rv" style={{ '--i': 7 }}>
          <span className="l-num">08</span>
          <LIcon name="message-square" />
          <h3>And the question you have <em>right now.</em></h3>
          <p>Ask it in plain language. If the library covers it, you get an answer with sources.</p>
        </div>
      </div>
    </div></section>
  );
}

export function HowItWorks() {
  const steps = [
    ['01', 'Ask it like you would ask a mentor.', 'Type a real business question in plain language: a deal you are pricing, a pharmacy you want to approach, an ad that stopped working.', ['Follow-up questions keep context', 'Conversations saved to your account']],
    ['02', 'Get an answer grounded in the library.', 'DTS AI searches the expert library and writes a clear answer from the passages that match, with numbered citations for each point.', ['Drawn only from indexed expert videos', 'Says plainly when the library has no answer']],
    ['03', 'Jump to the exact moment.', 'Every citation links into the source video at the timestamp where the expert makes the point, so you can hear it in full context.', ['Timestamped YouTube links', 'Read the matching transcript excerpt']]
  ];
  return (
    <section className="l-sec l-how" id="how"><div className="l-wrap">
      <SecHead eyebrow="How it works" title={<>From question to the <em className="l-gold-text">source,</em> in seconds.</>} text="No hunting through hours of video for the one segment you half remember. Ask, read, and go straight to the moment that matters." />
      <div className="l-how-g">
        <div className="l-how-media" id="l-howMedia">
          <img className="l-on" src={LP_IMG.ask} alt="Founders working on laptops around a shared table" loading="lazy" />
          <img src={LP_IMG.answer} alt="Two people discussing a plan over a laptop" loading="lazy" />
          <img src={LP_IMG.moment} alt="An expert presenting to a room of people" loading="lazy" />
          <span className="l-lbl" id="l-howLbl">01 — Ask</span>
        </div>
        <div className="l-steps" id="l-steps"><span className="l-fill" id="l-stepFill" />
          {steps.map(([n, h, p, li], i) => (
            <div key={n} className={`l-step ${i === 0 ? 'l-on' : ''}`} data-step={i}><span className="l-n">{n}</span><div><h3>{h}</h3><p>{p}</p>
              <ul>{li.map(x => <li key={x}><LIcon name="check" />{x}</li>)}</ul></div></div>
          ))}
        </div>
      </div>
    </div></section>
  );
}

export function Showcase() {
  return (
    <section className="l-sec" id="product" style={{ paddingTop: 0 }}><div className="l-wrap">
      <SecHead center eyebrow="See it in action" title={<>An answer you can <em className="l-gold-text">trace</em> to the source.</>} text="Your conversations on the left, the answer in the middle, the exact transcript excerpt on the right." />
      <div className="l-show l-rv-img" id="l-show">
        <img src={LP_IMG.showcase} alt="" loading="lazy" />
        <div className="l-app" role="img" aria-label="Illustrative DTS AI conversation with citation chips and a source panel">
          <div className="l-app-side" aria-hidden="true">
            <span className="l-brand">DTS<span className="l-gold-text">AI</span></span>
            <div className="l-it l-on"><LIcon name="plus" />New chat</div>
            <div className="l-it"><LIcon name="library" />Expert library</div>
            <div className="l-it"><LIcon name="history" />History</div>
            <small>Recent</small>
            <div className="l-it l-on">Pricing a bulk lot</div><div className="l-it">First hire checklist</div><div className="l-it">Ad budget for leads</div>
          </div>
          <div className="l-app-main" aria-hidden="true">
            <h4>Pricing a bulk lot</h4>
            <div className="l-q">A seller is offering a large lot of test strips. How do I work out what to pay?</div>
            <div className="l-a"><LpAvatar size={26} />
              <p>Start from what your buyer will pay, not from the seller's ask <span className="l-cn">1</span>. Confirm every box is sealed and well within date before you agree a number <span className="l-cn">2</span>, then build in your margin and costs and make one clear offer <span className="l-cn">3</span>.</p></div>
            <div className="l-chips">
              <span className="l-cchip l-on"><LIcon name="play-circle" />Pricing your buys<b>06:41</b></span>
              <span className="l-cchip"><LIcon name="play-circle" />Checking inventory<b>02:19</b></span>
              <span className="l-cchip"><LIcon name="play-circle" />Making the offer<b>13:05</b></span>
            </div>
            <div className="l-comp">Ask a follow-up…</div>
          </div>
          <div className="l-app-dr" aria-hidden="true"><h5>Source details</h5><span className="l-chip" style={{ margin: 0, width: 'fit-content' }}><LIcon name="play-circle" />Expert video</span>
            <p style={{ color: 'var(--ivory)', fontWeight: 500 }}>Pricing your buys</p>
            <div className="l-ex">"Work backwards from your buyer. That number decides what you can pay."</div><small><LIcon name="external-link" /> Opens at 06:41</small></div>
        </div>
      </div>
      <p className="l-note l-rv">Illustrative example. Real answers cite the actual videos in the library.</p>
    </div></section>
  );
}

export function Band() {
  return (
    <section className="l-band" aria-label="Our standard"><div className="l-band-bg" id="l-bandBg" style={{ backgroundImage: `url("${LP_IMG.band}")` }} />
      <div className="l-wrap l-rv"><blockquote>"Good advice should always show <span>where it came from.</span>"</blockquote><cite>The DTS AI standard</cite></div>
    </section>
  );
}

export function Evidence() {
  return (
    <section className="l-sec" id="trust"><div className="l-wrap">
      <SecHead eyebrow="Grounded, not guessed" title={<>It answers from the expert, <em className="l-gold-text">or tells you it can't.</em></>} text="DTS AI only answers from the indexed expert library. When a question falls outside it, you get an honest 'not covered' instead of a confident guess." />
      <div className="l-ev-g l-stagger">
        <div className="l-card l-ev l-rv" style={{ '--i': 0 }}>
          <div className="l-hd"><LIcon name="check-circle-2" />Covered by the library</div>
          <p className="l-q">How should I follow up after a wholesaler goes quiet?</p>
          <p className="l-a">Follow up on a set schedule rather than whenever you remember <span className="l-cn">1</span>, lead each message with something useful to them, such as fresh availability <span className="l-cn">2</span>, and keep a simple record of every contact so nothing slips <span className="l-cn">3</span>.</p>
          <div className="l-ref"><span className="l-cn">1</span><b>Staying top of mind</b><span>Video · 03:12</span></div>
          <div className="l-ref"><span className="l-cn">2</span><b>Working with wholesalers</b><span>Video · 09:47</span></div>
          <div className="l-ref"><span className="l-cn">3</span><b>Simple systems that scale</b><span>Video · 15:30</span></div>
        </div>
        <div className="l-card l-ev l-no l-rv" style={{ '--i': 1 }}>
          <div className="l-hd"><LIcon name="alert-circle" />Not covered</div>
          <p className="l-q">What dose of insulin should I be taking?</p>
          <div className="l-empty"><p>The expert library doesn't cover this, so DTS AI won't guess.</p><p>It is a business advisor, not a medical one. For anything about health or treatment, speak to a doctor or pharmacist.</p></div>
        </div>
      </div>
      <p className="l-note l-rv">Illustrative examples. Real answers cite the actual videos in the library.</p>
      <div className="l-right l-stagger">
        {[['shield-check', 'Sealed and in date', 'Deal only in sealed, unexpired supplies that are handled and stored properly.'],
          ['check-circle', 'Licensed partners', 'Work with licensed wholesalers and pharmacies, and keep proper records.'],
          ['scale', 'Know your rules', 'Requirements vary by location. Confirm yours with qualified professionals.'],
          ['alert-triangle', 'No promises', 'DTS AI shares expert know-how. It does not promise income or give medical advice.']].map(([i, h, p], n) => (
          <div key={h} className="l-right-i l-rv" style={{ '--i': n }}><LIcon name={i} /><div><b>{h}</b><p>{p}</p></div></div>
        ))}
      </div>
    </div></section>
  );
}

export function Access({ authed }) {
  const steps = [['mail', 'Receive an invitation', 'An administrator sends you a personal invitation link or code.'], ['key', 'Create your account', 'Open the link, set your password and you are in.'], ['message-square', 'Start asking', 'Your questions and saved conversations follow you on any device.']];
  return (
    <section className="l-sec l-access" id="access-info"><div className="l-wrap l-acc-g">
      <div className="l-acc-media l-rv-img"><img src={LP_IMG.access} alt="A sealed cardboard parcel being handed from one person to another" loading="lazy" /></div>
      <div>
        <div className="l-rv"><span className="l-eyebrow">Invitation only</span><h2>A private library, <em className="l-gold-text">by invitation.</em></h2>
          <p className="l-acc-lead">DTS AI is not open to the public. Administrators invite members and curate the knowledge, so the library stays focused and every answer comes from a trusted source.</p></div>
        <ol className="l-acc-steps l-stagger">
          {steps.map(([i, h, p], n) => <li key={h} className="l-rv" style={{ '--i': n }}><span><LIcon name={i} /></span><div><b>{h}</b><p>{p}</p></div></li>)}
        </ol>
        <div className="l-hero-cta l-rv">
          {authed
            ? <Link className="l-btn l-btn-gold l-magnetic" to="/app">Open DTS AI <LIcon name="arrow-right" /></Link>
            : <><Link className="l-btn l-btn-gold l-magnetic" to="/register">I have an invitation <LIcon name="arrow-right" /></Link><Link className="l-btn l-btn-ghost l-magnetic" to="/login">Sign in</Link></>}
        </div>
      </div>
    </div></section>
  );
}
