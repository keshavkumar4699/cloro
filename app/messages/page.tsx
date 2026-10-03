import Link from "next/link";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/session";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireMember({ allowAgedOut: true, next: "/messages" });
  const [convos, unread] = await Promise.all([
    db.conversation.findMany({
      where: { OR: [{ bidderId: user.id }, { listing: { sellerId: user.id } }] },
      include: {
        listing: { select: { title: true, sellerId: true, seller: { select: { name: true } }, images: { take: 1, orderBy: { position: "asc" } } } },
        bidder: { select: { name: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.notification.findMany({ where: { userId: user.id, read: false, link: { startsWith: "/messages/" } }, select: { link: true } }),
  ]);
  const unreadSet = new Set(unread.map((n) => n.link));
  convos.sort((a, b) => (b.messages[0]?.createdAt ?? b.createdAt).getTime() - (a.messages[0]?.createdAt ?? a.createdAt).getTime());

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-6 py-8 md:py-12">
      <h1 className="text-4xl md:text-5xl">Messages</h1>
      <p className="mt-2 text-sm text-muted">Sellers can chat with their top 3 bidders about an item.</p>
      <ul className="mt-6 card !shadow-none divide-y divide-line overflow-hidden">
        {convos.length === 0 && (
          <li className="py-14 text-center">
            <p className="text-4xl" aria-hidden>💬</p>
            <p className="mt-3 font-semibold">No chats yet</p>
            <p className="text-sm text-muted mt-1">When you&apos;re a top bidder, you can chat with the seller here.</p>
            <Link href="/browse" className="btn btn-primary mt-6">Explore items</Link>
          </li>
        )}
        {convos.map((c) => {
          const other = c.listing.sellerId === user.id ? c.bidder.name : c.listing.seller.name;
          const last = c.messages[0];
          const isUnread = unreadSet.has(`/messages/${c.id}`);
          return (
            <li key={c.id}>
              <Link href={`/messages/${c.id}`} className="flex gap-3 p-4 hover:bg-paper">
                {c.listing.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.listing.images[0].url} alt="" className="w-14 h-14 rounded-xl object-cover" />
                ) : <span className="w-14 h-14 rounded-xl bg-ivory" />}
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2">
                    <p className={`truncate ${isUnread ? "font-bold" : "font-semibold"}`}>{other ?? "Member"}</p>
                    <span className="text-xs text-muted whitespace-nowrap">{formatDateTime(last?.createdAt ?? c.createdAt)}</span>
                  </div>
                  <p className="text-xs text-muted truncate">{c.listing.title}</p>
                  <p className={`text-sm truncate mt-0.5 ${isUnread ? "text-ink font-medium" : "text-muted"}`}>
                    {last ? `${last.senderId === user.id ? "You: " : ""}${last.body}` : "No messages yet"}
                  </p>
                </div>
                {isUnread && <span className="mt-2 w-2.5 h-2.5 rounded-full bg-gold shrink-0" aria-label="Unread" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
