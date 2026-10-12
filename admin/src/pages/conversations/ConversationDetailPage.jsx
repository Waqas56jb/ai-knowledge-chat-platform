import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, AlertTriangle, ClipboardCheck, Library, MessagesSquare } from 'lucide-react';
import { getConversationById } from '../../services/conversationService';
import { useQuery } from '../../hooks/useQuery';
import { useDocumentTitle } from '../../hooks/useMisc';
import { useBreadcrumb } from '../../hooks/useBreadcrumbs';
import { pluralize } from '../../utils/format';
import { Card, CardHeader } from '../../components/common/Card';
import { Tabs, TabPanel } from '../../components/common/Tabs';
import { Notice } from '../../components/common/Misc';
import { ErrorState, Skeleton } from '../../components/common/States';
import NotFoundPage from '../errors/NotFoundPage';
import ConversationHeader from '../../components/conversations/ConversationHeader';
import MessageTimeline from '../../components/conversations/MessageTimeline';
import ConversationSources from '../../components/conversations/ConversationSources';
import ConversationActivity from '../../components/conversations/ConversationActivity';
import ConversationReview from '../../components/conversations/ConversationReview';
import { aggregateSources, hasSourceIssue } from '../../components/conversations/citationUtils';

const TAB_PREFIX = 'conversation';

export default function ConversationDetailPage() {
  const { conversationId } = useParams();
  const { data: c, loading, error, reload } = useQuery(() => getConversationById(conversationId), [conversationId]);
  const [tab, setTab] = useState('messages');
  useBreadcrumb(conversationId, c?.title);
  useDocumentTitle(c ? c.title : 'Conversation');

  if (error) {
    if (error.status === 404 || error.status === 422) {
      return <NotFoundPage embedded title="Conversation not found" message="This conversation does not exist or was deleted by its owner." backTo="/admin/conversations" backLabel="Back to conversations" />;
    }
    return <Card><ErrorState error={error} onRetry={reload} /></Card>;
  }
  if (loading || !c || c.id !== conversationId) return <DetailSkeleton />;

  const sources = aggregateSources(c.messages);
  const flagged = sources.filter(s => hasSourceIssue(s.status));
  const tabs = [
    { id: 'messages', label: 'Messages', icon: MessagesSquare, count: c.messageCount },
    { id: 'sources', label: 'Sources', icon: Library, count: sources.length },
    { id: 'activity', label: 'Activity', icon: Activity, count: c.activity.length },
    { id: 'review', label: 'Review', icon: ClipboardCheck, count: c.reviewNotes.length }
  ];

  return (
    <>
      <ConversationHeader conversation={c} />
      <Notice title="Audited access" className="mb-6">
        Opening this conversation was recorded in the audit log. Review decisions and notes are visible to administrators only.
      </Notice>

      <Tabs tabs={tabs} value={tab} onChange={setTab} idPrefix={TAB_PREFIX} className="mb-6" />

      <TabPanel id="messages" value={tab} idPrefix={TAB_PREFIX}>
        {flagged.length > 0 && (
          <div role="status" className="mb-4 flex gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-[13px]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <p className="text-ink"><b className="font-semibold">{pluralize(flagged.length, 'cited source')} {flagged.length === 1 ? 'is' : 'are'} disabled, failed or deleted.</b> <span className="text-muted">Answers that rely on {flagged.length === 1 ? 'it' : 'them'} may be outdated. Consider marking the conversation for attention.</span></p>
          </div>
        )}
        <Card>
          <CardHeader title="Transcript" description="Read-only. User questions and assistant answers with their source citations." />
          <div className="p-4 sm:p-6"><MessageTimeline messages={c.messages} userName={c.userName} /></div>
        </Card>
      </TabPanel>
      <TabPanel id="sources" value={tab} idPrefix={TAB_PREFIX}><ConversationSources messages={c.messages} /></TabPanel>
      <TabPanel id="activity" value={tab} idPrefix={TAB_PREFIX}><ConversationActivity conversation={c} /></TabPanel>
      <TabPanel id="review" value={tab} idPrefix={TAB_PREFIX}><ConversationReview conversation={c} /></TabPanel>
    </>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading conversation" className="space-y-6">
      <div className="space-y-3"><Skeleton className="h-4 w-36" /><Skeleton className="h-8 w-96 max-w-full" /><Skeleton className="h-4 w-72 max-w-full" /></div>
      <Skeleton className="h-14 w-full rounded-xl" />
      <div className="flex gap-4 border-b border-line pb-3">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-5 w-20" />)}</div>
      <div className="card card-pad space-y-5">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex gap-3"><Skeleton className="h-8 w-8 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-16 w-full rounded-xl" /></div></div>
        ))}
      </div>
    </div>
  );
}
