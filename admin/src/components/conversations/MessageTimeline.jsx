import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bot, Quote } from 'lucide-react';
import { cn } from '../../utils/cn';
import { formatDateTime, formatTime, pluralize } from '../../utils/format';
import Avatar from '../common/Avatar';
import StatusBadge from '../common/StatusBadge';
import { OUTCOMES } from '../../constants/domain';
import CitationCard from './CitationCard';
import { citationDomId, hasSourceIssue, splitCitations } from './citationUtils';

/**
 * Read-only transcript for administrative review: user questions and assistant answers.
 * [n] markers in answers are buttons that scroll to and highlight the matching citation.
 */
export default function MessageTimeline({ messages, userName }) {
  const [active, setActive] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  const jumpTo = (messageId, n) => {
    const el = document.getElementById(citationDomId(messageId, n));
    if (!el) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    el.focus({ preventScroll: true });
    setActive(`${messageId}:${n}`);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setActive(null), 2400);
  };

  return (
    <ol className="space-y-5" aria-label="Conversation messages">
      {messages.map(m => (m.role === 'user'
        ? <UserMessage key={m.id} message={m} userName={userName} />
        : <AssistantMessage key={m.id} message={m} active={active} onJump={jumpTo} />))}
    </ol>
  );
}

function Timestamp({ at }) {
  return <time dateTime={at} title={formatDateTime(at)} className="text-[12px] text-faint">{formatTime(at)}</time>;
}

function UserMessage({ message, userName }) {
  return (
    <li className="flex gap-3">
      <Avatar name={userName} size="sm" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-ink">{userName}</span>
          <span className="text-[12px] text-muted">asked</span>
          <Timestamp at={message.at} />
        </div>
        <p className="mt-1.5 inline-block max-w-full whitespace-pre-line rounded-2xl rounded-tl-md bg-subtle px-4 py-2.5 text-[14px] text-ink">{message.text}</p>
      </div>
    </li>
  );
}

function AssistantMessage({ message, active, onJump }) {
  const byN = new Map(message.citations.map(c => [c.n, c]));
  const issues = message.citations.filter(c => hasSourceIssue(c.sourceStatus)).length;
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary-text" aria-hidden="true"><Bot className="h-4 w-4" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-ink">Assistant</span>
          {message.outcome && message.outcome !== 'answered' && <StatusBadge status={message.outcome} label={OUTCOMES[message.outcome]} />}
          {message.feedback && message.feedback.rating && <span className={message.feedback.rating === 'up' ? 'badge badge-success' : 'badge badge-danger'} title={message.feedback.comment || undefined}>{message.feedback.rating === 'up' ? 'Helpful' : 'Not helpful'}</span>}
          <Timestamp at={message.at} />
        </div>
        <div className="mt-1.5 rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3 shadow-card">
          <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink">
            {splitCitations(message.text).map((p, i) => (p.n == null ? <span key={i}>{p.text}</span> : (
              <CitationMarker key={i} n={p.n} citation={byN.get(p.n)} onClick={() => onJump(message.id, p.n)} />
            )))}
          </p>
          {message.citations.length > 0 ? (
            <div className="mt-3 border-t border-line pt-3">
              <p className="mb-2 flex flex-wrap items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-faint">
                <Quote className="h-3.5 w-3.5" aria-hidden="true" />{pluralize(message.citations.length, 'source citation')}
                {issues > 0 && <span className="badge badge-warning normal-case tracking-normal"><AlertTriangle aria-hidden="true" />{pluralize(issues, 'flagged source')}</span>}
              </p>
              <ul className="space-y-2">
                {message.citations.map(c => <CitationCard key={c.n} messageId={message.id} citation={c} highlighted={active === `${message.id}:${c.n}`} />)}
              </ul>
            </div>
          ) : (
            <p className="mt-3 border-t border-line pt-3 text-[12.5px] text-muted">No source citations were attached to this response.</p>
          )}
        </div>
      </div>
    </li>
  );
}

function CitationMarker({ n, citation, onClick }) {
  if (!citation) return <sup className="mx-0.5 text-[11px] text-faint">[{n}]</sup>;
  const issue = hasSourceIssue(citation.sourceStatus);
  return (
    <button type="button" onClick={onClick} title={citation.sourceTitle}
      aria-label={`Citation ${n}: ${citation.sourceTitle}${issue ? ' (flagged source)' : ''}. Show citation.`}
      className={cn('mx-0.5 inline-grid h-[18px] min-w-[18px] -translate-y-px place-items-center rounded px-1 align-middle font-mono text-[11px] font-semibold transition',
        issue ? 'bg-warning-soft text-warning hover:ring-2 hover:ring-warning/30' : 'bg-primary-soft text-primary-text hover:ring-2 hover:ring-primary/30')}>
      {n}
    </button>
  );
}
