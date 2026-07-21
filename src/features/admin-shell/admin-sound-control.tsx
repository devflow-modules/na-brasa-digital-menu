"use client";

import { useAdminNotificationChrome } from "@/features/admin/orders/new-order-notifications/admin-notification-chrome-context";
import { NewOrderSoundToggle } from "@/features/admin/orders/new-order-notifications/new-order-sound-toggle";

export function AdminSoundControl() {
  const { sessionActive, soundEnabled, setSoundEnabled } =
    useAdminNotificationChrome();

  if (!sessionActive) {
    return null;
  }

  return (
    <NewOrderSoundToggle enabled={soundEnabled} onChange={setSoundEnabled} />
  );
}
