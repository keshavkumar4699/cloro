import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { completePassPayment } from "@/lib/payments";

/**
 * Razorpay calls this when a payment is captured, so a listing pass is still activated
 * if the member closed the tab before the checkout popup reported back.
 * Set it up in Razorpay → Settings → Webhooks with the events "payment.captured" and "order.paid".
 */
export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return new Response("Webhook not configured", { status: 503 });

  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response("Bad signature", { status: 401 });

  let event: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number; status?: string } } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad payload", { status: 400 });
  }
  if (event.event !== "payment.captured" && event.event !== "order.paid") return Response.json({ ignored: true });

  const p = event.payload?.payment?.entity;
  if (!p?.id || !p.order_id) return new Response("Missing payment", { status: 400 });
  const payment = await db.payment.findUnique({ where: { providerOrderId: p.order_id } });
  if (!payment) return Response.json({ ignored: "unknown order" });
  if (typeof p.amount === "number" && p.amount !== payment.amount * 100) {
    console.error(JSON.stringify({ level: "error", msg: "razorpay amount mismatch", order: p.order_id, amount: p.amount }));
    return new Response("Amount mismatch", { status: 400 });
  }
  await completePassPayment(p.order_id, p.id, payment.userId); // idempotent
  return Response.json({ ok: true });
}
