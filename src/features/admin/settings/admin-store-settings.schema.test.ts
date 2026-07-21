import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MODALITY_REQUIRED_MESSAGE,
  STORE_MONEY_MAX_CENTS,
  updateStoreSettingsSchema,
} from "@/features/admin/settings/admin-store-settings.schema";

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    whatsapp: "11999999999",
    address: "Rua A, 1",
    openingHours: "18h–00h",
    deliveryFeeCents: "6,00",
    minimumOrderAmountCents: "30,00",
    pickupEnabled: true,
    deliveryEnabled: true,
    ...overrides,
  };
}

describe("updateStoreSettingsSchema", () => {
  it("accepts minimum zero and converts reais with comma to cents", () => {
    const result = updateStoreSettingsSchema.safeParse(
      validInput({ minimumOrderAmountCents: "0", deliveryFeeCents: "12,50" }),
    );
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.minimumOrderAmountCents, 0);
    assert.equal(result.data.deliveryFeeCents, 1_250);
  });

  it("accepts positive minimum", () => {
    const result = updateStoreSettingsSchema.safeParse(
      validInput({ minimumOrderAmountCents: "45,90" }),
    );
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.minimumOrderAmountCents, 4_590);
  });

  it("rejects negative minimum", () => {
    const result = updateStoreSettingsSchema.safeParse(
      validInput({ minimumOrderAmountCents: "-1" }),
    );
    assert.equal(result.success, false);
  });

  it("rejects empty money as invalid", () => {
    const result = updateStoreSettingsSchema.safeParse(
      validInput({ minimumOrderAmountCents: "" }),
    );
    assert.equal(result.success, false);
  });

  it("rejects money above the store ceiling", () => {
    const over = (STORE_MONEY_MAX_CENTS + 1) / 100;
    const result = updateStoreSettingsSchema.safeParse(
      validInput({ minimumOrderAmountCents: String(over).replace(".", ",") }),
    );
    assert.equal(result.success, false);
    if (result.success) return;
    assert.match(result.error.issues[0]?.message ?? "", /10\.000/);
  });

  it("allows both modalities, pickup-only, and delivery-only", () => {
    assert.equal(
      updateStoreSettingsSchema.safeParse(validInput()).success,
      true,
    );
    assert.equal(
      updateStoreSettingsSchema.safeParse(
        validInput({ pickupEnabled: true, deliveryEnabled: false }),
      ).success,
      true,
    );
    assert.equal(
      updateStoreSettingsSchema.safeParse(
        validInput({ pickupEnabled: false, deliveryEnabled: true }),
      ).success,
      true,
    );
  });

  it("rejects both modalities disabled", () => {
    const result = updateStoreSettingsSchema.safeParse(
      validInput({ pickupEnabled: false, deliveryEnabled: false }),
    );
    assert.equal(result.success, false);
    if (result.success) return;
    assert.equal(result.error.issues[0]?.message, MODALITY_REQUIRED_MESSAGE);
  });

  it("strips unknown fields from the parsed output", () => {
    const result = updateStoreSettingsSchema.safeParse(
      validInput({ storeId: "evil", minimumOrderAmountCents: "10" }),
    );
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(
      "storeId" in result.data,
      false,
    );
    assert.equal(result.data.minimumOrderAmountCents, 1_000);
  });

  it("does not accept isOpen on permanent settings update payload", () => {
    const result = updateStoreSettingsSchema.safeParse(
      validInput({ isOpen: false }),
    );
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal("isOpen" in result.data, false);
  });

  it("accepts formatted WhatsApp and persists digits only", () => {
    const result = updateStoreSettingsSchema.safeParse(
      validInput({ whatsapp: "+55 (13) 98109-1971" }),
    );
    assert.equal(result.success, true);
    if (!result.success) return;
    assert.equal(result.data.whatsapp, "5513981091971");
  });
});
