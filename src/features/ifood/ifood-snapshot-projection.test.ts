import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  buildIfoodOperationalOrderCode,
  projectIfoodSnapshotToOrderDraft,
  reaisToCents,
} from "@/features/ifood/ifood-snapshot-projection";

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures/ifood-order-snapshot.sanitized.json",
);

describe("projectIfoodSnapshotToOrderDraft", () => {
  it("projects allowlisted fields and keeps official total over item sums", () => {
    const snapshot = JSON.parse(readFileSync(fixturePath, "utf8"));
    const draft = projectIfoodSnapshotToOrderDraft(snapshot);

    assert.equal(draft.customerName, "Cliente Fixture");
    assert.equal(draft.customerPhone, "11999990000");
    assert.equal(draft.deliveryType, "DELIVERY");
    assert.match(draft.deliveryAddress ?? "", /Rua Exemplo/);
    assert.match(draft.notes ?? "", /Portão azul/);
    assert.match(draft.notes ?? "", /Sem cebola/);
    assert.equal(draft.displayId, "5823");
    assert.equal(draft.subtotalCents, reaisToCents(56.5));
    assert.equal(draft.deliveryFeeCents, reaisToCents(5));
    // Official orderAmount (53) wins even when items + fees reconstruct higher.
    assert.equal(draft.totalCents, reaisToCents(53));

    assert.equal(draft.items.length, 1);
    const item = draft.items[0]!;
    assert.equal(item.productId, null);
    assert.equal(item.productNameSnapshot, "X-Burguer Fixture");
    assert.equal(item.quantity, 2);
    assert.equal(item.unitPriceCents, reaisToCents(25.5));
    assert.equal(item.totalCents, reaisToCents(51));
    assert.equal(item.addons.length, 2);
    assert.equal(item.addons[0]!.addonId, null);
    assert.equal(item.addons[0]!.addonNameSnapshot, "Bacon");
    assert.equal(item.addons[1]!.addonNameSnapshot, "Molho especial");
  });

  it("rejects non-FOOD category", () => {
    assert.throws(
      () =>
        projectIfoodSnapshotToOrderDraft({
          category: "GROCERY",
          orderType: "DELIVERY",
          customer: { name: "X" },
          total: { orderAmount: 10 },
          items: [{ name: "Y", quantity: 1, unitPrice: 10, totalPrice: 10 }],
        }),
      /not projectable/i,
    );
  });

  it("builds deterministic unique operational code", () => {
    assert.equal(
      buildIfoodOperationalOrderCode("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"),
      "IF-AAAAAAAABBBBCCCCDDDDEEEEEEEEEEEE",
    );
  });
});
