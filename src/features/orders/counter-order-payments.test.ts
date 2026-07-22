import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  COUNTER_ORDER_MAX_PAYMENT_LINES,
  counterPaymentsMatchPersisted,
  normalizeAndValidateCounterPayments,
  ORDER_PAYMENT_MAX_CENTS,
} from "@/features/orders/counter-order-payments";

describe("normalizeAndValidateCounterPayments", () => {
  it("accepts single cash exact and cash with tender/change", () => {
    const exact = normalizeAndValidateCounterPayments(2500, [
      { method: "CASH", amountCents: 2500 },
    ]);
    assert.equal(exact.ok, true);
    if (!exact.ok) return;
    assert.deepEqual(exact.payments[0], {
      method: "CASH",
      amountCents: 2500,
      tenderedCents: null,
      changeCents: 0,
    });

    const tendered = normalizeAndValidateCounterPayments(2500, [
      { method: "CASH", amountCents: 2500, tenderedCents: 5000 },
    ]);
    assert.equal(tendered.ok, true);
    if (!tendered.ok) return;
    assert.deepEqual(tendered.payments[0], {
      method: "CASH",
      amountCents: 2500,
      tenderedCents: 5000,
      changeCents: 2500,
    });
  });

  it("accepts mixed unique methods that sum to total", () => {
    const result = normalizeAndValidateCounterPayments(5000, [
      { method: "CASH", amountCents: 2000, tenderedCents: 2000 },
      { method: "PIX", amountCents: 3000 },
    ]);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.payments.length, 2);
  });

  it("rejects duplicate methods, bad sums, and unsafe bounds", () => {
    assert.equal(
      normalizeAndValidateCounterPayments(5000, [
        { method: "PIX", amountCents: 2500 },
        { method: "PIX", amountCents: 2500 },
      ]).ok,
      false,
    );

    assert.equal(
      normalizeAndValidateCounterPayments(5000, [
        { method: "PIX", amountCents: 2000 },
      ]).ok,
      false,
    );

    assert.equal(
      normalizeAndValidateCounterPayments(5000, [
        { method: "CASH", amountCents: 5000, tenderedCents: 4000 },
      ]).ok,
      false,
    );

    assert.equal(
      normalizeAndValidateCounterPayments(5000, [
        { method: "PIX", amountCents: 5000, tenderedCents: 5000 },
      ]).ok,
      false,
    );

    assert.equal(
      normalizeAndValidateCounterPayments(5000, [
        { method: "PIX", amountCents: ORDER_PAYMENT_MAX_CENTS + 1 },
      ]).ok,
      false,
    );

    assert.equal(
      normalizeAndValidateCounterPayments(5000, [
        { method: "CASH", amountCents: 6000 },
      ]).ok,
      false,
    );
  });

  it("caps at four creatable methods", () => {
    assert.equal(COUNTER_ORDER_MAX_PAYMENT_LINES, 4);
    const tooMany = normalizeAndValidateCounterPayments(4000, [
      { method: "CASH", amountCents: 1000 },
      { method: "PIX", amountCents: 1000 },
      { method: "DEBIT_CARD", amountCents: 1000 },
      { method: "CREDIT_CARD", amountCents: 500 },
      { method: "CASH", amountCents: 500 },
    ]);
    assert.equal(tooMany.ok, false);
  });
});

describe("counterPaymentsMatchPersisted", () => {
  it("matches regardless of order when composition is equal", () => {
    const expected = [
      {
        method: "PIX" as const,
        amountCents: 3000,
        tenderedCents: null,
        changeCents: null,
      },
      {
        method: "CASH" as const,
        amountCents: 2000,
        tenderedCents: 2000,
        changeCents: 0,
      },
    ];
    assert.equal(
      counterPaymentsMatchPersisted(expected, [
        {
          method: "CASH",
          amountCents: 2000,
          tenderedCents: 2000,
          changeCents: 0,
        },
        {
          method: "PIX",
          amountCents: 3000,
          tenderedCents: null,
          changeCents: null,
        },
      ]),
      true,
    );
    assert.equal(
      counterPaymentsMatchPersisted(expected, [
        {
          method: "PIX",
          amountCents: 3000,
          tenderedCents: null,
          changeCents: null,
        },
      ]),
      false,
    );
  });
});
