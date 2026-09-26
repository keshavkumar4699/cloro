import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser, isStaff, bandOf } from "@/lib/session";
import { rankedBidders, settleListing } from "@/lib/auction";
import { categoryLabel, conditionLabel, MEASUREMENT_LABELS, DURATIONS_DAYS } from "@/lib/catalog";
import { formatDateTime, formatINR } from "@/lib/format";
import { MINOR_BID_CAP, minNextBid, tradeBlock, TRADE_BLOCK_MESSAGES } from "@/lib/rules";
import { getReputation } from "@/lib/reputation";
import { BidPanel } from "@/components/bid-panel";
import { MemberCard } from "@/components/member-card";
import { ActionForm } from "@/components/action-form";
import { answerQuestion, askQuestion, cancelListing, hideQuestion, relistListing, toggleCurated } from "@/app/actions/listings";
import { openConversation } from "@/app/actions/chat";
import { offerNextAction } from "@/app/actions/deals";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/listings/[id]">) {
  const { id } = await params;
  const l = await db.listing.findUnique({ where: { id }, select: { title: true } });
  return { title: l?.title ?? "Lot" };
}

export default async function ListingPage({ params }: PageProps<"/listings/[id]">) {
  const { id } = await params;
  await settleListing(id);
  const listing = await db.listing.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: "asc" } },
      questions: { where: { hidden: false }, orderBy: { createdAt: "desc" }, include: { asker: { select: { name: true } } } },
      deals: { orderBy: { rank: "asc" } },
    },
  });
  if (!listing) notFound();

  const [user, ranked, sellerRep] = await Promise.all([getCurrentUser(), rankedBidders(id), getReputation(listing.sellerId)]);
  const isSeller = user?.id === listing.sellerId;
  const top3 = ranked.slice(0, 3);
  const inTop3 = !!user && top3.some((b) => b.bidderId === user.id);
  const block = user ? tradeBlock(user) : null;
  const canTrade = !!user && !block;
  const isMinor = !!user && bandOf(user) === "MINOR";
  const activeDeal = listing.deals.find((d) => ["OFFERED", "ACCEPTED", "COMPLETED"].includes(d.status));
  const myDeal = user ? listing.deals.find((d) => d.buyerId === user.id || d.sellerId === user.id) : undefined;
  const staff = isStaff(user);

  const bidderNames = isSeller
    ? await db.user.findMany({ where: { id: { in: top3.map((b) => b.bidderId) } }, select: { id: true, name: true } })
    : [];

  const blockedReason = !user ? (
    <Link href={`/signin?next=/listings/${id}`} className="link">Sign in to bid</Link>
  ) : isSeller ? (
    <p className="text-muted">This is your lot.</p>
  ) : block === "NOT_VERIFIED" ? (
    <p>Verify once with Aadhaar to bid. <Link href="/verify" className="link">Verify now</Link></p>
  ) : block === "NEEDS_GUARDIAN" ? (
    <p>A parent or guardian needs to approve your account. <Link href="/guardian" className="link">Get approval</Link></p>
  ) : block === "NOT_ONBOARDED" ? (
    <p><Link href="/welcome" className="link">Finish setting up your account</Link> to bid.</p>
  ) : block ? (
    <p className="text-muted">{TRADE_BLOCK_MESSAGES[block]}</p>
  ) : null;

  const measurements = Object.entries((listing.measurements ?? {}) as Record<string, number>);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <nav className="text-xs text-muted tracking-[0.14em] uppercase">
        <Link href="/browse" className="hover:text-ink">Browse</Link> / <Link href={`/browse?category=${listing.category}`} className="hover:text-ink">{categoryLabel(listing.category)}</Link>
      </nav>

      <div className="mt-6 grid lg:grid-cols-[1.3fr_1fr] gap-12">
        <div className="space-y-3">
          {listing.images.map((img, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={img.id} src={img.url} alt={`${listing.title} photo ${i + 1}`} className={`w-full bg-ivory object-cover ${i === 0 ? "aspect-[4/5]" : "aspect-square"}`} />
          ))}
        </div>

        <div className="space-y-8 lg:sticky lg:top-24 self-start">
          <div>
            {listing.brand && <p className="eyebrow">{listing.brand}</p>}
            <h1 className="text-5xl leading-tight mt-2">{listing.title}</h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="badge">{conditionLabel(listing.condition)}</span>
              {listing.curated && <span className="badge badge-gold">Cloro Curated</span>}
              {listing.hasBill && <span className="badge badge-gold">Bill ✓</span>}
              {listing.hasBox && <span className="badge badge-gold">Box ✓</span>}
              {listing.hasTags && <span className="badge badge-gold">Tags ✓</span>}
            </div>
          </div>

          {listing.status === "CANCELLED" ? (
            <p className="notice">This lot was withdrawn by the seller.</p>
          ) : (
            <BidPanel
              listingId={listing.id}
              initial={{
                status: listing.status,
                currentPrice: listing.currentPrice,
                bidCount: listing.bidCount,
                endsAt: listing.endsAt.toISOString(),
                minNext: minNextBid(listing),
                reserveMet: listing.reserveMet,
                hasReserve: listing.reservePrice !== null,
              }}
              shippingEstimate={listing.shippingEstimate}
              canBid={canTrade && !isSeller}
              blockedReason={blockedReason}
              isTop={!!user && ranked[0]?.bidderId === user.id}
              minorCap={isMinor ? MINOR_BID_CAP : undefined}
            />
          )}

          {myDeal && (
            <Link href={`/deals/${myDeal.id}`} className="btn btn-gold w-full">View your deal</Link>
          )}

          {inTop3 && !isSeller && canTrade && listing.status !== "CANCELLED" && (
            <ActionForm action={openConversation} submit="Chat with the seller" variant="ghost">
              <input type="hidden" name="listingId" value={listing.id} />
            </ActionForm>
          )}

          <dl className="grid grid-cols-2 gap-y-4 text-sm border-t border-line pt-6">
            <dt className="text-muted">Size</dt>
            <dd>{listing.size} <span className="text-muted">· {listing.sizeSystem}</span></dd>
            {measurements.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{MEASUREMENT_LABELS[k] ?? k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
            <dt className="text-muted">Location</dt>
            <dd>{listing.city} · {listing.pincode}</dd>
            <dt className="text-muted">Handover</dt>
            <dd>{listing.meetupPossible ? "Meetup or shipping" : "Shipping only"}</dd>
            <dt className="text-muted">Shipping</dt>
            <dd>~{formatINR(listing.shippingEstimate)}, paid by buyer</dd>
            <dt className="text-muted">Ends</dt>
            <dd>{formatDateTime(listing.endsAt)}</dd>
          </dl>

          <div className="text-[0.95rem] leading-relaxed whitespace-pre-line">{listing.description}</div>

          {sellerRep && <MemberCard rep={sellerRep} label="Seller" />}

          {isSeller && (
            <div className="card p-6 space-y-5">
              <p className="eyebrow">Seller controls</p>
              {top3.length > 0 && (
                <div>
                  <p className="text-sm mb-2">Top bidders — you can chat with the top 3:</p>
                  <ul className="space-y-2">
                    {top3.map((b, i) => (
                      <li key={b.bidderId} className="flex items-center justify-between gap-3 text-sm">
                        <span>#{i + 1} {bidderNames.find((n) => n.id === b.bidderId)?.name ?? "Bidder"} · {formatINR(b.amount)}</span>
                        <ActionForm action={openConversation} submit="Chat" variant="ghost">
                          <input type="hidden" name="listingId" value={listing.id} />
                          <input type="hidden" name="bidderId" value={b.bidderId} />
                        </ActionForm>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {listing.status === "LIVE" && listing.bidCount === 0 && (
                <ActionForm action={cancelListing} submit="Withdraw lot" variant="danger" confirm="Withdraw this lot?">
                  <input type="hidden" name="listingId" value={listing.id} />
                </ActionForm>
              )}
              {listing.status === "ENDED" && !activeDeal && ranked.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted">
                    {listing.deals.length === 0 ? "The reserve wasn't met. You can still sell to the top bidder." : "The last offer didn't go through. You can offer it to the next bidder."}
                  </p>
                  <ActionForm action={offerNextAction} submit={listing.deals.length === 0 ? "Offer to top bidder" : "Offer to next bidder"} variant="gold">
                    <input type="hidden" name="listingId" value={listing.id} />
                  </ActionForm>
                </div>
              )}
              {(listing.status === "UNSOLD" || listing.status === "CANCELLED" || (listing.status === "ENDED" && !activeDeal)) && (
                <ActionForm action={relistListing} submit="Relist" variant="ghost" className="flex gap-2 items-end">
                  <input type="hidden" name="listingId" value={listing.id} />
                  <select name="durationDays" defaultValue="3" className="input w-32">
                    {DURATIONS_DAYS.map((d) => <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>)}
                  </select>
                </ActionForm>
              )}
            </div>
          )}

          {staff && (
            <ActionForm action={toggleCurated} submit={listing.curated ? "Remove from Curated" : "Add to Curated"} variant="ghost">
              <input type="hidden" name="listingId" value={listing.id} />
            </ActionForm>
          )}

          {user && !isSeller && (
            <Link href={`/support/new?listingId=${listing.id}&category=COUNTERFEIT`} className="text-xs text-muted link block">Report this listing</Link>
          )}
        </div>
      </div>

      <section id="qa" className="mt-20 max-w-3xl">
        <p className="eyebrow">Public Q&amp;A</p>
        <h2 className="text-4xl mt-2">Questions for the seller</h2>
        <p className="text-sm text-muted mt-2">Ask about size, flaws, bills or boxes. Answers are visible to everyone.</p>

        {user && canTrade && !isSeller && listing.status === "LIVE" && (
          <ActionForm action={askQuestion} submit="Ask publicly" className="mt-6 space-y-3">
            <input type="hidden" name="listingId" value={listing.id} />
            <textarea name="body" rows={2} maxLength={500} className="input" placeholder="e.g. Is the original bill available? How does it fit?" required />
          </ActionForm>
        )}

        <ul className="mt-8 space-y-6">
          {listing.questions.length === 0 && <li className="text-muted">No questions yet.</li>}
          {listing.questions.map((q) => (
            <li key={q.id} className="border-b border-line pb-6">
              <p className="text-sm"><span className="text-muted">{q.asker.name ?? "Member"} asked:</span> {q.body}</p>
              {q.answer ? (
                <p className="mt-2 pl-4 border-l-2 border-gold text-[0.95rem]">{q.answer}</p>
              ) : isSeller ? (
                <ActionForm action={answerQuestion} submit="Answer" className="mt-3 space-y-2">
                  <input type="hidden" name="questionId" value={q.id} />
                  <textarea name="answer" rows={2} className="input" required />
                </ActionForm>
              ) : (
                <p className="mt-2 text-xs text-muted">Not answered yet.</p>
              )}
              {(isSeller || staff) && (
                <ActionForm action={hideQuestion} submit="Hide" variant="ghost" className="mt-2">
                  <input type="hidden" name="questionId" value={q.id} />
                </ActionForm>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 max-w-3xl">
        <p className="eyebrow">Bid history</p>
        <ul className="mt-4 text-sm divide-y divide-line">
          {ranked.length === 0 && <li className="py-2 text-muted">No bids yet.</li>}
          {ranked.map((b, i) => (
            <li key={b.bidderId} className="py-2 flex justify-between">
              <span>{user?.id === b.bidderId ? "You" : `Bidder ${i + 1}`}</span>
              <span>{formatINR(b.amount)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
