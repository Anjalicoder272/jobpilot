"use client";

import { ConfirmProvider } from "@/components/ui/Confirm";
import { ToastProvider } from "@/components/ui/Toast";
import { AuthProvider } from "@/lib/auth";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
