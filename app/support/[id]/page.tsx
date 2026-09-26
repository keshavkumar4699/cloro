import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/session";
import { ticketCategoryLabel } from "@/lib/catalog";
import { TicketThread } from "@/components/ticket-thread";
import { ActionForm } from "@/components/action-form";
import { replyTicket } from "@/app/actions/support";

export const metadata = { title: "Support ticket" };

export default async function TicketPage({ params }: PageProps<"/support/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/signin?next=/support/${id}`);
  const ticket = await db.ticket.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true, role: true } } } } },
  });
  if (!ticket) notFound();
  if (isStaff(user)) redirect(`/admin/tickets/${id}`);
  const isOwner = ticket.userId === user.id;
  const isAgainst = ticket.againstId === user.id && !!ticket.againstInvitedAt;
  if (!isOwner && !isAgainst) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <Link href="/support" className="eyebrow hover:text-ink">← Support</Link>
      <h1 className="text-4xl mt-3">{ticket.subject}</h1>
      <p className="text-sm text-muted mt-2">{ticketCategoryLabel(ticket.category)} · {ticket.status.replace("_", " ").toLowerCase()}</p>
      {isAgainst && (
        <p className="notice mt-6 text-sm">
          A member reported a problem involving you. Please share your side calmly, with any evidence (chat, call recordings, courier
          receipts). Strikes are only given after both sides are heard.
        </p>
      )}
      {ticket.resolution && <p className="notice mt-6"><strong>Resolution:</strong> {ticket.resolution}</p>}

      <div className="mt-10">
        <TicketThread messages={ticket.messages} viewerId={user.id} showInternal={false} />
      </div>

      {ticket.status !== "CLOSED" && (
        <ActionForm action={replyTicket} submit="Reply" className="mt-8 space-y-3">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <textarea name="body" rows={4} className="input" required />
          <input name="attachments" type="file" accept="image/jpeg,image/png,image/webp" multiple className="text-sm" />
        </ActionForm>
      )}
    </div>
  );
}
