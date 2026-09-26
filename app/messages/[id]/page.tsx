import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/session";
import { conversationAccess } from "@/lib/chat";
import { ageBand, ageOn } from "@/lib/rules";
import { ChatBox } from "@/components/chat-box";
import { ActionForm } from "@/components/action-form";
import { toggleBlock } from "@/app/actions/account";

export const metadata = { title: "Chat" };

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const { id } = await params;
  const user = await requireMember();
  const access = await conversationAccess(id, user.id);
  if (!access?.canRead) notFound();

  const [messages, other, blocked] = await Promise.all([
    db.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "asc" }, take: 200 }),
    db.user.findUnique({ where: { id: access.otherId! }, select: { id: true, name: true, dob: true } }),
    db.block.findUnique({ where: { blockerId_blockedId: { blockerId: user.id, blockedId: access.otherId! } } }),
  ]);
  await db.notification.updateMany({ where: { userId: user.id, link: `/messages/${id}`, read: false }, data: { read: true } });

  const otherIsMinor = !!other?.dob && ageBand(ageOn(other.dob)) === "MINOR";
  const role = user.id === access.sellerId ? "bidder" : "seller";

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link href={`/listings/${access.convo.listingId}`} className="eyebrow hover:text-ink">← {access.convo.listing.title}</Link>
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <h1 className="text-4xl">Chat with {other?.name ?? "member"}</h1>
        <span className="badge">{role}</span>
        {otherIsMinor && <span className="badge badge-gold">Under 18</span>}
      </div>

      <p className="notice mt-6 text-sm">
        Be kind and respectful. Keep deals on Cloro. Never share OTPs or scan QR codes to receive money.
        {otherIsMinor && " This member is under 18 — keep the conversation strictly about the item."}
        {" "}To see the item live, start a <a href="https://meet.google.com/new" target="_blank" rel="noopener noreferrer" className="link">Google Meet</a> and share the link here. Screen-record it for your safety.
      </p>

      <div className="mt-6">
        <ChatBox
          conversationId={id}
          me={user.id}
          initial={messages.map((m) => ({ id: m.id, senderId: m.senderId, body: m.body, flagged: m.flagged, createdAt: m.createdAt.toISOString() }))}
          initialCanSend={access.canSend}
          initialReason={access.reason ?? null}
        />
      </div>

      <div className="mt-6 flex flex-wrap gap-4 items-start">
        <Link href={`/support/new?conversationId=${id}&category=HARASSMENT`} className="btn btn-danger">Report</Link>
        <ActionForm action={toggleBlock} submit={blocked ? "Unblock" : "Block"} variant="ghost" confirm={blocked ? undefined : "Block this member? They won't be able to message you."}>
          <input type="hidden" name="userId" value={access.otherId} />
        </ActionForm>
      </div>
    </div>
  );
}
