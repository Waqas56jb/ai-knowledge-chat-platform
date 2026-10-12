import { Link } from 'react-router-dom';
import { ClipboardCheck, MessageSquarePlus, MessagesSquare, ScrollText, Activity } from 'lucide-react';
import { actionLabel } from '../../services/auditService';
import { Card, CardHeader } from '../common/Card';
import { ActivityTimeline } from '../common/Misc';
import Button from '../common/Button';

const ICONS = { 'conversation.reviewed': [ClipboardCheck, 'primary'], 'conversation.note_added': [MessageSquarePlus, 'info'], 'conversation.viewed': [ScrollText, 'neutral'] };

/** Administrative activity on this conversation (from the audit log) plus when it started. */
export default function ConversationActivity({ conversation }) {
  const items = [
    ...conversation.activity.map(a => {
      const [icon, tone] = ICONS[a.action] || [Activity, 'neutral'];
      return { id: a.id, icon, tone: a.result === 'failure' ? 'danger' : tone, title: actionLabel(a.action), description: [a.description, a.actorName].filter(Boolean).join(' · '), at: a.at };
    }),
    { id: 'started', icon: MessagesSquare, tone: 'neutral', title: 'Conversation started', description: `${conversation.userName} started the conversation.`, at: conversation.createdAt }
  ].sort((a, b) => new Date(b.at) - new Date(a.at));

  return (
    <Card>
      <CardHeader title="Activity" description="Administrative actions on this conversation, from the audit log."
        actions={<Button as={Link} size="sm" variant="ghost" icon={ScrollText} to={`/admin/audit?entity=conversation&entityId=${encodeURIComponent(conversation.id)}`}>Open in audit logs</Button>} />
      <div className="p-4 sm:p-5"><ActivityTimeline items={items} /></div>
    </Card>
  );
}
