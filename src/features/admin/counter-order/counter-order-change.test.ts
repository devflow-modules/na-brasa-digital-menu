import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildFinalizeCounterOrderPayload,
  buildFinalizePaymentsPayload,
  canConfirmCounterPaymentDraft,
  computeCashChangeCents,
  createDraftLine,
  isCashTenderValid,
  remainingDraftCents,
  type CounterPaymentDraftLine,
} from "@/features/admin/counter-order/counter-order-change";

describe("counter-order-change", () => {
  it("treats omitted tender as exact payment with zero change", () => {
    assert.equal(isCashTenderValid(4200, null), true);
    assert.equal(computeCashChangeCents(4200, null), 0);
    assert.equal(computeCashChangeCents(4200, undefined), 0);
  });

  it("computes change in integer cents", () => {
    assert.equal(isCashTenderValid(4200, 5000), true);
    assert.equal(computeCashChangeCents(4200, 5000), 800);
    assert.equal(computeCashChangeCents(4200, 4200), 0);
  });

  it("rejects tender below total", () => {
    assert.equal(isCashTenderValid(4200, 4100), false);
    assert.equal(computeCashChangeCents(4200, 4100), null);
  });

  it("builds payload without prices, status or draft fields", () => {
    assert.deepEqual(
      buildFinalizeCounterOrderPayload({
        orderId: "o1",
        paymentMethod: "PIX",
        tenderedCents: 9999,
      }),
      { orderId: "o1", paymentMethod: "PIX" },
    );

    assert.deepEqual(
      buildFinalizeCounterOrderPayload({
        orderId: "o1",
        paymentMethod: "CASH",
        tenderedCents: null,
      }),
      { orderId: "o1", paymentMethod: "CASH" },
    );

    assert.deepEqual(
      buildFinalizeCounterOrderPayload({
        orderId: "o1",
        paymentMethod: "CASH",
        tenderedCents: 5000,
      }),
      { orderId: "o1", paymentMethod: "CASH", changeForCents: 5000 },
    );
  });

  it("blocks confirm until applied amounts close the total", () => {
    const open: CounterPaymentDraftLine[] = [
      createDraftLine("PIX", 1000),
      createDraftLine("CASH", 1000),
    ];
    assert.equal(remainingDraftCents(3000, open), 1000);
    assert.equal(canConfirmCounterPaymentDraft(3000, open), false);

    const closed: CounterPaymentDraftLine[] = [
      createDraftLine("PIX", 1500),
      {
        ...createDraftLine("CASH", 1500),
        tenderedCents: 2000,
        tenderedInput: "20,00",
      },
    ];
    assert.equal(remainingDraftCents(3000, closed), 0);
    assert.equal(canConfirmCounterPaymentDraft(3000, closed), true);

    assert.deepEqual(
      buildFinalizePaymentsPayload({ orderId: "o1", lines: closed }),
      {
        orderId: "o1",
        payments: [
          { method: "PIX", amountCents: 1500 },
          { method: "CASH", amountCents: 1500, tenderedCents: 2000 },
        ],
      },
    );
  });
});
