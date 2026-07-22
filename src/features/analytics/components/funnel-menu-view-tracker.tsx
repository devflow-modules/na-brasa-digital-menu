"use client";

import { useEffect, useRef } from "react";
import { trackClientFunnelEvent } from "@/features/analytics/track-client-funnel-event";

type FunnelMenuViewTrackerProps = {
  storeSlug: string;
};

/** Emits menu_viewed once per mount (server dedupes per session/day). */
export function FunnelMenuViewTracker({ storeSlug }: FunnelMenuViewTrackerProps) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackClientFunnelEvent({
      storeSlug,
      name: "menu_viewed",
    });
  }, [storeSlug]);

  return null;
}
