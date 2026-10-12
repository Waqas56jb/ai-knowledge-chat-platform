import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { sourceService } from '../../services/sourceService';
import { TYPE_LABEL } from '../../data/config';
import { fmtDate } from '../../utils/format';
import Icon from '../common/Icon';
import { StatusBadge, TypeBadge } from '../common/ui';

/** Right-hand drawer with the cited excerpt. `panel` = a Citation ({ n, sourceId, sourceTitle, sourceType, excerpt, timestamp, pageNumber, url }). */
export default function SourcePanel({ panel, onClose }) {
  const ref = useRef(null);
  const [src, setSrc] = useState({ id: null, data: null, error: null });
  useEffect(() => { const b = ref.current && ref.current.querySelector('button'); b && b.focus(); }, [panel]);

  const sid = panel && panel.sourceId;
  useEffect(() => {
    if (!sid) return;
    let alive = true;
    setSrc(s => (s.id === sid ? s : { id: sid, data: null, error: null }));
    sourceService.get(sid).then(d => alive && setSrc({ id: sid, data: d, error: null })).catch(e => alive && setSrc({ id: sid, data: null, error: e }));
    return () => { alive = false; };
  }, [sid]);

  if (!panel) return null;
  const s = src.id === sid ? src.data : null;
  const loc = panel.timestamp || (panel.pageNumber ? 'Page ' + panel.pageNumber : '');
  return (
    <div ref={ref}>
      <div className="sp-h"><h2>Source {panel.n}</h2><button className="icon-btn sm" onClick={onClose} aria-label="Close source panel"><Icon name="x" /></button></div>
      <div className="row gap8 wrap"><TypeBadge s={s || { type: panel.sourceType }} />{s && <StatusBadge s={s} />}</div>
      <h3>{panel.sourceTitle}</h3>
      {s && s.description && <p className="muted" style={{ fontSize: 14 }}>{s.description}</p>}
      {!s && !src.error && <div className="skel" style={{ height: 16, width: '70%', margin: '6px 0' }} />}
      {src.error && <p className="muted" style={{ fontSize: 13.5 }}>{src.error.status === 404 || src.error.status === 403 ? 'This source is no longer available to you.' : src.error.message}</p>}
      {panel.excerpt && <div className="quote">"{panel.excerpt}"</div>}
      <dl className="kv">
        <dt>Type</dt><dd>{TYPE_LABEL[panel.sourceType] || panel.sourceType}</dd>
        {s && s.channelName && <><dt>Channel</dt><dd>{s.channelName}</dd></>}
        {s && s.file && s.file.name && <><dt>File</dt><dd>{s.file.name}</dd></>}
        {loc && <><dt>{panel.timestamp ? 'Timestamp' : 'Location'}</dt><dd>{loc}</dd></>}
        {s && s.chunkCount != null && <><dt>Indexed passages</dt><dd>{s.chunkCount}</dd></>}
        {s && <><dt>Added</dt><dd>{fmtDate(s.createdAt)}</dd></>}
      </dl>
      <div style={{ display: 'grid', gap: 8 }}>
        <Link className="btn btn-pri btn-sm" to={`/app/sources/${panel.sourceId}`}>Open full source</Link>
        {panel.url && <a className="btn btn-out btn-sm" href={panel.url} target="_blank" rel="noopener noreferrer"><Icon name="external-link" />{panel.timestamp ? `Open on YouTube at ${panel.timestamp}` : 'Open original'}</a>}
      </div>
    </div>
  );
}
