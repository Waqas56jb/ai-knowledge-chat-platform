import { Link } from 'react-router-dom';
import Icon from '../components/common/Icon';
import { BrandMark } from '../components/common/Logo';

export default function Legal({ kind }) {
  const P = kind === 'privacy';
  return (
    <>
      <header className="legal-top"><div><Link className="brand" to="/"><BrandMark size={28} /></Link><Link className="btn btn-sm btn-out" to="/"><Icon name="arrow-left" />Back to home</Link></div></header>
      <main id="main" className="legal">
        <h1>{P ? <>Privacy <em>Policy</em></> : <>Terms of <em>Service</em></>}</h1>
        <div className="alert warn" style={{ marginTop: 14 }}><Icon name="alert-triangle" /><span>Summary page. This is not legal advice and does not replace the finalized {P ? 'privacy policy' : 'terms of service'} of your organisation.</span></div>
        {P ? <>
          <h2>What is stored</h2><p>Your account profile, preferences, conversations and the feedback you give on answers are stored by the workspace server. Your sign-in session is kept in this browser.</p>
          <h2>Who can see it</h2><p>Your conversations are private to your account. Workspace administrators can review conversations for quality and support.</p>
          <h2>Removing your data</h2><p>You can delete individual conversations, or all of them from Settings, under Privacy and data. To close your account, contact a workspace administrator.</p>
        </> : <>
          <h2>Access</h2><p>Access is by invitation from a workspace administrator. Keep your password private; you are responsible for activity on your account.</p>
          <h2>Answers</h2><p>Answers are generated from the knowledge sources indexed in your workspace and cite them. Check important answers against the cited sources.</p>
          <h2>Acceptable use</h2><p>Use the workspace only for the purposes your organisation allows. Administrators may suspend accounts that misuse it.</p>
        </>}
      </main>
    </>
  );
}
