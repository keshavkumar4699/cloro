import Link from "next/link";
import { ProsePage } from "@/components/prose-page";
import { CONTACT_EMAIL } from "@/lib/site";
import { LISTING_FEE, PASS_DAYS } from "@/lib/payments";

export const metadata = {
  title: "Refund & cancellation policy",
  description: "Cloro's refund and cancellation policy for the listing pass, and what happens with payments between buyers and sellers.",
  alternates: { canonical: "/legal/refunds" },
};

export default function RefundsPage() {
  return (
    <ProsePage title="Refund & cancellation policy" intro="Cloro charges only one thing: an optional listing pass for members aged 24–30. Here's how payments and refunds work.">
      <h2>The listing pass</h2>
      <ul>
        <li>Price: ₹{LISTING_FEE} for {PASS_DAYS} days of unlimited listings, for members aged 24–30. Members under 24 list for free.</li>
        <li>The pass starts the moment payment succeeds. Buying again before it ends adds {PASS_DAYS} days to the end date.</li>
        <li>The pass is a digital service delivered immediately, so it can&apos;t be cancelled for a refund once active.</li>
      </ul>

      <h2>When we refund</h2>
      <ul>
        <li>You were charged but the pass didn&apos;t activate.</li>
        <li>You were charged twice for the same purchase.</li>
        <li>We close your account by mistake while a pass is active (a pro-rata refund).</li>
      </ul>
      <p>
        Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or open a <Link href="/support/new?category=ACCOUNT">support ticket</Link> within 7 days with
        your Razorpay payment ID. Approved refunds go back to the original payment method within 5–7 working days. Passes cancelled because of a
        ban for breaking our terms are not refunded.
      </p>

      <h2>Items bought from other members</h2>
      <p>
        Cloro does not collect or hold payment for items — buyers pay sellers directly — so Cloro can&apos;t refund item payments. If something goes
        wrong, open a support ticket: we&apos;ll review the evidence, act against members who broke the rules, and help you with a police or cybercrime
        complaint (1930 / cybercrime.gov.in). Only pay after seeing the item in person or on a live video call.
      </p>
    </ProsePage>
  );
}
