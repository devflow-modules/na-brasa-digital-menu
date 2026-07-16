import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADMIN_ORDERS_QUEUE_HREF,
  formatPendingBadgeAriaLabel,
  formatPendingBadgeCountLabel,
  shouldMarkPendingBadgeCurrent,
} from "@/features/admin/orders/new-order-notifications/new-order-pending-badge";

describe("new-order-pending-badge", () => {
  it("uses the canonical admin queue href", () => {
    assert.equal(ADMIN_ORDERS_QUEUE_HREF, "/admin");
  });

  it("formats visible count labels including the 99+ cap", () => {
    assert.equal(formatPendingBadgeCountLabel(1), "1");
    assert.equal(formatPendingBadgeCountLabel(3), "3");
    assert.equal(formatPendingBadgeCountLabel(99), "99");
    assert.equal(formatPendingBadgeCountLabel(100), "99+");
  });

  it("builds an accessible name that points to the queue and all sources", () => {
    assert.equal(
      formatPendingBadgeAriaLabel(1),
      "Abrir fila com 1 pedido pendente de todas as origens",
    );
    assert.equal(
      formatPendingBadgeAriaLabel(3),
      "Abrir fila com 3 pedidos pendentes de todas as origens",
    );
    assert.equal(
      formatPendingBadgeAriaLabel(120),
      "Abrir fila com mais de 99 pedidos pendentes de todas as origens",
    );
  });

  it("marks aria-current only on the exact /admin queue path", () => {
    assert.equal(shouldMarkPendingBadgeCurrent("/admin"), true);
    assert.equal(shouldMarkPendingBadgeCurrent("/admin/balcao"), false);
    assert.equal(shouldMarkPendingBadgeCurrent("/admin/pedidos/abc"), false);
    assert.equal(shouldMarkPendingBadgeCurrent("/admin/cardapio"), false);
    assert.equal(shouldMarkPendingBadgeCurrent("/admin/configuracoes"), false);
    assert.equal(shouldMarkPendingBadgeCurrent("/admin/login"), false);
    assert.equal(shouldMarkPendingBadgeCurrent(null), false);
  });
});
