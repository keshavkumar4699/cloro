import Link from "next/link";
import { requireTraderPage, bandOf } from "@/lib/session";
import { listingFeeRequired } from "@/lib/rules";
import { ListingForm } from "@/components/listing-form";

export const metadata = { title: "List an item" };

export default async function NewListingPage() {
  const user = await requireTraderPage();
  const band = bandOf(user);

  if (listingFeeRequired(user)) {
    return (
      <div className="mx-auto max-w-xl px-6 py-20 text-center">
        <h1 className="text-5xl">Your listing pass has run out</h1>
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
    <div className="mx-auto max-w-3xl px-6 py-14 fade-in">
      <p className="eyebrow">New lot</p>
      <h1 className="text-5xl mt-2">List an item</h1>
      <p className="mt-4 text-muted">Describe it exactly as it is. Honest listings sell better — and keep Cloro a community of good people.</p>
      <div className="mt-12">
        <ListingForm city={user.city ?? ""} pincode={user.pincode ?? ""} feeNote={feeNote} />
      </div>
    </div>
  );
}
