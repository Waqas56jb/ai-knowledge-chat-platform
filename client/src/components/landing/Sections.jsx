import { LIcon } from '../common/Icon';
import { LpAvatar, SectionLink } from './shared';

const IMG = (id, w = 2400) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=88`;
const MARQUEE = [['Research'], ['Internal knowledge', true], ['Sales enablement'], ['Client calls', true], ['Playbooks'], ['Video libraries', true], ['Onboarding'], ['Better decisions', true]];

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

export function Features() {
  const small = [['play-circle', 'YouTube knowledge', 'Search channel videos and transcripts, then jump straight to the moment that matters.'], ['file-text', 'Your documents', 'Playbooks, guides and handbooks, brought together and searchable in plain language.'], ['search-check', 'Evidence you can explore', 'Open the source behind any answer instead of relying on an unsupported claim.'], ['messages-square', 'Focused conversations', 'Keep related questions organized in separate, resumable chat sessions.']];
  return (
    <section className="l-sec" id="features"><div className="l-wrap">
      <SecHead eyebrow="Features" title={<>Built around the <em className="l-gold-text">evidence,</em> not the chatbot.</>} text="Every part of the workspace keeps an answer connected to where it came from, so you can trust it, check it and share it." />
      <div className="l-bento l-stagger">
        <article className="l-card l-img l-c-span4 l-rv" style={{ '--i': 0 }}>
          <img src={IMG('1639322537228-f710d846310a')} alt="Glowing connected cubes forming a network" loading="lazy" />
          <div className="l-body"><span className="l-tag"><LIcon name="quote" />Core</span><h3>Source-grounded AI</h3><p>Answers come from your indexed knowledge, with clear numbered references to the exact passage, page or timestamp.</p></div>
        </article>
        {small.map(([i, t, p], n) => <article key={t} className="l-card l-c-span2 l-rv" style={{ '--i': n + 1 }}><div className="l-fi"><LIcon name={i} /></div><h3>{t}</h3><p>{p}</p></article>)}
        <article className="l-card l-img l-c-span3 l-rv" style={{ '--i': 5 }}>
          <img src={IMG('1522071820081-009f0129c71c')} alt="A team working together on laptops around a table" loading="lazy" />
          <div className="l-body"><span className="l-tag"><LIcon name="users" />Teams</span><h3>Built for the whole team</h3><p>One shared source of truth for research, sales and operations.</p></div>
        </article>
        <article className="l-card l-img l-c-span3 l-rv" style={{ '--i': 6 }}>
          <img src={IMG('1550751827-4bd374c3f58b')} alt="Abstract digital security visual" loading="lazy" />
          <div className="l-body"><span className="l-tag"><LIcon name="lock" />Security</span><h3>Controlled access</h3><p>A private workspace for authorized users, with invitation-based sign-up.</p></div>
        </article>
      </div>
    </div></section>
  );
}

export function HowItWorks() {
  const steps = [
    ['01', 'Bring your knowledge together.', 'Videos, documents and text resources are organized into one searchable knowledge base.', ['YouTube channels & transcripts', 'PDFs, playbooks and notes']],
    ['02', 'Ask a question.', "Use natural language to explore everything you have, the way you'd ask a colleague.", ['Follow-ups keep context', 'Scope to one source type']],
    ['03', 'Review the evidence.', 'Read the response, then inspect the exact excerpts that support it, down to the timestamp.', ['Numbered citations', 'Honest "not enough information"']]
  ];
  return (
    <section className="l-sec l-how" id="how"><div className="l-wrap">
      <SecHead eyebrow="How it works" title={<>From scattered knowledge to a <em className="l-gold-text">checked answer.</em></>} text="Three steps. No retraining, no prompt engineering, no guessing where an answer came from." />
      <div className="l-how-g">
        <div className="l-how-media" id="l-howMedia">
          <img className="l-on" src={IMG('1507842217343-583bb7270b66')} alt="Shelves of books in a library" loading="lazy" />
          <img src={IMG('1516321318423-f06f85e504b3')} alt="Hands pointing at a laptop screen" loading="lazy" />
          <img src={IMG('1454165804606-c3d57bc86b40')} alt="Reviewing documents next to a laptop" loading="lazy" />
          <span className="l-lbl" id="l-howLbl">01 — Collect</span>
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

export function SourcesShowcase() {
  const items = [
    ['1574717024653-61fd2cf4d44d', 'Video editing timeline on a screen', 'play-circle', 'Videos & transcripts', 'Channel videos with timestamped transcript segments you can jump into.'],
    ['1586953208448-b95a79798f07', 'Phone on a desk showing a document app', 'file-text', 'Business documents', 'Playbooks, guides, handbooks and the policies your team relies on.'],
    ['1600880292203-757bb62b4baf', 'Two colleagues celebrating in a meeting', 'messages-square', 'Client conversations', 'Call notes and email threads: what was asked, offered and agreed.'],
    ['1481627834876-b7833e8f5570', 'A warmly lit library aisle', 'library', 'Internal reference', 'FAQs, checklists and everything your team looks up every week.']
  ];
  return (
    <section className="l-sec" id="sources"><div className="l-wrap">
      <SecHead eyebrow="Knowledge sources" title={<>One place for everything your team <em className="l-gold-text">already knows.</em></>} text="Different kinds of knowledge, searched together and answered as one." />
      <div className="l-src-g l-stagger">
        {items.map(([img, alt, icon, h, p], i) => (
          <SectionLink key={h} to="evidence" className="l-src l-rv" style={{ '--i': i }}>
            <img src={IMG(img, 1600)} alt={alt} loading="lazy" />
            <span className="l-num">0{i + 1}</span><span className="l-ico"><LIcon name={icon} /></span>
            <div className="l-body"><h3>{h}</h3><p>{p}</p></div>
          </SectionLink>
        ))}
      </div>
    </div></section>
  );
}

export function Band() {
  return (
    <section className="l-band" aria-label="Philosophy"><div className="l-band-bg" id="l-bandBg" />
      <div className="l-wrap l-rv"><blockquote>"An answer is only as good as the <span>source</span> behind it."</blockquote><cite>The NEXUS principle</cite></div>
    </section>
  );
}

export function Stats() {
  const stats = [[4, '', 'Knowledge types searched together'], [100, '%', 'Of supported answers come with sources'], [0, '', 'Answers invented from general AI knowledge'], [1, '', 'Private workspace for your whole team']];
  return (
    <section className="l-sec" style={{ paddingTop: 0 }}><div className="l-wrap">
      <div className="l-stats l-rv">
        {stats.map(([n, sup, p]) => <div className="l-stat" key={p}><div className="l-v"><span data-count={n}>0</span>{sup && <sup>{sup}</sup>}</div><p>{p}</p></div>)}
      </div>
    </div></section>
  );
}

export function Evidence() {
  return (
    <section className="l-sec" id="evidence" style={{ paddingTop: 0 }}><div className="l-wrap">
      <SecHead eyebrow="Trust" title={<>It shows where an answer came from, <em className="l-gold-text">and when it has none.</em></>} text="The assistant stays inside your indexed knowledge. No system is perfect, so every answer comes with sources you can check yourself." />
      <div className="l-ev-g l-stagger">
        <div className="l-card l-ev l-rv" style={{ '--i': 0 }}>
          <div className="l-hd"><LIcon name="check-circle-2" />Answer with evidence</div>
          <p className="l-q">How should we respond to a discount request?</p>
          <p className="l-a">Link any discount above 10% to a longer contract or reduced scope <span className="l-cn">1</span>. In the retail rollout call, a 5% reduction was tied to a 12-month commitment <span className="l-cn">2</span>, and the video advice is to trade concessions rather than give them away <span className="l-cn">3</span>.</p>
          <div className="l-ref"><span className="l-cn">1</span><b>Pricing Playbook 2026</b><span>Document · p. 9</span></div>
          <div className="l-ref"><span className="l-cn">2</span><b>Call notes: retail rollout</b><span>Conversation</span></div>
          <div className="l-ref"><span className="l-cn">3</span><b>Preparing for a Customer Negotiation</b><span>Video · 08:10</span></div>
        </div>
        <div className="l-card l-ev l-no l-rv" style={{ '--i': 1 }}>
          <div className="l-hd"><LIcon name="alert-circle" />When evidence is unavailable</div>
          <p className="l-q">What is our competitors' market share this year?</p>
          <div className="l-empty"><p>The indexed knowledge does not contain enough information to answer this.</p><p>Try a different topic, or add a source that covers it.</p></div>
        </div>
      </div>
    </div></section>
  );
}

export function Showcase() {
  return (
    <section className="l-sec" id="product" style={{ paddingTop: 0 }}><div className="l-wrap">
      <SecHead center eyebrow="The workspace" title={<>Made for long, <em className="l-gold-text">careful</em> questions.</>} text="History on the left, the conversation in the middle, the evidence on the right." />
      <div className="l-show l-rv-img" id="l-show">
        <img src={IMG('1617791160505-6f00504e3519', 3840)} alt="" loading="lazy" />
        <div className="l-app" role="img" aria-label="Workspace preview with conversation history, chat and a source panel">
          <div className="l-app-side" aria-hidden="true">
            <span className="l-brand">NEXUS<span className="l-gold-text">AI</span></span>
            <div className="l-it l-on"><LIcon name="plus" />New chat</div>
            <div className="l-it"><LIcon name="library" />Knowledge sources</div>
            <div className="l-it"><LIcon name="history" />History</div>
            <small>Recent</small>
            <div className="l-it l-on">Negotiation strategies</div><div className="l-it">Handling objections</div><div className="l-it">Saved video summary</div>
          </div>
          <div className="l-app-main" aria-hidden="true">
            <h4>Negotiation strategies in my knowledge base</h4>
            <div className="l-q">What negotiation strategies appear in my knowledge base?</div>
            <div className="l-a"><LpAvatar size={26} />
              <p>A consistent approach: define your walk-away point first <span className="l-cn">1</span>, ask questions early <span className="l-cn">2</span>, and trade concessions instead of giving them away <span className="l-cn">3</span>.</p></div>
            <div className="l-cites"><div className="l-cite l-on"><span className="l-t"><LIcon name="play-circle" /></span><div><b>Preparing for a Customer Negotiation</b><small>YouTube · 3 excerpts</small></div></div></div>
            <div className="l-comp">Ask a follow-up…</div>
          </div>
          <div className="l-app-dr" aria-hidden="true"><h5>Source details</h5><span className="l-chip" style={{ margin: 0, width: 'fit-content' }}><LIcon name="play-circle" />YouTube</span>
            <p style={{ color: 'var(--ivory)', fontWeight: 500 }}>Preparing for a Customer Negotiation</p>
            <div className="l-ex">"Trade concessions instead of giving them away."</div><small>Transcript at 08:10</small></div>
        </div>
      </div>
    </div></section>
  );
}
