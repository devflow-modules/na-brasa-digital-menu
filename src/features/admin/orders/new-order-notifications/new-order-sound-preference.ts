export const NEW_ORDER_SOUND_STORAGE_KEY = "admin.newOrderSound";

export type NewOrderSoundPreference = "on" | "off";

export function parseNewOrderSoundPreference(
  raw: string | null | undefined,
): NewOrderSoundPreference {
  if (raw === "on") {
    return "on";
  }
  return "off";
}

export function readNewOrderSoundPreference(): NewOrderSoundPreference {
  if (typeof window === "undefined") {
    return "off";
  }

  try {
    return parseNewOrderSoundPreference(
      window.localStorage.getItem(NEW_ORDER_SOUND_STORAGE_KEY),
    );
  } catch {
    return "off";
  }
}

export function writeNewOrderSoundPreference(
  value: NewOrderSoundPreference,
): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(NEW_ORDER_SOUND_STORAGE_KEY, value);
  } catch {
    // Restricted storage — ignore.
  }
}

export const NEW_ORDER_SOUND_SRC = "/sounds/new-order.wav";

/**
 * Plays the local new-order cue. Failures are swallowed for UI resilience.
 * Returns whether play() was invoked successfully (resolved promise).
 */
export async function playNewOrderSound(
  createAudio: () => { play: () => Promise<void> } = () =>
    new Audio(NEW_ORDER_SOUND_SRC),
): Promise<boolean> {
  try {
    const audio = createAudio();
    await audio.play();
    return true;
  } catch {
    return false;
  }
}
