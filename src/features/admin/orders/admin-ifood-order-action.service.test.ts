import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { executeAdminIfoodOrderAction } from "@/features/admin/orders/admin-ifood-order-action.service";

describe("executeAdminIfoodOrderAction", () => {
  it("rejects non-IFOOD and missing projection without leaking", async () => {
    const result = await executeAdminIfoodOrderAction(
      { orderId: "order_1" },
      "store_1",
      "MANAGER",
      {
        prisma: {
          order: {
            findFirst: async () => ({
              id: "order_1",
              source: "DIRECT",
              status: "PENDING",
              ifoodProjection: null,
            }),
          },
        } as never,
        readIfoodEnv: () => {
          throw new Error("unused");
        },
        createIfoodApiClient: () => {
          throw new Error("unused");
        },
        executeIfoodOrderCommand: async () => {
          throw new Error("should not run");
        },
      },
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.message, "Pedido não encontrado.");
  });

  it("blocks KITCHEN from CONFIRM", async () => {
    const result = await executeAdminIfoodOrderAction(
      { orderId: "order_ifood" },
      "store_1",
      "KITCHEN",
      {
        prisma: {
          order: {
            findFirst: async () => ({
              id: "order_ifood",
              source: "IFOOD",
              status: "PENDING",
              ifoodProjection: {
                id: "ifood_1",
                connectionId: "conn_1",
                storeId: "store_1",
                externalOrderId: "ext-1",
                snapshot: { orderType: "DELIVERY" },
                connection: {
                  id: "conn_1",
                  isActive: true,
                  merchantId: "merchant_1",
                },
              },
            }),
          },
        } as never,
        readIfoodEnv: () => ({
          clientId: "id",
          clientSecret: "secret",
          merchantId: "merchant_1",
          storeSlug: "na-brasa",
        }),
        createIfoodApiClient: () => {
          throw new Error("unused");
        },
        executeIfoodOrderCommand: async () => {
          throw new Error("should not run");
        },
      },
    );

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.message, /permissão/i);
  });

  it("delegates CONFIRM to the command ledger for MANAGER", async () => {
    let called = false;
    const result = await executeAdminIfoodOrderAction(
      { orderId: "order_ifood" },
      "store_1",
      "MANAGER",
      {
        prisma: {
          order: {
            findFirst: async () => ({
              id: "order_ifood",
              source: "IFOOD",
              status: "PENDING",
              ifoodProjection: {
                id: "ifood_1",
                connectionId: "conn_1",
                storeId: "store_1",
                externalOrderId: "ext-1",
                snapshot: { orderType: "DELIVERY" },
                connection: {
                  id: "conn_1",
                  isActive: true,
                  merchantId: "merchant_1",
                },
              },
            }),
          },
        } as never,
        readIfoodEnv: () => ({
          clientId: "id",
          clientSecret: "secret",
          merchantId: "merchant_1",
          storeSlug: "na-brasa",
        }),
        createIfoodApiClient: () => ({}) as never,
        executeIfoodOrderCommand: async (input) => {
          called = true;
          assert.equal(input.connectionId, "conn_1");
          assert.equal(input.externalOrderId, "ext-1");
          assert.equal(input.command, "CONFIRM");
          return {
            commandId: "cmd_1",
            command: "CONFIRM",
            status: "ACCEPTED",
            replay: false,
            httpStatus: 202,
          };
        },
      },
    );

    assert.equal(called, true);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.command, "CONFIRM");
    assert.equal(result.status, "ACCEPTED");
    assert.equal(result.httpStatus, 202);
    assert.equal(result.replay, false);
  });

  it("returns replay without calling a second attempt path marker", async () => {
    const result = await executeAdminIfoodOrderAction(
      { orderId: "order_ifood" },
      "store_1",
      "MANAGER",
      {
        prisma: {
          order: {
            findFirst: async () => ({
              id: "order_ifood",
              source: "IFOOD",
              status: "CONFIRMED",
              ifoodProjection: {
                id: "ifood_1",
                connectionId: "conn_1",
                storeId: "store_1",
                externalOrderId: "ext-1",
                snapshot: { orderType: "TAKEOUT" },
                connection: {
                  id: "conn_1",
                  isActive: true,
                  merchantId: "merchant_1",
                },
              },
            }),
          },
        } as never,
        readIfoodEnv: () => ({
          clientId: "id",
          clientSecret: "secret",
          merchantId: "merchant_1",
          storeSlug: "na-brasa",
        }),
        createIfoodApiClient: () => ({}) as never,
        executeIfoodOrderCommand: async () => ({
          commandId: "cmd_2",
          command: "START_PREPARATION",
          status: "CONFIRMED",
          replay: true,
          httpStatus: null,
        }),
      },
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.replay, true);
    assert.equal(result.command, "START_PREPARATION");
  });
});
