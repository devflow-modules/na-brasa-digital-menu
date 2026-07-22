export type IfoodAccessToken = {
  accessToken: string;
  expiresIn: number | null;
};

export type IfoodPollingEvent = {
  id: string;
  code?: string;
  fullCode?: string;
  orderId?: string;
  merchantId?: string;
  createdAt?: string;
  [key: string]: unknown;
};

export type IfoodApiClient = {
  authenticate: () => Promise<IfoodAccessToken>;
  pollEvents: (accessToken: string, merchantId: string) => Promise<IfoodPollingEvent[]>;
  acknowledge: (accessToken: string, eventIds: string[]) => Promise<void>;
  getOrder: (accessToken: string, orderId: string) => Promise<unknown>;
  executeOrderAction?: (
    accessToken: string,
    orderId: string,
    action: IfoodApiOrderAction,
  ) => Promise<{ status: number }>;
};

export type IfoodApiOrderAction =
  | "confirm"
  | "startPreparation"
  | "readyToPickup"
  | "dispatch";

export class IfoodApiError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
  ) {
    super(message);
    this.name = "IfoodApiError";
  }
}

const AUTH_URL =
  "https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token";
const POLL_URL =
  "https://merchant-api.ifood.com.br/events/v1.0/events:polling";
const ACK_URL =
  "https://merchant-api.ifood.com.br/events/v1.0/events/acknowledgment";
const ORDER_URL =
  "https://merchant-api.ifood.com.br/order/v1.0/orders";

export function createIfoodApiClient(input: {
  clientId: string;
  clientSecret: string;
  fetchImpl?: typeof fetch;
}): IfoodApiClient {
  const fetchImpl = input.fetchImpl ?? fetch;

  return {
    async authenticate() {
      const body = new URLSearchParams({
        grantType: "client_credentials",
        clientId: input.clientId,
        clientSecret: input.clientSecret,
      });
      const response = await fetchImpl(AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const json = (await response.json()) as {
        accessToken?: string;
        expiresIn?: number;
      };
      if (!response.ok || !json.accessToken) {
        throw new Error(`iFood auth failed (${response.status})`);
      }
      return {
        accessToken: json.accessToken,
        expiresIn: json.expiresIn ?? null,
      };
    },

    async pollEvents(accessToken, merchantId) {
      const url = `${POLL_URL}?categories=FOOD`;
      const response = await fetchImpl(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-polling-merchants": merchantId,
        },
      });
      if (response.status === 204) {
        return [];
      }
      if (!response.ok) {
        throw new Error(`iFood polling failed (${response.status})`);
      }
      const json = (await response.json()) as IfoodPollingEvent[];
      return Array.isArray(json) ? json : [];
    },

    async acknowledge(accessToken, eventIds) {
      if (eventIds.length === 0) {
        return;
      }
      const response = await fetchImpl(ACK_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventIds.map((id) => ({ id }))),
      });
      if (!response.ok) {
        throw new Error(`iFood ACK failed (${response.status})`);
      }
    },

    async getOrder(accessToken, orderId) {
      const response = await fetchImpl(`${ORDER_URL}/${orderId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        throw new Error(`iFood GET order failed (${response.status})`);
      }
      return response.json();
    },

    async executeOrderAction(accessToken, orderId, action) {
      const response = await fetchImpl(`${ORDER_URL}/${orderId}/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      if (response.status !== 202) {
        // Never persist an upstream response body: it may contain customer data.
        throw new IfoodApiError(
          `iFood order action ${action} expected 202 (${response.status})`,
          response.status,
        );
      }
      return { status: response.status };
    },
  };
}
