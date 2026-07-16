import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseNewOrderSoundPreference,
  playNewOrderSound,
} from "@/features/admin/orders/new-order-notifications/new-order-sound-preference";

describe("new-order-sound-preference", () => {
  it("defaults invalid values to off", () => {
    assert.equal(parseNewOrderSoundPreference(null), "off");
    assert.equal(parseNewOrderSoundPreference(undefined), "off");
    assert.equal(parseNewOrderSoundPreference(""), "off");
    assert.equal(parseNewOrderSoundPreference("yes"), "off");
    assert.equal(parseNewOrderSoundPreference("on"), "on");
  });

  it("playNewOrderSound returns true on success and false on failure", async () => {
    const ok = await playNewOrderSound(() => ({
      play: async () => undefined,
    }));
    assert.equal(ok, true);

    const failed = await playNewOrderSound(() => ({
      play: async () => {
        throw new Error("NotAllowedError");
      },
    }));
    assert.equal(failed, false);
  });
});
