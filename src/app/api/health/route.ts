import { NextResponse } from "next/server";
import { checkHealth } from "@/features/ops/health.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const result = await checkHealth();
  const body = {
    status: result.status,
    db: result.db,
    timestamp: result.timestamp,
  };
  return NextResponse.json(body, { status: result.ok ? 200 : 503 });
}
