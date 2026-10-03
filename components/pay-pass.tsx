"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmPassPayment, startPassPayment } from "@/app/actions/payments";

type RazorpayResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Couldn't load Razorpay."));
    document.body.appendChild(s);
  });
}

export function PayPass({ label }: { label: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    setError(null);
    try {
      const order = await startPassPayment();
      if (order.provider === "mock") {
        if (!window.confirm(`Development mode: simulate paying ₹${order.amount}?`)) return;
        const res = await confirmPassPayment({ orderId: order.orderId });
        if (!res.ok) setError(res.error ?? "Payment failed.");
        router.refresh();
        return;
      }
      await loadRazorpay();
      const rzp = new window.Razorpay!({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount * 100,
        currency: "INR",
        name: "Cloro",
        description: "Monthly listing pass",
        theme: { color: "#0f0e0c" },
        handler: async (r: RazorpayResponse) => {
          const res = await confirmPassPayment({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature });
          if (!res.ok) setError(res.error ?? "Payment failed.");
          router.refresh();
        },
      });
      rzp.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={pay} disabled={busy} className="btn btn-gold">{busy ? "Please wait…" : label}</button>
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
