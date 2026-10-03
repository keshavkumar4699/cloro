import { timingSafeEqual } from "node:crypto";
import { runMaintenance, settleDue } from "@/lib/auction";
import { remindWatchers } from "@/lib/watch";

function authorized(header: string | null, secret: string | undefined) {
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const dynamic = "force-dynamic";

/** Closes ended auctions and expires offers. Called every few minutes by the cron container (docker-compose.prod.yml) or any external cron. */
export async function GET(req: Request) {
  if (!authorized(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return new Response("Unauthorized", { status: 401 });
  }
  await settleDue(new Date(), { force: true });
  const maintenance = await runMaintenance();
  const reminders = await remindWatchers();
  return Response.json({ ok: true, ...maintenance, reminders });
}
