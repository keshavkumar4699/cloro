import { db } from "@/lib/db";
import { settleListing } from "@/lib/auction";
import { minNextBid } from "@/lib/rules";

export const dynamic = "force-dynamic";

/** Lightweight polling endpoint for live bid updates (cheaper to host than websockets). */
export async function GET(_req: Request, ctx: RouteContext<"/api/listings/[id]">) {
  const { id } = await ctx.params;
  let l = await db.listing.findUnique({ where: { id } });
  if (!l) return Response.json({ error: "Not found" }, { status: 404 });
  if (l.status === "LIVE" && l.endsAt <= new Date()) {
    await settleListing(id);
    l = (await db.listing.findUnique({ where: { id } }))!;
  }
  return Response.json({
    status: l.status,
    currentPrice: l.currentPrice,
    bidCount: l.bidCount,
    endsAt: l.endsAt.toISOString(),
    minNext: minNextBid(l),
    reserveMet: l.reserveMet,
    hasReserve: l.reservePrice !== null,
  });
}
