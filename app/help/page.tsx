import Link from "next/link";

export const metadata = { title: "Help centre" };

const FAQ: [string, string][] = [
  ["Who can join Cloro?", "Anyone aged 13 to 30. Cloro is built for Gen Z: members under 24 list for free; members aged 24–30 are welcome and pay a small monthly fee to list (their first listing is free). Members under 18 need a parent or guardian's approval to trade."],
  ["Why do I need Aadhaar?", "So every trader is a real person with one account. You only verify when you want to list, bid, ask a question or chat — browsing needs just a Google sign-in. We read the QR code on your card and check UIDAI's digital signature. The card photo never leaves your phone, and we never store your full Aadhaar number."],
  ["My Aadhaar QR won't scan", "Use good light, hold the phone straight, and let the QR code fill the frame. Cards printed before about 2019 carry an older QR code that can't be verified — download your free e-Aadhaar from the UIDAI website and scan the QR code on it."],
  ["How do auctions work?", "Sellers set a starting bid, an optional hidden reserve and a duration. Each bid must beat the current one by a small step. Any bid in the final 2 minutes extends the auction by 2 minutes, so no one can snipe at the last second."],
  ["What happens when I win?", "You get an alert and have 48 hours to accept. Choose to meet in person or to see the item on a video call and have it shipped. If you don't respond, the seller can offer the item to the next bidder."],
  ["Who pays for shipping?", "Always the buyer. Each listing shows an estimated shipping cost next to the price."],
  ["How do I pay?", "Directly to the seller — UPI or cash at a meetup, or UPI after the video call for shipped items. Cloro doesn't hold money yet, so check the seller's ratings and history, and never pay before you've seen the item live."],
  ["Who can I chat with?", "Sellers can chat with their top 3 bidders. Anyone can ask a public question on a listing — ask there for bills, boxes, flaws or fit."],
  ["What is a strike?", "A strike is given only when our team has reviewed evidence and heard both sides — for example sending a wrong item, not turning up after winning, or harassment. One strike is a warning, two freeze trading for 30 days, three means a permanent ban. Fraud, counterfeits or harming a minor mean an immediate ban. You can appeal each strike once."],
  ["Something went wrong with my deal", "Open a support ticket from the deal page. Attach screenshots, courier receipts and photos, and keep your call recording or unboxing video ready."],
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6 py-8 md:py-12">
      <p className="eyebrow">Help centre</p>
      <h1 className="text-4xl md:text-5xl mt-2">How Cloro works</h1>

      <section className="mt-8 space-y-3">
        {FAQ.map(([q, a]) => (
          <details key={q} className="card !shadow-none px-5 py-3">
            <summary className="cursor-pointer font-semibold text-lg py-1">{q}</summary>
            <p className="mt-3 text-muted leading-relaxed">{a}</p>
          </details>
        ))}
      </section>

      <section id="safety" className="mt-20">
        <h2 className="section-title">Safety guide</h2>
        <ul className="mt-6 space-y-3 leading-relaxed list-disc pl-6">
          <li>Meet in busy public places — malls, cafés, metro stations — during the day. Tell someone where you&apos;re going.</li>
          <li>Under 18? Always bring a parent or guardian to a meetup.</li>
          <li>For shipped items, see the item live on a video call first, and screen-record the call.</li>
          <li>Record an unboxing video when a parcel arrives.</li>
          <li>You never need to scan a QR code or enter your UPI PIN to <em>receive</em> money. Never share an OTP.</li>
          <li>Keep conversations on Cloro. We can&apos;t help with deals made on WhatsApp or Instagram.</li>
          <li>If you feel unsafe, call 112. For online payment fraud call 1930 or report at cybercrime.gov.in.</li>
        </ul>
      </section>

      <section id="guidelines" className="mt-20">
        <h2 className="section-title">Community guidelines</h2>
        <p className="mt-4 text-muted">Cloro is a community of good people. Be mindful of others, and don&apos;t cause harm to anybody.</p>
        <ul className="mt-6 space-y-3 leading-relaxed list-disc pl-6">
          <li><strong>Be honest.</strong> State the true size, measurements, condition and flaws. No counterfeits.</li>
          <li><strong>Be respectful.</strong> No harassment, flirting, threats or pressure — especially with younger members.</li>
          <li><strong>Keep your word.</strong> A bid is a promise to buy. Turn up to meetups you agree to.</li>
          <li><strong>Play fair.</strong> No bidding on your own items, no side deals to skip the auction.</li>
        </ul>
        <Link href="/support/new" className="btn btn-primary mt-10">Contact support</Link>
      </section>
    </div>
  );
}
