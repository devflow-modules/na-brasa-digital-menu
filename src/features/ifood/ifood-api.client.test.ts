import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createIfoodApiClient,
  IfoodApiError,
} from "@/features/ifood/ifood-api.client";

describe("iFood order actions API client", () => {
  it("posts the canonical action and accepts only HTTP 202", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const client = createIfoodApiClient({
      clientId: "id",
      clientSecret: "secret",
      fetchImpl: async (url, init) => {
        calls.push({ url: String(url), init });
        return new Response(null, { status: 202 });
      },
    });

    const result = await client.executeOrderAction?.(
      "token",
      "order-1",
      "startPreparation",
    );

    assert.equal(result?.status, 202);
    assert.equal(
      calls[0]?.url,
      "https://merchant-api.ifood.com.br/order/v1.0/orders/order-1/startPreparation",
    );
    assert.equal(calls[0]?.init?.method, "POST");
  });

  it("does not read or persist upstream error bodies", async () => {
    let bodyRead = false;
    const client = createIfoodApiClient({
      clientId: "id",
      clientSecret: "secret",
      fetchImpl: async () =>
        ({
          status: 400,
          ok: false,
          async json() {
            bodyRead = true;
            return { customerName: "must-not-be-read" };
          },
        }) as Response,
    });

    await assert.rejects(
      () => client.executeOrderAction!("token", "order-1", "confirm"),
      (error: unknown) => error instanceof IfoodApiError && error.status === 400,
    );
    assert.equal(bodyRead, false);
  });
});
