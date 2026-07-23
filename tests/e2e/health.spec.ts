import { expect, test } from "@playwright/test";

test("GET /api/health returns 200 with ok status when app and DB are up", async ({
  request,
}) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);

  const body = (await response.json()) as {
    status: string;
    db: string;
    timestamp: string;
  };

  expect(body.status).toBe("ok");
  expect(body.db).toBe("ok");
  expect(typeof body.timestamp).toBe("string");
  expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);

  const keys = Object.keys(body).sort();
  expect(keys).toEqual(["db", "status", "timestamp"]);
});
