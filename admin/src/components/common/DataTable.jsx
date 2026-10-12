import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '../../utils/cn';
import { EmptyState, TableSkeleton } from './States';

/**
 * Responsive data table. Above `md` it is a real <table>; below it renders each row as a card
 * (no horizontal scrolling on phones).
 *
 * columns: [{
 *   key, header, render?: row => node, sortable?: bool, className?, headerClassName?,
 *   mobile?: 'primary' | 'secondary' | 'hidden'   // how the column appears in the card view (default: label/value row)
 * }]
 * table: the object from useServerTable().bind() — provides sort, selection. Optional.
 * rowActions?: row => node (rendered in the last column / card corner)
 */
export default function DataTable({ columns, rows, table, loading = false, selectable = false, onRowClick, rowActions, empty, caption, getRowLabel = r => r.name || r.title || r.email || r.id, dense = false }) {
  const sort = table?.sort;
  if (loading && !rows?.length) return <TableSkeleton cols={Math.min(columns.length, 6)} />;
  if (!rows?.length) return empty || <EmptyState title="Nothing to show" description="No records match the current filters." />;

  const primary = columns.find(c => c.mobile === 'primary') || columns[0];
  const secondary = columns.filter(c => c.mobile === 'secondary');
  const rest = columns.filter(c => c !== primary && !secondary.includes(c) && c.mobile !== 'hidden');
  const cell = (c, r) => (c.render ? c.render(r) : r[c.key] ?? '—');
  const clickable = !!onRowClick;
  const onKey = (e, r) => { if (clickable && (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); onRowClick(r); } };

  return (
    <>
      {/* desktop / tablet */}
      <div className="hidden overflow-x-auto md:block">
        <table className="table">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {selectable && (
                <th className="w-10 pr-0">
                  <input type="checkbox" className="checkbox" aria-label="Select all rows on this page" checked={table.allSelected}
                    ref={el => { if (el) el.indeterminate = table.someSelected; }} onChange={table.toggleAll} />
                </th>
              )}
              {columns.map(c => (
                <th key={c.key} scope="col" className={c.headerClassName} aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {c.sortable && table ? (
                    <button type="button" className="-ml-1 inline-flex items-center gap-1 rounded px-1 uppercase tracking-wide hover:text-ink" onClick={() => table.toggleSort(c.key)}>
                      {c.header}
                      {sort?.key === c.key ? (sort.dir === 'asc' ? <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />) : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden="true" />}
                    </button>
                  ) : c.header}
                </th>
              ))}
              {rowActions && <th className="w-12"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className={cn(clickable && 'cursor-pointer', table?.selected.has(r.id) && 'bg-primary-soft/40')}
                onClick={clickable ? () => onRowClick(r) : undefined} onKeyDown={e => onKey(e, r)} tabIndex={clickable ? 0 : undefined}>
                {selectable && (
                  <td className="w-10 pr-0" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" className="checkbox" aria-label={`Select ${getRowLabel(r)}`} checked={table.selected.has(r.id)} onChange={() => table.toggleRow(r.id)} />
                  </td>
                )}
                {columns.map(c => <td key={c.key} className={cn(dense && 'py-2', c.className)}>{cell(c, r)}</td>)}
                {rowActions && <td className="w-12 text-right" onClick={e => e.stopPropagation()}>{rowActions(r)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* phone: stacked cards */}
      <ul className="divide-y divide-line md:hidden" aria-label={caption}>
        {rows.map(r => (
          <li key={r.id} className={cn('relative px-4 py-3.5', table?.selected.has(r.id) && 'bg-primary-soft/40')}>
            <div className="flex items-start gap-3">
              {selectable && <input type="checkbox" className="checkbox mt-1" aria-label={`Select ${getRowLabel(r)}`} checked={table.selected.has(r.id)} onChange={() => table.toggleRow(r.id)} />}
              <div className="min-w-0 flex-1">
                {clickable
                  ? <button type="button" className="block w-full min-w-0 text-left" onClick={() => onRowClick(r)}>{cell(primary, r)}</button>
                  : cell(primary, r)}
                {secondary.length > 0 && <div className="mt-1.5 flex flex-wrap items-center gap-2">{secondary.map(c => <span key={c.key}>{cell(c, r)}</span>)}</div>}
                {rest.length > 0 && (
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12.5px]">
                    {rest.map(c => <div key={c.key} className="min-w-0"><dt className="text-faint">{c.header}</dt><dd className="truncate text-ink">{cell(c, r)}</dd></div>)}
                  </dl>
                )}
              </div>
              {rowActions && <div className="-mr-1.5 -mt-1">{rowActions(r)}</div>}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
