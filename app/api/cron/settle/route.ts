import { settleDue } from "@/lib/auction";

export const dynamic = "force-dynamic";

/** Closes ended auctions and expires offers. Call every few minutes from any free cron (e.g. Vercel Cron, cron-job.org). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  await settleDue();
  return Response.json({ ok: true });
}
