import Link from "next/link";
import { ProsePage } from "@/components/prose-page";
import { BUSINESS_NAME, CONTACT_EMAIL } from "@/lib/site";

export const metadata = {
  title: "Terms of use",
  description: "The rules for buying and selling on Cloro's online auctions.",
  alternates: { canonical: "/legal/terms" },
};

export default function TermsPage() {
  return (
    <ProsePage title="Terms of use" intro={`These terms are an agreement between you and ${BUSINESS_NAME} ("Cloro", "we") about using the Cloro website. Please read them — by using Cloro you agree to them.`}>
      <h2>1. What Cloro is</h2>
      <p>
        Cloro is an online marketplace where members list pre-loved items and other members bid on them in timed auctions. Cloro is a
        platform only: we are not the buyer or seller of any item, we do not hold or transfer money for items, and we do not ship items.
        Buyers and sellers complete each deal directly with each other.
      </p>

      <h2>2. Who can use Cloro</h2>
      <ul>
        <li>You must be between 13 and 30 years old. Anyone may browse; to list, bid, ask questions or chat you must verify once with your Aadhaar.</li>
        <li>Members under 18 may trade only after a parent or legal guardian approves their account, and may bid up to ₹5,000 per item. The guardian is responsible for the minor&apos;s use of Cloro.</li>
        <li>One person may have only one account. Sharing, selling or using someone else&apos;s account or Aadhaar is not allowed.</li>
      </ul>

      <h2>3. Listing items</h2>
      <ul>
        <li>Describe every item honestly, including its true size, measurements, condition and any flaws, with real photos of the actual item.</li>
        <li>Do not list counterfeit, stolen, illegal, dangerous or adult items, weapons, drugs, alcohol, tobacco, medicines, animals, or anything you don&apos;t own.</li>
        <li>Do not put phone numbers, payment IDs or links in listings — all contact happens on Cloro.</li>
        <li>You can withdraw an item only before the first bid.</li>
      </ul>

      <h2>4. Bidding and winning</h2>
      <ul>
        <li>A bid is a promise to buy at that price if you win. Bids can&apos;t be withdrawn.</li>
        <li>A bid in the final two minutes extends the auction by two minutes.</li>
        <li>When an auction ends, the highest eligible bidder is offered the item and has 48 hours to accept. If they don&apos;t, the seller may offer it to the next bidder. If a reserve price is not met, the seller decides whether to sell.</li>
        <li>The buyer pays the winning bid plus shipping (if shipped) directly to the seller.</li>
      </ul>

      <h2>5. Payments between members</h2>
      <p>
        Payments for items are made directly between members (for example by UPI or cash). Cloro does not process, hold or refund these
        payments and is not responsible for them. Only pay after you have seen the item, in person or on a live video call. Never scan a
        QR code or enter a UPI PIN to <em>receive</em> money.
      </p>

      <h2>6. Listing fees</h2>
      <p>
        Listing is free for members under 24. Members aged 24–30 get one free listing and then need a paid monthly listing pass. Fees,
        payments and refunds for the pass are explained in our <Link href="/legal/refunds">refund and cancellation policy</Link>.
      </p>

      <h2>7. Behaviour</h2>
      <ul>
        <li>Be respectful. Harassment, threats, hate, sexual messages, or any inappropriate contact — especially with members under 18 — is not tolerated.</li>
        <li>Don&apos;t bid on your own items, arrange deals to avoid the auction, or move people off Cloro to pay.</li>
        <li>Meet only in safe public places. Members under 18 must bring a parent or guardian.</li>
      </ul>

      <h2>8. Strikes, suspension and bans</h2>
      <p>
        We may give strikes, freeze trading, remove items or ban accounts for breaking these terms. Strikes are given after we review evidence and
        hear both sides; you can appeal each strike once. One strike is a warning, two freeze trading for 30 days, three lead to a ban. Fraud,
        counterfeits or harming a minor lead to an immediate ban. We may report serious matters to the police.
      </p>

      <h2>9. Disputes between members</h2>
      <p>
        If a deal goes wrong, open a support ticket. We will review the evidence and may warn, strike or ban members, and help you with
        evidence for a police or cybercrime complaint (1930 / cybercrime.gov.in). Because we don&apos;t handle item payments, we can&apos;t refund them.
      </p>

      <h2>10. Our responsibility</h2>
      <p>
        Cloro is provided &quot;as is&quot;. To the extent the law allows, we are not liable for items, payments, meetups or shipping between members, or
        for losses arising from them. Nothing in these terms limits rights you have under Indian consumer law that can&apos;t be limited.
      </p>

      <h2>11. Changes and contact</h2>
      <p>
        We may update these terms; we&apos;ll show the date at the top and tell members about important changes. These terms are governed by the
        laws of India. Questions: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> or <Link href="/support">support</Link>.
      </p>
    </ProsePage>
  );
}
