import { useEffect, useRef, useState } from 'react';

/**
 * Table state for server-side pagination and sorting. Two steps, because the query needs the
 * paging params and the table needs the query's result:
 *
 *   const t = useServerTable({ pageSize: 10, sort: { key: 'createdAt', dir: 'desc' }, resetKey });
 *   const { data } = useQuery(() => getUsers({ ...filters, ...t.query }), [filters, t.query]);
 *   const table = t.bind(data?.rows, data?.meta);
 *
 * `table` has the same shape DataTable / Pagination expect: pageRows, total, sort, toggleSort, page,
 * setPage, pageCount, pageSize, setPageSize, selected, toggleRow, toggleAll, allSelected, someSelected,
 * clearSelection. Selection is per page and is cleared when the page, size, sort or filters change.
 */
export function useServerTable({ pageSize: initialSize = 10, sort: initialSort = null, resetKey } = {}) {
  const [sort, setSortState] = useState(initialSort);
  const [page, setPageState] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialSize);
  const [selected, setSelected] = useState(() => new Set());
  const pageCountRef = useRef(null);

  const clearSelection = () => setSelected(s => (s.size ? new Set() : s));
  useEffect(() => { setPageState(1); setSelected(new Set()); }, [resetKey]);
  // After deletions the current page can fall past the end: step back to the last page. Runs after
  // every render on purpose (the page count is only known once bind() has seen the response); it
  // converges because it only updates when page > pageCount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { const pc = pageCountRef.current; if (pc && page > pc) setPageState(pc); });

  const setPage = p => { setPageState(p); clearSelection(); };
  const setSort = s => { setSortState(s); setPageState(1); clearSelection(); };
  const toggleSort = key => setSort(sort && sort.key === key ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  const setPageSize = n => { setPageSizeState(n); setPageState(1); clearSelection(); };

  const query = { page, pageSize, ...(sort ? { sort: sort.key, dir: sort.dir } : {}) };

  const bind = (rows, meta) => {
    const list = rows || [];
    const total = meta?.total ?? list.length;
    const pageCount = meta?.pageCount ?? Math.max(1, Math.ceil(total / pageSize));
    pageCountRef.current = meta ? pageCount : null;
    const pageIds = list.map(r => r.id);
    const allSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));
    const someSelected = pageIds.some(id => selected.has(id)) && !allSelected;
    return {
      rows: list, pageRows: list, total,
      sort, setSort, toggleSort,
      page, setPage, pageCount, pageSize, setPageSize,
      selected,
      toggleRow: id => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
      toggleAll: () => setSelected(s => { const n = new Set(s); if (allSelected) pageIds.forEach(id => n.delete(id)); else pageIds.forEach(id => n.add(id)); return n; }),
      allSelected, someSelected, clearSelection
    };
  };

  return { query, bind, page, pageSize, sort };
}
