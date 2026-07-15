import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OrderSource } from "@prisma/client";
import {
  formatOrderSource,
  formatPaymentMethod,
  formatPhone,
} from "@/features/admin/orders/admin-orders-formatters";

describe("admin-orders-formatters domain compatibility", () => {
  it("recognizes OrderSource.COUNTER as Balcão", () => {
    assert.equal(OrderSource.COUNTER, "COUNTER");
    assert.equal(formatOrderSource("COUNTER"), "Balcão");
  });

  it("keeps DIRECT label unchanged", () => {
    assert.equal(formatOrderSource("DIRECT"), "Direto");
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
