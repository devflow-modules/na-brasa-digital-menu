"use client";

import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { pollNewAdminOrdersAction } from "@/features/admin/orders/actions/poll-new-admin-orders-action";
import { shouldStartAdminNotificationPolling } from "@/features/admin/orders/new-order-notifications/admin-login-route-gating";
import { NewOrderNotificationBanner } from "@/features/admin/orders/new-order-notifications/new-order-notification-banner";
import {
  applyPollFailure,
  applyPollSuccess,
  beginBootstrapping,
  buildPollInput,
  createInitialNotificationState,
  dismissNotificationBanner,
  markVisibilityPaused,
  markVisibilityResumed,
  type NewOrderNotificationControllerState,
} from "@/features/admin/orders/new-order-notifications/new-order-notification-controller";
import { AdminNotificationChromeProvider } from "@/features/admin/orders/new-order-notifications/admin-notification-chrome-context";
import {
  playNewOrderSound,
  readNewOrderSoundPreference,
  writeNewOrderSoundPreference,
} from "@/features/admin/orders/new-order-notifications/new-order-sound-preference";
import {
  requestAdminOrdersRefresh,
  resolveQueueRefreshAfterVisibilityPoll,
  resolveRefreshReasonAfterPoll,
  shouldRequestRefreshOnTabVisible,
} from "@/features/admin/orders/live-refresh/admin-orders-refresh";

type AdminNewOrderNotificationsProviderProps = {
  children: ReactNode;
};

const isDevInstrumentation =
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

