import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

const ConfirmContext = createContext(null);

/**
 * Promise-based confirmation for destructive actions.
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'Delete user?', message: '...', confirmLabel: 'Delete', danger: true })) { ... }
 */
export function useConfirm() { return useContext(ConfirmContext); }

export function ConfirmProvider({ children }) {
  const [cfg, setCfg] = useState(null);
  const resolver = useRef(null);
  const cancelRef = useRef(null);

  const confirm = useCallback(options => new Promise(resolve => { resolver.current = resolve; setCfg(options); }), []);
  const close = useCallback(result => { if (resolver.current) resolver.current(result); resolver.current = null; setCfg(null); }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={!!cfg} onClose={() => close(false)} title={cfg?.title || ''} size="sm" initialFocusRef={cancelRef}
        footer={<>
          <Button ref={cancelRef} onClick={() => close(false)}>{cfg?.cancelLabel || 'Cancel'}</Button>
          <Button variant={cfg?.danger ? 'danger' : 'primary'} onClick={() => close(true)}>{cfg?.confirmLabel || 'Confirm'}</Button>
        </>}>
        <div className="flex gap-3">
          {cfg?.danger && <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-danger-soft text-danger"><AlertTriangle className="h-[18px] w-[18px]" aria-hidden="true" /></span>}
          <div className="text-[14px] text-muted">{cfg?.message}</div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
}
