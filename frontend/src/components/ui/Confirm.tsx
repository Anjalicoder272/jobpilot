"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

type ConfirmOptions = { title: string; description?: string; confirmLabel?: string; danger?: boolean };
type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

const ConfirmContext = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [open, setOpen] = useState(false);
  const last = useRef<Pending | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        last.current = { ...options, resolve };
        setPending(last.current);
        setOpen(true);
      }),
    [],
  );

  function settle(ok: boolean) {
    pending?.resolve(ok);
    setOpen(false);
  }

  const shown = pending ?? last.current;
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {shown && (
        <Dialog
          open={open}
          onClose={() => settle(false)}
          title={shown.title}
          description={shown.description}
          size="sm"
          footer={
            <>
              <Button variant="secondary" onClick={() => settle(false)}>
                Cancel
              </Button>
              <Button
                variant={shown.danger ? "destructive" : "primary"}
                onClick={() => settle(true)}
                data-autofocus
              >
                {shown.confirmLabel ?? "Confirm"}
              </Button>
            </>
          }
        >
          {null}
        </Dialog>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ctx;
}