export function AdminNewOrderNotificationsProvider({
  children,
}: AdminNewOrderNotificationsProviderProps) {
  const pathname = usePathname();
  const onLoginRoute = !shouldStartAdminNotificationPolling(pathname);

  const [state, setState] = useState<NewOrderNotificationControllerState>(() =>
    createInitialNotificationState(),
  );
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const [soundPlayCount, setSoundPlayCount] = useState(0);

  const stateRef = useRef(state);
  const soundEnabledRef = useRef(soundEnabled);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const sessionIdRef = useRef(0);
  /** After tab becomes visible, emit at most one queue refresh via the next poll. */
  const visibilityResumePendingRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Login stays under the shared admin layout. Client-side redirect after
    // login does not remount this provider, so polling must not start (and
    // permanently stop on UNAUTHORIZED) while still on /admin/login.
    if (onLoginRoute) {
      sessionIdRef.current += 1;
      inFlightRef.current = false;
      visibilityResumePendingRef.current = false;
      clearTimer();
      const idle = createInitialNotificationState();
      stateRef.current = idle;
      setState(idle);
      setSessionActive(false);
      return;
    }

    const sessionId = ++sessionIdRef.current;
    inFlightRef.current = false;
    visibilityResumePendingRef.current = false;
    setSoundEnabled(readNewOrderSoundPreference() === "on");

    const isCurrentSession = () => sessionIdRef.current === sessionId;

    const initial = beginBootstrapping(createInitialNotificationState());
    stateRef.current = initial;
    setState(initial);
    setSessionActive(false);

    const runPoll = async () => {
      if (!isCurrentSession() || inFlightRef.current) {
        return;
      }
      if (typeof document !== "undefined" && document.hidden) {
        return;
      }
      if (stateRef.current.stopPolling) {
        return;
      }

      inFlightRef.current = true;
      clearTimer();

      try {
        const input = buildPollInput(stateRef.current);
        const result = await pollNewAdminOrdersAction(input);

        if (!isCurrentSession()) {
          return;
        }

        let next: NewOrderNotificationControllerState;
        if (!result.ok) {
          next = applyPollFailure(stateRef.current, result.code);
          if (result.code === "UNAUTHORIZED" || result.code === "FORBIDDEN") {
            setSessionActive(false);
          }
          // Still refresh the queue once after visibility if the poll failed.
          if (visibilityResumePendingRef.current) {
            visibilityResumePendingRef.current = false;
            requestAdminOrdersRefresh("tab-visible");
          }
        } else {
          const previousPendingCount = stateRef.current.pendingCount;
          next = applyPollSuccess(stateRef.current, {
            mode: result.mode,
            cursor: result.cursor,
            orders: result.orders,
            pendingCount: result.pendingCount,
            hasMore: result.hasMore,
          });
          setSessionActive(true);

          const pollReason = resolveRefreshReasonAfterPoll({
            mode: result.mode,
            newOrderCount: result.orders.length,
            pendingCountChanged: result.pendingCount !== previousPendingCount,
          });
          const resolved = resolveQueueRefreshAfterVisibilityPoll({
            pollReason,
            visibilityResumePending: visibilityResumePendingRef.current,
          });
          visibilityResumePendingRef.current = resolved.visibilityResumePending;
          if (resolved.reason != null) {
            requestAdminOrdersRefresh(resolved.reason);
          }
        }

        stateRef.current = next;
        setState(next);

        const tabHidden =
          typeof document !== "undefined" && document.hidden;

        // Process state while hidden, but never play audio in background.
        if (
          !tabHidden &&
          next.soundQueue.length > 0 &&
          soundEnabledRef.current
        ) {
          for (let i = 0; i < next.soundQueue.length; i += 1) {
            if (!isCurrentSession()) {
              return;
            }
            const played = await playNewOrderSound();
            if (played && isDevInstrumentation) {
              setSoundPlayCount((count) => count + 1);
            }
          }
        }

        if (!isCurrentSession() || next.stopPolling) {
          return;
        }
        if (typeof document !== "undefined" && document.hidden) {
          return;
        }

        if (next.pollImmediately) {
          inFlightRef.current = false;
          await runPoll();
          return;
        }

        timerRef.current = setTimeout(() => {
          void runPoll();
        }, next.backoffMs);
      } catch {
        if (!isCurrentSession()) {
          return;
        }
        const next = applyPollFailure(stateRef.current, "UNEXPECTED_ERROR");
        stateRef.current = next;
        setState(next);
        if (visibilityResumePendingRef.current) {
          visibilityResumePendingRef.current = false;
          requestAdminOrdersRefresh("tab-visible");
        }
        if (
          !next.stopPolling &&
          !(typeof document !== "undefined" && document.hidden)
        ) {
          timerRef.current = setTimeout(() => {
            void runPoll();
          }, next.backoffMs);
        }
      } finally {
        if (isCurrentSession()) {
          inFlightRef.current = false;
        }
      }
    };

    void runPoll();

    const onVisibility = () => {
      if (!isCurrentSession()) {
        return;
      }
      if (document.hidden) {
        clearTimer();
        const paused = markVisibilityPaused(stateRef.current);
        stateRef.current = paused;
        setState(paused);
        return;
      }

      const resumed = markVisibilityResumed(stateRef.current);
      stateRef.current = resumed;
      setState(resumed);

      // Do not emit tab-visible here — wait for the resumed poll so a delta
      // (new-order / pendingCount) and visibility share a single refresh.
      const wantsVisibilityRefresh = shouldRequestRefreshOnTabVisible({
        becomingVisible: true,
        // Only after a successful bootstrap/session — never on login/idle.
        sessionActive: resumed.status === "active",
        onLoginRoute: false,
      });

      if (!resumed.stopPolling) {
        if (wantsVisibilityRefresh) {
          visibilityResumePendingRef.current = true;
        }
        void runPoll();
      } else if (wantsVisibilityRefresh) {
        requestAdminOrdersRefresh("tab-visible");
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      sessionIdRef.current += 1;
      clearTimer();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [clearTimer, onLoginRoute]);

  const handleDismiss = useCallback((orderId: string) => {
    const next = dismissNotificationBanner(stateRef.current, orderId);
    stateRef.current = next;
    setState(next);
  }, []);

  const handleSoundChange = useCallback(async (enabled: boolean) => {
    setSoundEnabled(enabled);
    soundEnabledRef.current = enabled;
    writeNewOrderSoundPreference(enabled ? "on" : "off");
    if (enabled) {
      // Explicit preview after user gesture (toggle on).
      const played = await playNewOrderSound();
      if (played && isDevInstrumentation) {
        setSoundPlayCount((count) => count + 1);
      }
    }
  }, []);

  return (
    <AdminNotificationChromeProvider
      value={{
        sessionActive,
        pendingCount: state.pendingCount,
        soundEnabled,
        setSoundEnabled: (enabled) => {
          void handleSoundChange(enabled);
        },
      }}
    >
      {isDevInstrumentation ? (
        <span
          className="sr-only"
          data-testid="admin-new-order-sound-play-count"
          data-sound-play-count={soundPlayCount}
        >
          {soundPlayCount}
        </span>
      ) : null}

      <NewOrderNotificationBanner
        banners={state.banners}
        onDismiss={handleDismiss}
      />

      {children}
    </AdminNotificationChromeProvider>
  );
}
