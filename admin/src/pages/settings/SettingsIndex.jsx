import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { fetchServerSettings, getAppearance, resetServerSection, SERVER_SECTIONS } from '../../services/settingsService';
import { useAuth } from '../../hooks/useAuth';
import { useQuery } from '../../hooks/useQuery';
import { useDocumentTitle } from '../../hooks/useMisc';
import { VISIBILITY } from '../../constants/domain';
import { capitalize } from '../../utils/format';
import { Card, CardHeader } from '../../components/common/Card';
import Button from '../../components/common/Button';
import { ErrorState, Skeleton } from '../../components/common/States';
import { useConfirm } from '../../components/common/ConfirmDialog';
import { SETTINGS_SECTIONS } from '../../components/settings/sections';

/** One-line summary of each section's current values. */
function summaries(s, user, appearance) {
  return {
    profile: user ? [user.fullName, user.timezone, user.language].filter(Boolean).join(' · ') : '',
    platform: s ? `${s.platform.displayName} · ${s.platform.invitationOnly ? 'Invitation only' : 'Open registration'} · ${VISIBILITY[s.platform.defaultVisibility] || s.platform.defaultVisibility}` : null,
    knowledge: s ? `${s.knowledge.supportedTypes.length} source types · ${s.knowledge.chunkSize}/${s.knowledge.chunkOverlap} chunk/overlap · top ${s.knowledge.retrievalCount}` : null,
    security: s ? `${s.security.sessionTimeoutMinutes} min session · audit log: administrators` : null,
    domain_policy: s ? `${s.domain_policy.enforceScope ? 'Scope enforced' : 'Scope not enforced'} · ${s.domain_policy.blockedTopics.length} blocked topics` : null,
    chat: s ? `${s.chat.dailyQuestionLimitPerUser} questions/day · max ${s.chat.maxQuestionLength} chars` : null,
    appearance: `${capitalize(appearance.theme)} theme · ${appearance.sidebar} sidebar · ${appearance.density}`
  };
}

export default function SettingsIndex() {
  useDocumentTitle('Settings');
  const confirm = useConfirm();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const { data, loading, error, reload } = useQuery(fetchServerSettings, []);
  const sum = summaries(data, user, getAppearance());

  const resetAll = async () => {
    const ok = await confirm({ title: 'Reset all workspace settings?', message: 'Platform, knowledge, security, domain policy and chat limits return to their default values on the server. Your profile and appearance are not affected.', confirmLabel: 'Reset all settings', danger: true });
    if (!ok) return;
    setBusy(true);
    try {
      for (const section of SERVER_SECTIONS) await resetServerSection(section);
      toast.success('All workspace settings restored to defaults.');
    } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      {error && <Card><ErrorState error={error} onRetry={reload} title="Settings could not be loaded" /></Card>}
      <ul className="grid gap-4 sm:grid-cols-2">
        {SETTINGS_SECTIONS.map(s => (
          <li key={s.id}>
            <Link to={s.to} className="card card-pad group flex h-full items-start gap-4 transition hover:-translate-y-0.5 hover:border-primary/50 focus-visible:-translate-y-0.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-text"><s.icon className="h-[18px] w-[18px]" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-display text-[15px] font-semibold text-ink">{s.label}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-faint transition group-hover:translate-x-0.5 group-hover:text-primary-text" aria-hidden="true" />
                </span>
                <span className="mt-0.5 block text-[13px] text-muted">{s.description}</span>
                {sum[s.id] == null && loading
                  ? <Skeleton className="mt-3 h-7 w-full rounded-lg" />
                  : <span className="mt-3 block truncate rounded-lg bg-subtle px-2.5 py-1.5 text-[12px] text-muted" title={sum[s.id] || ''}>{sum[s.id] || '—'}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <Card>
        <CardHeader icon={SlidersHorizontal} title="Defaults" description="Restore the workspace configuration stored on the server." />
        <div className="divide-y divide-line">
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-ink">Reset all workspace settings</p>
              <p className="text-[13px] text-muted">Return platform, knowledge, security, domain policy and chat limits to their default values. Each reset is recorded in the audit log.</p>
            </div>
            <Button variant="danger-ghost" icon={SlidersHorizontal} loading={busy} disabled={busy || loading} onClick={resetAll} className="self-start sm:self-auto">Reset all settings</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
