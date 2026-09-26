import Link from "next/link";
import { requireTraderPage, bandOf } from "@/lib/session";
import { listingFeeRequired } from "@/lib/rules";
import { ListingForm } from "@/components/listing-form";

export const metadata = { title: "List an item" };

export default async function NewListingPage() {
  const user = await requireTraderPage("/listings/new");
  const band = bandOf(user);

  if (listingFeeRequired(user)) {
    return (
      <div className="mx-auto max-w-md px-4 md:px-6 py-16 text-center">
        <p className="text-5xl" aria-hidden>🎟️</p>
        <h1 className="text-4xl mt-4">Your listing pass has run out</h1>
        <p className="mt-4 text-muted">Members aged 24–30 list with a monthly pass. Renew it to keep selling.</p>
        <Link href="/membership" className="btn btn-gold mt-10">Renew listing pass</Link>
      </div>
    );
  }

  const feeNote =
    band === "ADULT_24_30" && !user.freeListingUsed
      ? "This listing is free. After this, members aged 24–30 list with a small monthly pass."
      : undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6 py-8 md:py-12 fade-in">
      <h1 className="text-4xl md:text-5xl">Sell an item</h1>
      <p className="mt-3 text-ink-soft">Takes about two minutes. Describe it exactly as it is — honest listings sell faster.</p>
      <div className="mt-8">
        <ListingForm city={user.city ?? ""} pincode={user.pincode ?? ""} feeNote={feeNote} />
      </div>
    </div>
  );
}
