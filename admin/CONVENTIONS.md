# Admin frontend conventions

How pages in `admin/` are built. Follow these so every screen looks and behaves the same.

## Golden rules

1. **Data only through services.** Every record comes from the API via `src/services/*Service.js` (which call `services/api.js`). Pages never call `fetch` directly and never keep records in `localStorage`. Read with `useQuery(() => service.getX(filters), [filtersKey])`; change with the async service functions. Enums and labels that mirror the API contract live in `src/constants/domain.js` (`ROLES`, `SOURCE_TYPES`, `JOB_TYPES`, `REVIEW_STATUSES`, `OUTCOMES`, `AUDIT_ACTIONS`, `VISIBILITY` …).
2. **Mutations go to the API**, which authorizes them and writes the audit log; every mounted `useQuery` refetches automatically after a successful mutation. After a mutation: `toast.success('…')` (from `sonner`); on error: `toast.error(err.message)` — server messages (e.g. the last-admin guard) are shown as-is.
3. **Destructive actions** (delete, revoke, suspend, disable, cancel, reset) always go through `const confirm = useConfirm(); if (!(await confirm({ title, message, confirmLabel, danger: true }))) return;`.
4. **Be precise about what happened.** For example invitations are not emailed — say so (`<Notice>`) and show the one-time link. Long-running work (processing) is shown with live status by polling (`useQuery(..., { refetchInterval })`).
5. **Every primary button does something real** (navigate, open a modal, call the API, export, copy).
6. **Responsive down to 360px.** Use `DataTable` (turns into cards on phones), `grid` with `sm:`/`lg:` breakpoints, `flex-wrap` on button rows. No horizontal page scroll.
7. **Accessibility.** Real `<button>`/`<a>`; icon-only buttons use `IconButton` with a `label`; form controls use `FormField`; loading shows skeletons; errors show `ErrorState` with retry.

## Page skeleton

```jsx
import { useMemo, useState } from 'react';
import { Users, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import PageHeader from '../../components/common/PageHeader';
import Button from '../../components/common/Button';
import { Card, CardHeader } from '../../components/common/Card';
import DataTable from '../../components/common/DataTable';
import Pagination from '../../components/common/Pagination';
import { FilterBar, SearchInput, FilterSelect } from '../../components/common/Filters';
import { ErrorState, PageSkeleton } from '../../components/common/States';
import { useQuery } from '../../hooks/useQuery';
import { useServerTable } from '../../hooks/useTable';
import { useDebounce, useDocumentTitle } from '../../hooks/useMisc';

export default function UsersPage() {
  useDocumentTitle('Users');
  const [q, setQ] = useState(''); const dq = useDebounce(q);
  const [status, setStatus] = useState('all');
  const filters = { q: dq, status };
  const key = JSON.stringify(filters);
  const t = useServerTable({ pageSize: 10, sort: { key: 'createdAt', dir: 'desc' }, resetKey: key });
  const { data, loading, error, reload } = useQuery(() => getUsers({ ...filters, ...t.query }), [key, t.query]);
  const table = t.bind(data?.rows, data?.meta);
  if (error) return <Card><ErrorState error={error} onRetry={reload} /></Card>;
  return (<>
    <PageHeader title="Users" description="…" actions={<Button variant="primary" icon={UserPlus}>Invite user</Button>} />
    <Card>
      <FilterBar active={!!q || status !== 'all'} onClear={() => { setQ(''); setStatus('all'); }}>
        <SearchInput value={q} onChange={setQ} placeholder="Search users" />
        <FilterSelect label="Status" value={status} onChange={setStatus} options={[['all','All statuses'],['active','Active']]} />
      </FilterBar>
      <DataTable columns={columns} rows={table.pageRows} table={table} loading={loading} selectable onRowClick={r => navigate(`/admin/users/${r.id}`)} rowActions={r => <DropdownMenu …/>} />
      <Pagination table={table} label="users" />
    </Card>
  </>);
}
```

## Building blocks (src/components/common)

