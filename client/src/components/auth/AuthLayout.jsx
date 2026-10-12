import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { BrandMark } from '../common/Logo';

const AUTH_IMG = {
  login: ['https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=2400&q=88', <>Your knowledge, <em>ready when you are.</em></>, 'Your workspace is exactly where you left it: conversations, sources and evidence.'],
  register: ['https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=2400&q=88', <>Answers grounded in what you <em>actually know.</em></>, 'One workspace for your videos, documents and business knowledge.'],
  forgot: ['https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&w=2400&q=88', <>Back in, <em>in a moment.</em></>, 'Reset your password and pick up your conversations where you left them.'],
  reset: ['https://images.unsplash.com/photo-1639322537228-f710d846310a?auto=format&fit=crop&w=2400&q=88', <>A fresh start, <em>same workspace.</em></>, 'Choose a new password. Your conversations and sources stay exactly where they are.']
};

/** Split screen: full-bleed photo with brand story on the left, the form card on the right. */
export default function AuthLayout({ kind = 'login', title, sub, children }) {
  const [img, h, p] = AUTH_IMG[kind];
  return (
    <div className="auth">
      <aside className="auth-side">
        <div className="ab" style={{ backgroundImage: `url('${img}')` }} role="img" aria-label="Decorative background photo" />
        <Link className="brand" to="/"><BrandMark size={32} /></Link>
        <div className="mid"><span className="eb">Private knowledge workspace</span><h2>{h}</h2><p>{p}</p>
          <ul><li><Icon name="check" />Answers that point to their sources</li><li><Icon name="check" />Conversations kept in separate sessions</li><li><Icon name="check" />Access by invitation only</li></ul>
          <div className="aq"><q>An answer is only as good as the source behind it.</q><small>The NEXUS principle</small></div>
        </div>
      </aside>
      <main id="main" className="auth-main">
        <Link className="auth-back" to="/"><Icon name="arrow-left" />Back to home</Link>
        <div className="auth-card">
          <Link className="brand m" to="/"><BrandMark size={30} /></Link>
          <h1>{title}</h1><p className="sub">{sub}</p>{children}
        </div>
      </main>
    </div>
  );
}
