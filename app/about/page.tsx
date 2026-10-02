import Link from "next/link";
import { ProsePage } from "@/components/prose-page";

export const metadata = {
  title: "About Cloro — the verified auction marketplace for Gen Z",
  description: "Cloro is an Indian online auction marketplace where young people sell pre-loved fashion, sneakers and gadgets at the right price to verified buyers.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <ProsePage title="About Cloro" updated={false} intro="Cloro is an online auction marketplace for Gen Z in India — a place to sell the things you've outgrown at a fair price, and find pre-loved pieces you'll actually wear.">
      <h2>Why auctions</h2>
      <p>
        Selling old stuff online usually means guessing a price, haggling with strangers and dodging spam calls. On Cloro you set a starting bid
        and verified buyers bid against each other — so things sell for what they&apos;re really worth.
      </p>
      <h2>Why verified</h2>
      <p>
        Everyone who trades verifies once with their Aadhaar, so there are no fake accounts. Every listing states its true size with real
        measurements, chats stay on Cloro, and a real support team handles reports.
      </p>
      <h2>A community of good people</h2>
      <p>
        Cloro is built for people aged 13 to 30, with extra protections for members under 18. Our one rule: be honest, be kind, and never cause harm to
        anyone. <Link href="/help#guidelines">Read our community guidelines</Link>.
      </p>
      <p>
        <Link href="/sell">Start selling</Link> · <Link href="/browse">Explore live auctions</Link> · <Link href="/contact">Contact us</Link>
      </p>
    </ProsePage>
  );
}