| Component | Use |
|---|---|
| `PageHeader({ title, accent?, description, actions, meta })` | Top of every page. `accent` = gold serif word. |
| `Card({ padded })`, `CardHeader({ title, description, actions, icon })`, `DescriptionList({ items: [[label, value]], columns })` | Surfaces and details. |
| `Button({ variant: primary/secondary/ghost/danger/danger-ghost, size: sm/md/lg, icon, loading, as, to })`, `IconButton({ icon, label })` | Actions. One `primary` per area. |
| `StatCard({ label, value, delta, icon, hint, invert, suffix, to, loading })` | KPIs. |
| `ChartCard({ title, description, height, loading, empty, actions })` + `CHART_COLORS`, `AXIS`, `ChartTooltip`, `ChartLegend` | Recharts wrappers with loading and empty states. Use `<ResponsiveContainer>` inside. |
| `DataTable({ columns, rows, table, loading, selectable, onRowClick, rowActions, empty, caption })` | Columns: `{ key, header, render, sortable, mobile: 'primary'/'secondary'/'hidden', className }`. |
| `useServerTable({ pageSize, sort, resetKey })` → `t.query` + `t.bind(rows, meta)`; `Pagination({ table, label })` | Server-side page / sort (`meta.total`, `meta.pageCount`); selection per page. `table.selected` is a Set of ids. |
| `FilterBar({ active, onClear, right })`, `SearchInput`, `FilterSelect({ label, value, onChange, options })` | Filter rows. |
| `StatusBadge({ status })`, `InfoBadge` | All status pills (user, invitation, source, job, review, outcome, audit result). |
| `Avatar({ name, size, gold })`, `UserAvatar({ user, showEmail })` | People. |
| `DropdownMenu({ trigger, items: [{ label, icon, onClick, to, href, danger, divider, disabled }], align, placement, label })` | Row actions & menus. |
| `Modal({ open, onClose, title, description, footer, size })` | Dialogs. |
| `useConfirm()` (from `ConfirmDialog`) | Promise-based confirmation. |
| `Tabs({ tabs: [{ id, label, count, icon }], value, onChange })`, `TabPanel`, `Segmented({ options: [[v, label, Icon]], value, onChange, label })` | Tabs and toggles. |
| `EmptyState`, `ErrorState`, `Skeleton`, `TableSkeleton`, `PageSkeleton` | States. |
| `DateRangeFilter({ value, onChange, presets, allowCustom, bounds })` | `'today'|'7d'|'30d'|'90d'|{from,to}`. |
| `ExportButton({ onExport })` | `onExport` may be async; use the service's `exportX(filters)` (server `?format=csv` via `downloadCsv` in `services/api.js`). |
| `CopyButton({ text, label, iconOnly })`, `Notice`, `ProgressBar({ value, tone })`, `SourceTypeIcon({ type })`, `ActivityTimeline({ items })` | Misc (in `Misc.jsx`). |
| `FormField({ label, error, help, required, optional })` + `Input`, `Textarea`, `Select({ options })`, `Checkbox`, `Switch` (in `components/forms/FormField.jsx`) | Forms. Use `react-hook-form` + `zodResolver` for real forms (see `pages/auth/LoginPage.jsx`, `utils/validation.js`). |

Hooks: `useQuery`, `useMutation`, `useDataVersion` (`hooks/useQuery.js`); `useServerTable`; `useDebounce`, `useDocumentTitle`, `useEscape`, `useClickOutside`, `useMediaQuery`, `copyText` (`hooks/useMisc.js`); `useBreadcrumb(segmentId, label)` on detail pages; `useAuth()`.

Utils: `formatDate`, `formatDateTime`, `relativeTime`, `formatNumber`, `formatBytes`, `formatDuration`, `formatPercent`, `capitalize`, `pluralize` (`utils/format.js`); `cn`; `downloadCsv`, `downloadFile`, `toCsv` (`utils/csv.js`).

## Visual language

- Tailwind with tokens: `bg-bg`, `bg-surface`, `bg-subtle`, `border-line`, `text-ink`, `text-muted`, `text-faint`, `text-primary-text`, `bg-primary-soft`, `success/warning/danger/info` (+ `-soft`). Never hard-code hex colours in pages (dark mode depends on tokens).
- Component classes in `styles/index.css`: `card`, `card-pad`, `btn*`, `input`, `select`, `textarea`, `label`, `badge*`, `table`, `link`, `kbd`.
- Page rhythm: `PageHeader`, then KPI grid `grid gap-4 sm:grid-cols-2 xl:grid-cols-4` (or 3/5/6 as needed), then cards with `space-y-6` / `gap-6`.
- Restraint: one gold primary button per area, neutral cards, colour only for meaning (status). The serif gold accent is for page titles only.
- Icons: `lucide-react`, 16–18px.

## Detail pages

- Read the id with `useParams()`; on a 404 (`error.status === 404`) render `<NotFoundPage embedded title="User not found" message="…" backTo="/admin/users" backLabel="Back to users" />` (from `pages/errors/NotFoundPage`).
- Call `useBreadcrumb(id, entity?.name)` so the header crumb shows a name.
- Header: back link, title, status badges, primary actions; body: `Tabs` + cards.

## Routes

Defined in `src/routes/AppRoutes.jsx` (already wired). Pages live in `src/pages/<section>/`. Section-specific components go in `src/components/<section>/`.
