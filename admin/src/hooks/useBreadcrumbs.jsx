import { createContext, useContext, useEffect, useState } from 'react';

const Ctx = createContext({ labels: {}, setLabel: () => {} });

export function BreadcrumbProvider({ children }) {
  const [labels, setLabels] = useState({});
  const setLabel = (segment, label) => setLabels(l => (l[segment] === label ? l : { ...l, [segment]: label }));
  return <Ctx.Provider value={{ labels, setLabel }}>{children}</Ctx.Provider>;
}

export const useBreadcrumbLabels = () => useContext(Ctx).labels;

/**
 * Give a dynamic URL segment (an id) a readable crumb, e.g. on /admin/users/usr-002:
 *   useBreadcrumb('usr-002', user?.name)
 */
export function useBreadcrumb(segment, label) {
  const { setLabel } = useContext(Ctx);
  useEffect(() => { if (segment && label) setLabel(segment, label); }, [segment, label]); // eslint-disable-line react-hooks/exhaustive-deps
}
