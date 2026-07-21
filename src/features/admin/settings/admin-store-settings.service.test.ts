import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ADMIN_PERMISSION_DENIED_MESSAGE } from "@/features/admin/auth/admin-permissions";
import { MODALITY_REQUIRED_MESSAGE } from "@/features/admin/settings/admin-store-settings.schema";
import { updateAdminStoreSettingsForTests } from "@/features/admin/settings/admin-store-settings.service";

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    whatsapp: "11999999999",
    address: "Rua Teste",
    openingHours: "18h–00h",
    deliveryFeeCents: "6,00",
    minimumOrderAmountCents: "30,00",
    pickupEnabled: true,
    deliveryEnabled: true,
    ...overrides,
  };
}

describe("updateAdminStoreSettingsForTests", () => {
  it("rejects OPERATOR without updating", async () => {
    const result = await updateAdminStoreSettingsForTests(
      validInput(),
      "store_unused",
      "OPERATOR",
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.message, ADMIN_PERMISSION_DENIED_MESSAGE);
  });

  it("rejects both modalities disabled before persistence", async () => {
    const result = await updateAdminStoreSettingsForTests(
      validInput({ pickupEnabled: false, deliveryEnabled: false }),
      "store_unused",
      "MANAGER",
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.message, MODALITY_REQUIRED_MESSAGE);
  });

  it("rejects negative minimum before persistence", async () => {
    const result = await updateAdminStoreSettingsForTests(
      validInput({ minimumOrderAmountCents: "-10" }),
      "store_unused",
      "MANAGER",
    );
    assert.equal(result.ok, false);
  });
});
