import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { BrandMark } from '../common/Logo';
import { LP_IMG } from '../../data/config';

const AUTH_IMG = {
  login: [LP_IMG.hero, 'A long warehouse aisle lined with shelves of boxed stock', <>Your expert library, <em>ready when you are.</em></>, 'Pick up where you left off: your conversations, citations and the video moments behind them.'],
  register: [LP_IMG.glucose, 'A blood glucose meter, lancing device and sealed tubs of test strips', <>Build on <em>expert answers.</em></>, 'Your invitation opens a private library of 209 expert videos on running a medical supply resale business.'],
  forgot: [LP_IMG.pharmacy, 'The bright interior of a retail pharmacy', <>Back in, <em>in a moment.</em></>, 'Reset your password and pick up your conversations where you left them.'],
  reset: [LP_IMG.pharmacy, 'The bright interior of a retail pharmacy', <>A fresh start, <em>same library.</em></>, 'Choose a new password. Your conversations stay exactly where they are.']
};

/** Split screen: full-bleed photo with brand story on the left, the form card on the right. */
export default function AuthLayout({ kind = 'login', title, sub, children }) {
  const [img, alt, h, p] = AUTH_IMG[kind];
  return (
    <div className="auth">
      <aside className="auth-side">
        <div className="ab" style={{ backgroundImage: `url('${img}')` }} role="img" aria-label={alt} />
        <Link className="brand" to="/"><BrandMark size={32} /></Link>
        <div className="mid"><span className="eb">Expert answers for supply resellers</span><h2>{h}</h2><p>{p}</p>
          <ul><li><Icon name="check" />Answers drawn from 209 expert videos</li><li><Icon name="check" />Citations that open the exact video moment</li><li><Icon name="check" />Access by invitation only</li></ul>
          <div className="aq"><q>Good advice should always show where it came from.</q><small>The DTS AI standard</small></div>
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
