import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OrderSource } from "@prisma/client";
import {
  formatAdminOrderPaymentLabel,
  formatOrderElapsedTime,
  formatOrderSource,
  formatPaymentMethod,
  formatPhone,
  IFOOD_EXTERNAL_STATUS_NOTE,
} from "@/features/admin/orders/admin-orders-formatters";

describe("admin-orders-formatters domain compatibility", () => {
  it("maps every OrderSource to the operational UI label", () => {
    assert.equal(OrderSource.DIRECT, "DIRECT");
    assert.equal(OrderSource.COUNTER, "COUNTER");
    assert.equal(formatOrderSource("DIRECT"), "Online");
    assert.equal(formatOrderSource("COUNTER"), "Balcão");
    assert.equal(formatOrderSource("IFOOD"), "iFood");
    assert.equal(formatOrderSource("OTHER"), "Outro");
  });

  it("formats null phone without throwing", () => {
    assert.equal(formatPhone(null), "Sem telefone");
  });

  it("formats empty phone as Sem telefone", () => {
    assert.equal(formatPhone("   "), "Sem telefone");
  });

  it("formats null paymentMethod as Pagamento pendente", () => {
    assert.equal(formatPaymentMethod(null), "Pagamento pendente");
    assert.equal(
      formatPaymentMethod(null, { paid: true }),
      "Pagamento misto",
    );
  });

  it("labels IFOOD payment as managed by iFood without inventing tender", () => {
    assert.equal(
      formatAdminOrderPaymentLabel("IFOOD", null),
      "Pago/gerenciado pelo iFood",
    );
    assert.equal(
      formatAdminOrderPaymentLabel("IFOOD", "PIX"),
      "Pago/gerenciado pelo iFood",
    );
    assert.equal(
      formatAdminOrderPaymentLabel("DIRECT", null),
      "Pagamento pendente",
    );
    assert.equal(formatAdminOrderPaymentLabel("COUNTER", "CASH"), "Dinheiro");
    assert.match(IFOOD_EXTERNAL_STATUS_NOTE, /controlado pelo iFood/i);
  });

  it("keeps known payment method labels", () => {
    assert.equal(formatPaymentMethod("PIX"), "Pix");
    assert.equal(formatPaymentMethod("CASH"), "Dinheiro");
    assert.equal(formatPaymentMethod("DEBIT_CARD"), "Cartão de débito");
    assert.equal(formatPaymentMethod("CREDIT_CARD"), "Cartão de crédito");
    assert.equal(
      formatPaymentMethod("CARD"),
      "Cartão — tipo não informado",
    );
  });
});

describe("formatOrderElapsedTime", () => {
  const now = new Date("2026-07-17T20:00:00.000Z");

  function createdAtOffset(ms: number): Date {
    return new Date(now.getTime() - ms);
  }

  it("uses the injected now and clamps future dates", () => {
    const future = new Date(now.getTime() + 60_000);
    assert.equal(formatOrderElapsedTime(future, now), "Há pouco");
  });

  it("treats zero and sub-minute elapsed as Há pouco", () => {
    assert.equal(formatOrderElapsedTime(now, now), "Há pouco");
    assert.equal(formatOrderElapsedTime(createdAtOffset(30_000), now), "Há pouco");
    assert.equal(formatOrderElapsedTime(createdAtOffset(59_000), now), "Há pouco");
  });

  it("formats minute buckets with Math.floor boundaries", () => {
    assert.equal(formatOrderElapsedTime(createdAtOffset(60_000), now), "Há 1 min");
    assert.equal(formatOrderElapsedTime(createdAtOffset(120_000), now), "Há 2 min");
    assert.equal(
      formatOrderElapsedTime(createdAtOffset(59 * 60_000 + 59_000), now),
      "Há 59 min",
    );
    assert.equal(
      formatOrderElapsedTime(createdAtOffset(60 * 60_000), now),
      "Há 1 h",
    );
  });

  it("formats hour buckets with Math.floor boundaries", () => {
    assert.equal(
      formatOrderElapsedTime(createdAtOffset(2 * 60 * 60_000), now),
      "Há 2 h",
    );
    assert.equal(
      formatOrderElapsedTime(createdAtOffset(23 * 60 * 60_000 + 59 * 60_000), now),
      "Há 23 h",
    );
    assert.equal(
      formatOrderElapsedTime(createdAtOffset(24 * 60 * 60_000), now),
      "Há 1 dia",
    );
  });

  it("formats multi-day buckets", () => {
    assert.equal(
      formatOrderElapsedTime(createdAtOffset(2 * 24 * 60 * 60_000), now),
      "Há 2 dias",
    );
  });

  it("does not mutate the input dates", () => {
    const createdAt = createdAtOffset(5 * 60_000);
    const createdMs = createdAt.getTime();
    const nowMs = now.getTime();
    formatOrderElapsedTime(createdAt, now);
    assert.equal(createdAt.getTime(), createdMs);
    assert.equal(now.getTime(), nowMs);
  });
});
