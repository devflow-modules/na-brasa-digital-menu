import { NextResponse } from "next/server";
import { ingestClientFunnelEvent } from "@/features/analytics/ingest-client-funnel-event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function resolveRateLimitKey(request: Request, body: unknown): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";

  let sessionPart = "nosession";
  if (
    body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    typeof (body as { sessionId?: unknown }).sessionId === "string"
  ) {
    sessionPart = (body as { sessionId: string }).sessionId.slice(0, 64);
  }

  return `${ip}:${sessionPart}`;
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const result = await ingestClientFunnelEvent(body, {
      rateLimitKey: resolveRateLimitKey(request, body),
    });

    if (!result.ok) {
      if (result.status === 429) {
        return NextResponse.json(
          { ok: false },
          {
            status: 429,
            headers: {
              "Retry-After": String(result.retryAfterSeconds ?? 60),
            },
          },
        );
      }
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    // Telemetry must never surface as a hard failure to the storefront.
    return new NextResponse(null, { status: 204 });
  }
}
