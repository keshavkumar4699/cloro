import Link from "next/link";
import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { breadcrumbLd } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";
import { slugForCategory } from "@/lib/category-seo";
import { notFound } from "next/navigation";
import { ChevronRight, Flag, MapPin, MessageCircle, Package, Ruler, Sparkles, Truck, Users } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser, isStaff, bandOf } from "@/lib/session";
import { rankedBidders, settleListing } from "@/lib/auction";
import { categoryLabel, conditionLabel, MEASUREMENT_LABELS, DURATIONS_DAYS } from "@/lib/catalog";
import { formatDateTime, formatINR, formatDate } from "@/lib/format";
import { MINOR_BID_CAP, minNextBid, tradeBlock, TRADE_BLOCK_MESSAGES } from "@/lib/rules";
import { getReputation } from "@/lib/reputation";
import { BidPanel } from "@/components/bid-panel";
import { Gallery } from "@/components/gallery";
import { MemberCard } from "@/components/member-card";
import { ActionForm } from "@/components/action-form";
import { Avatar } from "@/components/avatar";
import { WatchButton } from "@/components/watch-button";
import { answerQuestion, askQuestion, cancelListing, hideQuestion, relistListing, toggleCurated } from "@/app/actions/listings";
import { removeListing } from "@/app/actions/support";
import { openConversation } from "@/app/actions/chat";
import { offerNextAction } from "@/app/actions/deals";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/listings/[id]">): Promise<Metadata> {
  const { id } = await params;
  const l = await db.listing.findUnique({
    where: { id },
    select: { title: true, description: true, brand: true, size: true, currentPrice: true, status: true, city: true, category: true, images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } },
  });
  if (!l) return { title: "Item not found", robots: { index: false } };
  const verb = l.status === "LIVE" ? `Bid from ${formatINR(l.currentPrice)}` : l.status === "SOLD" ? `Sold for ${formatINR(l.currentPrice)}` : "Auction ended";
  const title = `${l.title}${l.brand ? ` by ${l.brand}` : ""} — Size ${l.size} · ${verb}`;
  const description = `${l.description.replace(/\s+/g, " ").slice(0, 120)}… ${categoryLabel(l.category)} in ${l.city}. Online auction on Cloro.`;
  return {
    title,
    description,
    alternates: { canonical: `/listings/${id}` },
    robots: l.status === "CANCELLED" ? { index: false, follow: true } : undefined,
    openGraph: { title, description, url: `/listings/${id}`, type: "website", images: l.images[0] ? [{ url: l.images[0].url, alt: l.title }] : undefined },
    twitter: { card: "summary_large_image", title, description, images: l.images[0] ? [l.images[0].url] : undefined },
  };
}

