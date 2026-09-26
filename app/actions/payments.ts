"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { ageBand, ageOn } from "@/lib/rules";
import { completePassPayment, createPassOrder, verifyRazorpaySignature } from "@/lib/payments";

async function passHolder() {
  const user = await getCurrentUser();
  if (!user?.dob || ageBand(ageOn(user.dob)) !== "ADULT_24_30") throw new Error("The listing pass is only for members aged 24–30.");
  return user;
}

export async function startPassPayment() {
  const user = await passHolder();
  return createPassOrder(user.id);
}

export async function confirmPassPayment(input: { orderId: string; paymentId?: string; signature?: string }) {
  const user = await passHolder();
  const payment = await db.payment.findUnique({ where: { providerOrderId: input.orderId } });
  if (!payment || payment.userId !== user.id) return { ok: false, error: "Payment not found." };

  if (payment.provider === "razorpay") {
    if (!input.paymentId || !input.signature || !verifyRazorpaySignature(input.orderId, input.paymentId, input.signature)) {
      return { ok: false, error: "We couldn't verify this payment. If money was deducted, contact support." };
    }
    await completePassPayment(input.orderId, input.paymentId, user.id);
  } else {
    if (process.env.NODE_ENV === "production") return { ok: false, error: "Payments are not configured." };
    await completePassPayment(input.orderId, `mockpay_${Date.now()}`, user.id);
  }
  revalidatePath("/membership");
  return { ok: true };
}
