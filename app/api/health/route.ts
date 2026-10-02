import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** For uptime monitors and the Docker health check: 200 when the app can reach its database. */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
