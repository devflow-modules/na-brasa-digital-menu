"use client";

import { createContext, useContext, type ReactNode } from "react";

export type AdminNotificationChromeValue = {
  sessionActive: boolean;
  pendingCount: number;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
};

const AdminNotificationChromeContext =
  createContext<AdminNotificationChromeValue | null>(null);

export function AdminNotificationChromeProvider({
  value,
  children,
}: {
  value: AdminNotificationChromeValue;
  children: ReactNode;
}) {
  return (
    <AdminNotificationChromeContext.Provider value={value}>
      {children}
    </AdminNotificationChromeContext.Provider>
  );
}

export function useAdminNotificationChrome(): AdminNotificationChromeValue {
  const value = useContext(AdminNotificationChromeContext);
  if (!value) {
    return {
      sessionActive: false,
      pendingCount: 0,
      soundEnabled: false,
      setSoundEnabled: () => {},
    };
  }
  return value;
}