export default async function ListingPage({ params }: PageProps<"/listings/[id]">) {
  const { id } = await params;
  await settleListing(id);
  const listing = await db.listing.findUnique({
    where: { id },
    include: {
      images: { orderBy: { position: "asc" } },
      questions: { where: { hidden: false }, orderBy: { createdAt: "desc" }, include: { asker: { select: { name: true, image: true } } } },
      deals: { orderBy: { rank: "asc" } },
    },
  });
  if (!listing) notFound();

  const [user, ranked, sellerRep, watchers] = await Promise.all([
    getCurrentUser(),
    rankedBidders(id),
    getReputation(listing.sellerId),
    db.watch.count({ where: { listingId: id } }),
  ]);
  const watching = user ? !!(await db.watch.findUnique({ where: { userId_listingId: { userId: user.id, listingId: id } } })) : false;
  const isSeller = user?.id === listing.sellerId;
  const top3 = ranked.slice(0, 3);
  const inTop3 = !!user && top3.some((b) => b.bidderId === user.id);
  const block = user ? tradeBlock(user) : null;
  const canTrade = !!user && !block;
  const isMinor = !!user && bandOf(user) === "MINOR";
  const activeDeal = listing.deals.find((d) => ["OFFERED", "ACCEPTED", "COMPLETED"].includes(d.status));
  const latestDeal = listing.deals.at(-1);
  const myDeal = !user ? undefined : isSeller ? activeDeal ?? latestDeal : [...listing.deals].reverse().find((d) => d.buyerId === user.id);
  const staff = isStaff(user);
  const sellerBanned = sellerRep?.user.status === "BANNED";

  const bidderNames = isSeller
    ? await db.user.findMany({ where: { id: { in: top3.map((b) => b.bidderId) } }, select: { id: true, name: true, image: true } })
    : [];

  const blockedReason = !user ? (
    <p><Link href={`/signin?next=/listings/${id}`} className="font-semibold link">Sign in</Link> to place a bid. It takes a few seconds with Google.</p>
  ) : isSeller ? (
    <p>This is your item — you&apos;ll get an alert for every new bid.</p>
  ) : block === "NOT_VERIFIED" ? (
    <p>One quick step before your first bid: <Link href="/verify" className="font-semibold link">verify with Aadhaar</Link> (takes a minute).</p>
  ) : block === "NEEDS_GUARDIAN" ? (
    <p>A parent or guardian needs to approve your account first. <Link href="/guardian" className="font-semibold link">Send them a link</Link></p>
  ) : block === "NOT_ONBOARDED" ? (
    <p><Link href="/welcome" className="font-semibold link">Finish setting up your account</Link> to bid.</p>
  ) : block ? (
    <p>{TRADE_BLOCK_MESSAGES[block]}</p>
  ) : null;

  const measurements = Object.entries((listing.measurements ?? {}) as Record<string, number>);
  const facts: [React.ElementType, string, string][] = [
    [Ruler, "Size", `${listing.size} · ${listing.sizeSystem}`],
    ...measurements.map(([k, v]) => [Ruler, MEASUREMENT_LABELS[k] ?? k, String(v)] as [React.ElementType, string, string]),
    [Sparkles, "Condition", conditionLabel(listing.condition)],
    [MapPin, "Location", `${listing.city} · ${listing.pincode}`],
    [Users, "Handover", listing.meetupPossible ? "Meetup or shipping" : "Shipping only"],
    [Truck, "Shipping", `~${formatINR(listing.shippingEstimate)}, paid by buyer`],
  ];

  const productLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description.slice(0, 500),
    sku: listing.id,
    category: categoryLabel(listing.category),
    image: listing.images.map((i) => (i.url.startsWith("http") ? i.url : absoluteUrl(i.url))),
    ...(listing.brand ? { brand: { "@type": "Brand", name: listing.brand } } : {}),
    size: `${listing.size} (${listing.sizeSystem})`,
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/listings/${listing.id}`),
      priceCurrency: "INR",
      price: listing.currentPrice,
      priceValidUntil: listing.endsAt.toISOString().slice(0, 10),
      availability: listing.status === "LIVE" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      itemCondition: listing.condition === "NEW_WITH_TAGS" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
      areaServed: "IN",
    },
  };
  const catSlug = slugForCategory(listing.category);

  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-6 md:py-10">
      {listing.status !== "CANCELLED" && (
        <JsonLd
          data={[
            productLd,
            breadcrumbLd([
              { name: "Home", path: "/" },
              { name: categoryLabel(listing.category), path: `/c/${catSlug}` },
              { name: listing.title, path: `/listings/${listing.id}` },
            ]),
          ]}
        />
      )}
      <nav className="flex items-center gap-1 text-sm text-muted" aria-label="Breadcrumb">
        <Link href="/browse" className="hover:text-ink">Explore</Link>
        <ChevronRight className="w-3.5 h-3.5" aria-hidden />
        <Link href={`/c/${catSlug}`} className="hover:text-ink">{categoryLabel(listing.category)}</Link>
      </nav>

      <div className="mt-4 grid lg:grid-cols-[1.15fr_1fr] gap-8 lg:gap-12">
        <div className="lg:sticky lg:top-24 self-start">
          <Gallery images={listing.images} title={listing.title} />
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap gap-2">
              {listing.brand && <span className="eyebrow">{listing.brand}</span>}
              {listing.curated && <span className="badge badge-gold"><Sparkles className="w-3 h-3" aria-hidden /> Cloro Curated</span>}
            </div>
            <div className="flex items-start gap-3 mt-2">
              <h1 className="text-3xl md:text-[2.6rem] leading-tight flex-1">{listing.title}</h1>
              <WatchButton listingId={listing.id} initial={watching} size="lg" />
            </div>
            {watchers > 1 && <p className="mt-1 text-sm text-muted">❤️ {watchers} people saved this</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="badge badge-brand">Size {listing.size}</span>
              <span className="badge">{conditionLabel(listing.condition)}</span>
              {listing.hasBill && <span className="badge badge-gold">Bill ✓</span>}
              {listing.hasBox && <span className="badge badge-gold">Box ✓</span>}
              {listing.hasTags && <span className="badge badge-gold">Tags ✓</span>}
            </div>
          </div>

          {listing.status === "CANCELLED" ? (
            <p className="notice">
              {listing.removedReason || sellerBanned ? "This item was removed by the Cloro team." : "The seller withdrew this item."}
              {listing.removedReason && (isSeller || staff) && <span className="block mt-1 text-xs">Reason: {listing.removedReason}</span>}
            </p>
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
            <Link href={`/deals/${myDeal.id}`} className="btn btn-gold w-full">
              <Package className="w-4 h-4" aria-hidden /> {isSeller ? "View the deal" : "View your deal"}
            </Link>
          )}

          {inTop3 && !isSeller && listing.status !== "CANCELLED" && (canTrade || myDeal) && (
            <ActionForm action={openConversation} submit={<><MessageCircle className="w-4 h-4" aria-hidden /> Chat with the seller</>} variant="ghost" full>
              <input type="hidden" name="listingId" value={listing.id} />
            </ActionForm>
          )}

          <div className="card !shadow-none p-5">
            <h2 className="font-sans text-base font-bold tracking-normal">The details</h2>
            <dl className="mt-3 divide-y divide-line">
              {facts.map(([Icon, k, v]) => (
                <div key={k} className="flex items-center gap-3 py-2.5 text-sm">
                  <Icon className="w-4 h-4 text-muted shrink-0" aria-hidden />
                  <dt className="text-muted w-36 shrink-0">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[0.95rem] leading-relaxed whitespace-pre-line text-ink-soft">{listing.description}</p>
            <p className="mt-4 text-xs text-muted">Listed {formatDate(listing.createdAt)} · ends {formatDateTime(listing.endsAt)}</p>
          </div>

          {sellerRep && <MemberCard rep={sellerRep} label="Sold by" />}

          {isSeller && (
            <div className="card p-5 space-y-5">
              <h2 className="font-sans text-base font-bold tracking-normal">Manage your item</h2>
              {top3.length > 0 ? (
                <div>
                  <p className="text-sm text-muted mb-3">Your top bidders — you can chat with the top 3.</p>
                  <ul className="space-y-2">
                    {top3.map((b, i) => {
                      const bidder = bidderNames.find((n) => n.id === b.bidderId);
                      return (
                        <li key={b.bidderId} className="flex items-center gap-3 rounded-xl bg-paper px-3 py-2">
                          <span className="text-xs font-bold text-muted w-5">#{i + 1}</span>
                          <Avatar name={bidder?.name} image={bidder?.image} size={32} />
                          <span className="flex-1 min-w-0 text-sm"><span className="font-medium truncate block">{bidder?.name ?? "Bidder"}</span>{formatINR(b.amount)}</span>
                          <ActionForm action={openConversation} submit="Chat" variant="ghost" size="sm">
                            <input type="hidden" name="listingId" value={listing.id} />
                            <input type="hidden" name="bidderId" value={b.bidderId} />
                          </ActionForm>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                listing.status === "LIVE" && <p className="text-sm text-muted">No bids yet. Tip: share the link with friends and answer questions quickly.</p>
              )}
              {listing.status === "LIVE" && listing.bidCount === 0 && (
                <ActionForm action={cancelListing} submit="Withdraw item" variant="danger" size="sm" confirm="Withdraw this item? You can relist it later.">
                  <input type="hidden" name="listingId" value={listing.id} />
                </ActionForm>
              )}
              {listing.status === "ENDED" && !activeDeal && ranked.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted">
                    {listing.deals.length === 0 ? "The reserve wasn't met, but you can still sell to the top bidder." : "The last offer didn't go through. You can offer it to the next bidder."}
                  </p>
                  <ActionForm action={offerNextAction} submit={listing.deals.length === 0 ? "Offer to top bidder" : "Offer to next bidder"} variant="gold">
                    <input type="hidden" name="listingId" value={listing.id} />
                  </ActionForm>
                </div>
              )}
              {(listing.status === "UNSOLD" || listing.status === "CANCELLED" || (listing.status === "ENDED" && !activeDeal)) && !sellerBanned && (
                <ActionForm action={relistListing} submit="Relist" variant="ghost" className="flex gap-2 items-center">
                  <input type="hidden" name="listingId" value={listing.id} />
                  <select name="durationDays" defaultValue="3" className="input !w-36" aria-label="Duration">
                    {DURATIONS_DAYS.map((d) => <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>)}
                  </select>
                </ActionForm>
              )}
            </div>
          )}

          {staff && (
            <div className="card !shadow-none p-4 space-y-3 border-dashed">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Staff tools</p>
              <div className="flex flex-wrap gap-2">
                <ActionForm action={toggleCurated} submit={listing.curated ? "Remove from Curated" : "Add to Curated"} variant="ghost" size="sm">
                  <input type="hidden" name="listingId" value={listing.id} />
                </ActionForm>
                <Link href={`/admin/users/${listing.sellerId}`} className="btn btn-ghost btn-sm">Seller&apos;s member file</Link>
              </div>
              {listing.status !== "CANCELLED" && listing.status !== "SOLD" && (
                <ActionForm action={removeListing} submit="Remove item" variant="danger" size="sm" className="flex flex-col sm:flex-row gap-2"
                  confirm="Remove this item from Cloro? The seller and bidders will be told.">
                  <input type="hidden" name="listingId" value={listing.id} />
                  <input name="reason" className="input flex-1" placeholder="Reason shown to the seller, e.g. counterfeit" required minLength={5} />
                </ActionForm>
              )}
            </div>
          )}

          {user && !isSeller && (
            <Link href={`/support/new?listingId=${listing.id}`} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink">
              <Flag className="w-3.5 h-3.5" aria-hidden /> Report this item
            </Link>
          )}
        </div>
      </div>

      <div className="mt-14 grid lg:grid-cols-[1.15fr_1fr] gap-8 lg:gap-12">
        <section id="qa">
          <h2 className="section-title">Questions &amp; answers</h2>
          <p className="text-sm text-muted mt-1">Ask about size, flaws, bills or boxes — everyone can see the answers.</p>

          {listing.status === "LIVE" && !isSeller && (
            canTrade ? (
              <ActionForm action={askQuestion} submit="Ask" className="mt-5 flex flex-col sm:flex-row gap-2 sm:items-start">
                <input type="hidden" name="listingId" value={listing.id} />
                <textarea name="body" rows={1} maxLength={500} className="input flex-1 resize-none" placeholder="e.g. Is the original bill available?" required aria-label="Your question" />
              </ActionForm>
            ) : (
              <p className="mt-4 text-sm text-muted">{user ? "Verify your account to ask a question." : <><Link href={`/signin?next=/listings/${id}`} className="link">Sign in</Link> to ask a question.</>}</p>
            )
          )}

          <ul className="mt-6 space-y-4">
            {listing.questions.length === 0 && <li className="text-muted text-sm">No questions yet — be the first to ask.</li>}
            {listing.questions.map((q) => (
              <li key={q.id} className="card !shadow-none p-4">
                <div className="flex gap-3">
                  <Avatar name={q.asker.name} image={q.asker.image} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted">{q.asker.name ?? "Member"} asked</p>
                    <p className="text-[0.95rem] mt-0.5">{q.body}</p>
                    {q.answer ? (
                      <p className="mt-3 rounded-xl bg-brand-soft/60 px-3 py-2 text-[0.95rem]"><span className="text-xs font-semibold text-brand block">Seller</span>{q.answer}</p>
                    ) : isSeller ? (
                      <ActionForm action={answerQuestion} submit="Answer" size="sm" className="mt-3 flex gap-2 items-start">
                        <input type="hidden" name="questionId" value={q.id} />
                        <textarea name="answer" rows={1} className="input flex-1 resize-none" required aria-label="Your answer" />
                      </ActionForm>
                    ) : (
                      <p className="mt-2 text-xs text-muted">Waiting for the seller to answer.</p>
                    )}
                  </div>
                </div>
                {(isSeller || staff) && (
                  <ActionForm action={hideQuestion} submit="Hide" variant="ghost" size="sm" className="mt-2 text-right">
                    <input type="hidden" name="questionId" value={q.id} />
                  </ActionForm>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="section-title">Bid history</h2>
          <ul className="mt-5 card !shadow-none divide-y divide-line">
            {ranked.length === 0 && <li className="p-4 text-sm text-muted">No bids yet.</li>}
            {ranked.map((b, i) => (
              <li key={b.bidderId} className="px-4 py-3 flex justify-between text-sm">
                <span className={user?.id === b.bidderId ? "font-semibold text-brand" : ""}>{user?.id === b.bidderId ? "You" : `Bidder ${i + 1}`}{i === 0 && " 👑"}</span>
                <span className="font-semibold">{formatINR(b.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
