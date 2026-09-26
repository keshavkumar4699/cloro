import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/session";
import { settleDue } from "@/lib/auction";
import { formatDateTime, formatINR } from "@/lib/format";
import { ageBand, ageOn } from "@/lib/rules";
import { getReputation } from "@/lib/reputation";
import { ActionForm } from "@/components/action-form";
import { MemberCard } from "@/components/member-card";
import { Countdown } from "@/components/countdown";
import { acceptDeal, addTracking, cancelDeal, declineDeal, leaveReview, markDealDone, offerNextAction } from "@/app/actions/deals";
import { openConversation } from "@/app/actions/chat";

export const metadata = { title: "Deal" };

const STATUS_TEXT: Record<string, string> = {
  OFFERED: "Waiting for the buyer to respond",
  ACCEPTED: "In progress",
  COMPLETED: "Completed",
  DECLINED: "Declined by the buyer",
  EXPIRED: "Expired — the buyer didn't respond in time",
  CANCELLED: "Cancelled",
};

const STEPS = ["Offered", "Accepted", "Done"];

function DealSteps({ status }: { status: string }) {
  const stopped = ["DECLINED", "EXPIRED", "CANCELLED"].includes(status);
  const reached = status === "COMPLETED" ? 3 : status === "ACCEPTED" ? 2 : 1;
  return (
    <ol className="mt-8 flex items-center gap-2" aria-label="Deal progress">
      {STEPS.map((label, i) => {
        const done = !stopped && i < reached;
        return (
          <li key={label} className="flex items-center gap-2 flex-1 last:flex-none">
            <span className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${done ? "bg-brand text-white" : stopped && i === 0 ? "bg-red-100 text-red-700" : "bg-ivory text-muted"}`}>
              {done ? "✓" : i + 1}
            </span>
            <span className={`text-sm ${done ? "font-semibold" : "text-muted"}`}>{label}</span>
            {i < STEPS.length - 1 && <span className={`flex-1 h-0.5 rounded ${!stopped && i + 1 < reached ? "bg-brand" : "bg-line"}`} />}
          </li>
        );
      })}
    </ol>
  );
}

export default async function DealPage({ params }: PageProps<"/deals/[id]">) {
  const { id } = await params;
  const user = await requireMember({ allowAgedOut: true, next: `/deals/${id}` });
  await settleDue();
  const deal = await db.deal.findUnique({
    where: { id },
    include: {
      listing: { include: { images: { take: 1, orderBy: { position: "asc" } } } },
      reviews: true,
    },
  });
  if (!deal || (deal.buyerId !== user.id && deal.sellerId !== user.id)) notFound();

  const isBuyer = deal.buyerId === user.id;
  const otherId = isBuyer ? deal.sellerId : deal.buyerId;
  const [otherRep, activeDeal] = await Promise.all([
    getReputation(otherId),
    db.deal.findFirst({ where: { listingId: deal.listingId, status: { in: ["OFFERED", "ACCEPTED", "COMPLETED"] } } }),
  ]);
  const myReview = deal.reviews.find((r) => r.reviewerId === user.id);
  const iAmMinor = !!user.dob && ageBand(ageOn(user.dob)) === "MINOR";
  const iAmDone = isBuyer ? deal.buyerDoneAt : deal.sellerDoneAt;
  const total = deal.amount + (deal.method === "SHIP" ? deal.listing.shippingEstimate : 0);

  return (
    <div className="mx-auto max-w-4xl px-4 md:px-6 py-8 md:py-12">
      <p className="eyebrow">{isBuyer ? "You're buying" : "You're selling"}</p>
      <div className="mt-3 flex gap-4 items-center">
        {deal.listing.images[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={deal.listing.images[0].url} alt="" className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover" />
        )}
        <div className="min-w-0">
          <Link href={`/listings/${deal.listingId}`} className="serif text-2xl md:text-4xl hover:text-gold line-clamp-2">{deal.listing.title}</Link>
          <p className="text-muted mt-1 text-sm">
            <strong className="text-ink">{formatINR(deal.amount)}</strong> · Size {deal.listing.size} · {deal.rank === 1 ? "Winning bid" : `Bidder #${deal.rank}`}
          </p>
        </div>
      </div>

      <DealSteps status={deal.status} />

      <div className="mt-8 grid md:grid-cols-[1.5fr_1fr] gap-8">
        <div className="space-y-6">
          <div className="card p-5 md:p-6">
            <p className="text-sm text-muted">Status</p>
            <p className="serif text-2xl md:text-3xl mt-1">{STATUS_TEXT[deal.status]}</p>
            {deal.status === "OFFERED" && (
              <p className="text-sm text-muted mt-2">Respond within <Countdown endsAt={deal.respondBy.toISOString()} /> (by {formatDateTime(deal.respondBy)}).</p>
            )}
            {deal.cancelReason && <p className="text-sm text-muted mt-2">Reason: {deal.cancelReason}</p>}
            {deal.method && <p className="text-sm mt-2">Handover: {deal.method === "MEETUP" ? "Meet in person" : "Video call, then shipping"}</p>}
            {deal.method === "SHIP" && <p className="text-sm">Total to pay the seller: {formatINR(deal.amount)} + shipping ~{formatINR(deal.listing.shippingEstimate)} = ~{formatINR(total)}</p>}
            {deal.trackingInfo && <p className="text-sm mt-2">Tracking: <strong>{deal.trackingInfo}</strong></p>}
          </div>

          {deal.status === "OFFERED" && isBuyer && (
            <div className="space-y-4">
              <ActionForm action={acceptDeal} submit="Accept & continue" className="card p-5 md:p-6 space-y-4">
                <input type="hidden" name="dealId" value={deal.id} />
                <p className="serif text-2xl">🎉 You won! How would you like to get it?</p>
                <label className="flex items-start gap-3 text-sm rounded-xl border border-line p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft/40 cursor-pointer">
                  <input type="radio" name="method" value="MEETUP" disabled={!deal.listing.meetupPossible} required className="mt-1" />
                  <span><strong>Meet in person</strong> — inspect it, then pay by UPI or cash. {deal.listing.meetupPossible ? `Seller is in ${deal.listing.city}.` : "(The seller only ships.)"}</span>
                </label>
                <label className="flex items-start gap-3 text-sm rounded-xl border border-line p-3 has-[:checked]:border-brand has-[:checked]:bg-brand-soft/40 cursor-pointer">
                  <input type="radio" name="method" value="SHIP" required className="mt-1" />
                  <span><strong>Video call, then shipping</strong> — see the item live on a video call, pay the seller, and they ship it. You pay shipping (~{formatINR(deal.listing.shippingEstimate)}).</span>
                </label>
              </ActionForm>
              <ActionForm action={declineDeal} submit="Decline" variant="danger" confirm="Decline this item? It will be offered to the next bidder.">
                <input type="hidden" name="dealId" value={deal.id} />
              </ActionForm>
            </div>
          )}

          {deal.status === "ACCEPTED" && (
            <div className="space-y-6">
              {deal.method === "MEETUP" ? (
                <div className="notice space-y-1">
                  <p className="font-medium">Meetup safety checklist</p>
                  <p>• Meet in a busy public place — a mall, café or metro station — in daylight.</p>
                  <p>• {iAmMinor ? "Bring a parent or guardian." : "Bring a friend if you can."} Tell someone where you&apos;re going.</p>
                  <p>• Check the size, condition and any bill or box before paying.</p>
                  <p>• Never scan a QR code to <em>receive</em> money, and never share an OTP.</p>
                </div>
              ) : (
                <div className="notice space-y-1">
                  <p className="font-medium">Video call + shipping checklist</p>
                  <p>• On a <a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer" className="link">Google Meet</a> call, check the item closely: size label, stitching, logos, serial number, bill.</p>
                  <p>• Screen-record the call. Buyers: record an unboxing video when the parcel arrives.</p>
                  <p>• Sellers: ship with tracking and share the courier receipt in chat.</p>
                  <p>• Pay only after the video call. Cloro can&apos;t refund payments made between members, so check the seller&apos;s ratings first.</p>
                </div>
              )}
              {!isBuyer && deal.method === "SHIP" && (
                <ActionForm action={addTracking} submit={deal.trackingInfo ? "Update tracking" : "Share tracking"} className="flex gap-2 items-start">
                  <input type="hidden" name="dealId" value={deal.id} />
                  <input name="tracking" className="input" placeholder="Courier + tracking number" defaultValue={deal.trackingInfo ?? ""} required />
                </ActionForm>
              )}
              {iAmDone ? (
                <p className="text-sm text-muted">You marked this as done. Waiting for the other side to confirm.</p>
              ) : (
                <ActionForm action={markDealDone} submit="Deal done — item handed over & paid" variant="gold">
                  <input type="hidden" name="dealId" value={deal.id} />
                </ActionForm>
              )}
              <details className="text-sm">
                <summary className="cursor-pointer text-muted">Need to cancel?</summary>
                <ActionForm action={cancelDeal} submit="Cancel deal" variant="danger" className="mt-3 space-y-2">
                  <input type="hidden" name="dealId" value={deal.id} />
                  <textarea name="reason" className="input" rows={2} placeholder="What happened?" required />
                  <p className="text-xs text-muted">If the other side did something wrong, open a support ticket instead so we can look into it.</p>
                </ActionForm>
              </details>
            </div>
          )}

          {deal.status === "COMPLETED" && !myReview && (
            <ActionForm action={leaveReview} submit="Submit rating" className="card p-5 md:p-6 space-y-3">
              <input type="hidden" name="dealId" value={deal.id} />
              <p className="serif text-2xl">Rate {otherRep?.user.name ?? "the other member"}</p>
              <div className="flex gap-2 flex-wrap">
                {[5, 4, 3, 2, 1].map((n) => (
                  <label key={n} className="chip cursor-pointer has-[:checked]:chip-active has-[:checked]:bg-ink has-[:checked]:text-white"><input type="radio" name="rating" value={n} required className="sr-only" /> {n}★</label>
                ))}
              </div>
              <textarea name="comment" className="input" rows={2} maxLength={500} placeholder="Optional: how did it go?" />
            </ActionForm>
          )}
          {myReview && <p className="text-sm text-muted">You rated this deal {myReview.rating}★. Thanks for keeping Cloro safe 💚</p>}

          {!isBuyer && ["DECLINED", "EXPIRED", "CANCELLED"].includes(deal.status) && !activeDeal && (
            <ActionForm action={offerNextAction} submit="Offer to the next bidder" variant="gold">
              <input type="hidden" name="listingId" value={deal.listingId} />
            </ActionForm>
          )}
        </div>

        <aside className="space-y-4">
          {otherRep && <MemberCard rep={otherRep} label={isBuyer ? "Seller" : "Buyer"} />}
          {["OFFERED", "ACCEPTED", "COMPLETED"].includes(deal.status) && (
            <ActionForm action={openConversation} submit="Open chat" variant="ghost">
              <input type="hidden" name="listingId" value={deal.listingId} />
              <input type="hidden" name="bidderId" value={deal.buyerId} />
            </ActionForm>
          )}
          <Link href={`/support/new?dealId=${deal.id}`} className="btn btn-ghost w-full">Get help with this deal</Link>
        </aside>
      </div>
    </div>
  );
}
