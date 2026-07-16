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
import { NewOrderPendingBadge } from "@/features/admin/orders/new-order-notifications/new-order-pending-badge";
import {
  playNewOrderSound,
  readNewOrderSoundPreference,
  writeNewOrderSoundPreference,
} from "@/features/admin/orders/new-order-notifications/new-order-sound-preference";
import { NewOrderSoundToggle } from "@/features/admin/orders/new-order-notifications/new-order-sound-toggle";

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
      clearTimer();
      const idle = createInitialNotificationState();
      stateRef.current = idle;
      setState(idle);
      setSessionActive(false);
      return;
    }

    const sessionId = ++sessionIdRef.current;
    inFlightRef.current = false;
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
        } else {
          next = applyPollSuccess(stateRef.current, {
            mode: result.mode,
            cursor: result.cursor,
            orders: result.orders,
            pendingCount: result.pendingCount,
            hasMore: result.hasMore,
          });
          setSessionActive(true);
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
      if (!resumed.stopPolling) {
        void runPoll();
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
    <>
      {isDevInstrumentation ? (
        <span
          className="sr-only"
          data-testid="admin-new-order-sound-play-count"
          data-sound-play-count={soundPlayCount}
        >
          {soundPlayCount}
        </span>
      ) : null}

      {sessionActive ? (
        <div
          className="sticky top-0 z-40 border-b border-stone-800 bg-stone-950/90 px-3 py-2 backdrop-blur sm:px-4"
          data-testid="admin-new-order-chrome"
        >
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
            {state.pendingCount > 0 ? (
              <NewOrderPendingBadge
                pendingCount={state.pendingCount}
                visible={sessionActive}
              />
            ) : (
              <span className="text-sm text-stone-400">Pendentes</span>
            )}
            <NewOrderSoundToggle
              enabled={soundEnabled}
              onChange={(value) => {
                void handleSoundChange(value);
              }}
            />
          </div>
        </div>
      ) : null}

      <NewOrderNotificationBanner
        banners={state.banners}
        onDismiss={handleDismiss}
      />

      {children}
    </>
  );
}
