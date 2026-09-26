import Link from "next/link";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/session";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const user = await requireMember();
  const convos = await db.conversation.findMany({
    where: { OR: [{ bidderId: user.id }, { listing: { sellerId: user.id } }] },
    include: {
      listing: { select: { title: true, sellerId: true, seller: { select: { name: true } }, images: { take: 1, orderBy: { position: "asc" } } } },
      bidder: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
  convos.sort((a, b) => (b.messages[0]?.createdAt ?? b.createdAt).getTime() - (a.messages[0]?.createdAt ?? a.createdAt).getTime());

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <p className="eyebrow">Private chats</p>
      <h1 className="text-5xl mt-2">Messages</h1>
      <p className="mt-3 text-sm text-muted">Chats open between a seller and their top 3 bidders.</p>
      <ul className="mt-10 divide-y divide-line border-y border-line">
        {convos.length === 0 && <li className="py-10 text-center text-muted">No conversations yet.</li>}
        {convos.map((c) => {
          const other = c.listing.sellerId === user.id ? c.bidder.name : c.listing.seller.name;
          const last = c.messages[0];
          return (
            <li key={c.id}>
              <Link href={`/messages/${c.id}`} className="flex gap-4 py-4 hover:bg-ivory px-2">
                {c.listing.images[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.listing.images[0].url} alt="" className="w-14 h-14 object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="serif text-xl truncate">{c.listing.title}</p>
                  <p className="text-sm text-muted truncate">{other ?? "Member"}{last ? ` · ${last.body}` : ""}</p>
                </div>
                <span className="text-xs text-muted whitespace-nowrap">{formatDateTime(last?.createdAt ?? c.createdAt)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
