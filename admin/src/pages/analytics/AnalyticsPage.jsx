import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import DateRangeFilter from '../../components/common/DateRangeFilter';
import { Notice, ExportButton } from '../../components/common/Misc';
import { ErrorState } from '../../components/common/States';
import AnalyticsKpis from '../../components/analytics/AnalyticsKpis';
import { AnalyticsTrendCharts, ProcessingStatusCard, TopUsersCard } from '../../components/analytics/AnalyticsCharts';
import TopSourcesCard from '../../components/analytics/TopSourcesCard';
import { SourceDistributionCard, QueryOutcomeCard } from '../../components/dashboard/DashboardCharts';
import { exportAnalyticsCsv, downloadAnalyticsReport, rangeLabel } from '../../components/analytics/analyticsExport';
import { useQuery } from '../../hooks/useQuery';
import { useDocumentTitle } from '../../hooks/useMisc';
import { getAnalytics } from '../../services/analyticsService';

export default function AnalyticsPage() {
  useDocumentTitle('Analytics');
  const [range, setRange] = useState('30d');
  const rangeKey = JSON.stringify(range);
  const { data: a, loading, error, reload } = useQuery(() => getAnalytics(range), [rangeKey]);
  const busy = loading || !a;
  // Guard against showing the previous range's numbers while a new range loads.
  const stale = !!a && JSON.stringify(a.range) !== rangeKey;

  const downloadReport = () => {
    try {
      const name = downloadAnalyticsReport(a, range);
      toast.success('Report downloaded.', { description: name });
    } catch (err) {
      toast.error(err.message || 'The report could not be generated.');
    }
  };

  return (
    <>
      <PageHeader
        title="Analytics" accent="& Reports"
        description="Usage, answer quality and knowledge-base health over time. Export the visible data or download a summary report."
        actions={(
          <>
            <DateRangeFilter value={range} onChange={setRange} presets={['today', '7d', '30d', '90d']} allowCustom />
            <div className="flex flex-wrap gap-2 self-start sm:self-end">
              <ExportButton disabled={busy || stale} onExport={() => exportAnalyticsCsv(range)} />
              <Button variant="primary" icon={FileDown} disabled={busy || stale} onClick={downloadReport}>Download report</Button>
            </div>
          </>
        )}
      />

      <div className="space-y-6">
        {a && !busy && !error && (
          <Notice title="Period">
            Showing <b className="font-semibold text-ink">{rangeLabel(range, a)}</b>, compared with the preceding period of the same length.
          </Notice>
        )}

        {error ? (
          <Card><ErrorState title="Analytics could not be loaded" error={error} onRetry={reload} /></Card>
        ) : (
          <>
            <AnalyticsKpis analytics={a} loading={busy} />
            <AnalyticsTrendCharts analytics={a} loading={busy} />
            <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
              <SourceDistributionCard analytics={a} loading={busy} />
              <QueryOutcomeCard analytics={a} loading={busy} />
              <div className="flex flex-col lg:col-span-2 xl:col-span-1 [&>section]:flex-1">
                <ProcessingStatusCard analytics={a} loading={busy} />
              </div>
            </div>
            <div className="grid gap-6 xl:grid-cols-2">
              <TopUsersCard analytics={a} loading={busy} />
              <TopSourcesCard sources={a?.topSources} loading={busy} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
