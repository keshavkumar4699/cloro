import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Flag, Video } from "lucide-react";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/session";
import { conversationAccess } from "@/lib/chat";
import { ageBand, ageOn } from "@/lib/rules";
import { ChatBox } from "@/components/chat-box";
import { ActionForm } from "@/components/action-form";
import { Avatar } from "@/components/avatar";
import { toggleBlock } from "@/app/actions/account";

export const metadata = { title: "Chat" };

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const user = await requireMember({ allowAgedOut: true, next: `/messages/${id}` });
  const access = await conversationAccess(id, user.id);
  if (!access?.canRead) notFound();

  const [messages, other, blocked, listing] = await Promise.all([
    db.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" }, take: 300 }),
    db.user.findUnique({ where: { id: access.otherId! }, select: { id: true, name: true, dob: true, image: true } }),
    db.block.findUnique({ where: { blockerId_blockedId: { blockerId: user.id, blockedId: access.otherId! } } }),
    db.listing.findUnique({ where: { id: access.convo.listingId }, select: { id: true, title: true, currentPrice: true, images: { take: 1, orderBy: { position: "asc" } } } }),
  ]);
  await db.notification.updateMany({ where: { userId: user.id, link: `/messages/${id}`, read: false }, data: { read: true } });

  const otherIsMinor = !!other?.dob && ageBand(ageOn(other.dob)) === "MINOR";
  const role = user.id === access.sellerId ? "Bidder" : "Seller";

  return (
    <div className="mx-auto max-w-3xl px-3 md:px-6 py-4 md:py-8">
      <div className="flex items-center gap-3">
        <Link href="/messages" className="p-2 -ml-2 rounded-full hover:bg-ivory" aria-label="All chats"><ChevronLeft className="w-5 h-5" /></Link>
        <Avatar name={other?.name} image={other?.image} size={40} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{other?.name ?? "Member"}</p>
          <p className="text-xs text-muted">{role}{otherIsMinor && " · Under 18"}</p>
        </div>
        <a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" title="Start a Google Meet and paste the link here">
          <Video className="w-4 h-4" aria-hidden /> <span className="hidden sm:inline">Video call</span>
        </a>
      </div>

      {listing && (
        <Link href={`/listings/${listing.id}`} className="mt-3 flex items-center gap-3 rounded-2xl bg-ivory/70 px-3 py-2 hover:bg-ivory">
          {listing.images[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={listing.images[0].url} alt="" className="w-10 h-10 rounded-lg object-cover" />
          )}
          <span className="text-sm truncate flex-1">{listing.title}</span>
          <span className="text-sm font-semibold">₹{listing.currentPrice.toLocaleString("en-IN")}</span>
        </Link>
      )}

      <p className="mt-3 text-xs text-muted leading-relaxed">
        Be kind and keep deals on Cloro. {otherIsMinor ? "This member is under 18 — keep it strictly about the item. " : ""}
        For video calls, start a Google Meet, share the link here and screen-record it for your safety.
      </p>

      <div className="mt-3">
        <ChatBox
          conversationId={id}
          me={user.id}
          initial={messages.map((m) => ({ id: m.id, senderId: m.senderId, body: m.body, flagged: m.flagged, createdAt: m.createdAt.toISOString() }))}
          initialCanSend={access.canSend}
          initialReason={access.reason ?? null}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3 items-start">
        <Link href={`/support/new?conversationId=${id}&category=HARASSMENT`} className="btn btn-danger btn-sm"><Flag className="w-3.5 h-3.5" aria-hidden /> Report</Link>
        <ActionForm action={toggleBlock} submit={blocked ? "Unblock" : "Block"} variant="ghost" size="sm" confirm={blocked ? undefined : "Block this member? They won't be able to message you."}>
          <input type="hidden" name="userId" value={access.otherId} />
        </ActionForm>
      </div>
    </div>
  );
}
