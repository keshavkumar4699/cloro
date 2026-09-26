// Monthly listing pass for 24–30 year old members. Razorpay when keys are configured, otherwise a mock provider.

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";

export const LISTING_FEE = Number(process.env.LISTING_FEE_24_30 ?? 299);
export const PASS_DAYS = 30;

export const razorpayEnabled = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

export async function createPassOrder(userId: string) {
  if (razorpayEnabled()) {
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64"),
      },
      body: JSON.stringify({ amount: LISTING_FEE * 100, currency: "INR", receipt: `pass_${userId}`.slice(0, 40) }),
    });
    if (!res.ok) throw new Error("Couldn't start the payment. Please try again.");
    const order = (await res.json()) as { id: string };
    await db.payment.create({ data: { userId, amount: LISTING_FEE, provider: "razorpay", providerOrderId: order.id } });
    return { provider: "razorpay" as const, orderId: order.id, amount: LISTING_FEE, keyId: process.env.RAZORPAY_KEY_ID! };
  }
  const orderId = `mock_${randomUUID()}`;
  await db.payment.create({ data: { userId, amount: LISTING_FEE, provider: "mock", providerOrderId: orderId } });
  return { provider: "mock" as const, orderId, amount: LISTING_FEE };
}

export function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Marks a payment paid and extends the user's pass. Idempotent. */
export async function completePassPayment(orderId: string, paymentId: string, userId: string) {
  await db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { providerOrderId: orderId } });
    if (!payment || payment.userId !== userId || payment.status === "PAID") return;
    await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID", providerPaymentId: paymentId, paidAt: new Date() } });
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const from = user.listingPassUntil && user.listingPassUntil > new Date() ? user.listingPassUntil : new Date();
    await tx.user.update({
      where: { id: userId },
      data: { listingPassUntil: new Date(from.getTime() + PASS_DAYS * 86400000) },
    });
  });
}
