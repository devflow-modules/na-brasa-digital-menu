import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OrderSource } from "@prisma/client";
import {
  formatOrderSource,
  formatPaymentMethod,
  formatPhone,
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
  });

  it("keeps known payment method labels", () => {
    assert.equal(formatPaymentMethod("PIX"), "Pix");
    assert.equal(formatPaymentMethod("CASH"), "Dinheiro");
    assert.equal(formatPaymentMethod("CARD"), "Cartão");
  });
});
