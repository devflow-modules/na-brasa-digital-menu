"use client";

import { useEffect, useRef } from "react";
import { trackClientFunnelEvent } from "@/features/analytics/track-client-funnel-event";

type FunnelCheckoutStartedTrackerProps = {
  storeSlug: string;
};

/** Emits checkout_started once per mount (server dedupes per session). */
export function FunnelCheckoutStartedTracker({
  storeSlug,
}: FunnelCheckoutStartedTrackerProps) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackClientFunnelEvent({
      storeSlug,
      name: "checkout_started",
    });
  }, [storeSlug]);

  return null;
}
