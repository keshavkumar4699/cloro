import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { audit } from "@/lib/notify";
import { ticketCategoryLabel } from "@/lib/catalog";
import { formatDateTime, formatINR } from "@/lib/format";
import { getReputation } from "@/lib/reputation";
import { ageBand, ageOn } from "@/lib/rules";
import { TicketThread } from "@/components/ticket-thread";
import { ActionForm } from "@/components/action-form";
import { MemberCard } from "@/components/member-card";
import { proposeStrike, replyTicket, updateTicket } from "@/app/actions/support";
import { ImageInput } from "@/components/image-input";

export const metadata = { title: "Ticket" };

export default async function AdminTicketPage({ params }: PageProps<"/admin/tickets/[id]">) {
  const { id } = await params;
  const staff = await requireStaff();
  const ticket = await db.ticket.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true, role: true } } } },
      deal: { include: { listing: { select: { title: true } } } },
      listing: { select: { id: true, title: true } },
      assignedTo: { select: { name: true } },
      strikes: true,
    },
  });
  if (!ticket) notFound();

  const [reporter, against, chat] = await Promise.all([
    getReputation(ticket.userId),
    ticket.againstId ? getReputation(ticket.againstId) : null,
    ticket.conversationId
      ? db.message.findMany({ where: { conversationId: ticket.conversationId }, orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true, dob: true } } } })
      : [],
  ]);
  if (ticket.conversationId) await audit(staff.id, "view_chat", ticket.conversationId, `ticket ${ticket.id}`);

  const people = [
    { rep: reporter, label: "Reported by" },
    ...(against ? [{ rep: against, label: "Other party" }] : []),
  ].filter((p): p is { rep: NonNullable<typeof reporter>; label: string } => !!p.rep);

  return (
    <div className="grid lg:grid-cols-[1.6fr_1fr] gap-10">
      <div>
        <Link href="/admin" className="eyebrow hover:text-ink">← Tickets</Link>
        <h1 className="text-4xl mt-2">{ticket.subject}</h1>
        <p className="text-sm text-muted mt-1">
          {ticketCategoryLabel(ticket.category)} · {ticket.priority} · {ticket.status.replace("_", " ").toLowerCase()} · assigned to {ticket.assignedTo?.name ?? "nobody"}
        </p>
        {ticket.resolution && <p className="notice mt-4"><strong>Resolution:</strong> {ticket.resolution}</p>}

        <div className="mt-8">
          <TicketThread messages={ticket.messages} viewerId={staff.id} showInternal />
        </div>

        <ActionForm action={replyTicket} submit="Send" className="mt-6 space-y-3">
          <input type="hidden" name="ticketId" value={ticket.id} />
          <textarea name="body" rows={4} className="input" required placeholder="Reply to the member(s), or write an internal note." />
          <div className="flex items-center gap-6 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name="internal" /> Internal note (staff only)</label>
            <ImageInput name="attachments" />
          </div>
        </ActionForm>

        {ticket.conversationId && (
          <section className="mt-12">
            <p className="eyebrow">Linked chat (viewing is logged)</p>
            <ol className="mt-3 space-y-2 text-sm card p-4 max-h-96 overflow-y-auto">
              {chat.length === 0 && <li className="text-muted">No messages.</li>}
              {chat.map((m) => (
                <li key={m.id} className={m.flagged ? "text-red-800" : undefined}>
                  <span className="text-muted">{formatDateTime(m.createdAt)} · {m.sender.name}{m.sender.dob && ageBand(ageOn(m.sender.dob)) === "MINOR" ? " (under 18)" : ""}:</span> {m.body}
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <aside className="space-y-6">
        {ticket.deal && (
          <div className="card p-5 text-sm">
            <p className="eyebrow">Deal</p>
            <p className="mt-1">{ticket.deal.listing.title} · {formatINR(ticket.deal.amount)} · {ticket.deal.status.toLowerCase()}</p>
            <p className="text-muted">Method: {ticket.deal.method ?? "—"} · Tracking: {ticket.deal.trackingInfo ?? "—"}</p>
          </div>
        )}
        {ticket.listing && <Link href={`/listings/${ticket.listing.id}`} className="link text-sm block">Listing: {ticket.listing.title}</Link>}
        {people.map((p) => (
          <div key={p.label} className="space-y-1.5">
            <MemberCard rep={p.rep} label={p.label} />
            <Link href={`/admin/users/${p.rep.user.id}`} className="link text-xs">Open member file →</Link>
          </div>
        ))}

        <div className="card p-5 space-y-4">
          <p className="eyebrow">Handle</p>
          {!ticket.assignedToId && (
            <ActionForm action={updateTicket} submit="Assign to me" variant="ghost">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <input type="hidden" name="op" value="assign" />
            </ActionForm>
          )}
          {ticket.againstId && !ticket.againstInvitedAt && (
            <ActionForm action={updateTicket} submit="Ask the other party for their side" variant="ghost">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <input type="hidden" name="op" value="invite" />
            </ActionForm>
          )}
          {ticket.againstInvitedAt && <p className="text-xs text-muted">Other party invited {formatDateTime(ticket.againstInvitedAt)}.</p>}
          <ActionForm action={updateTicket} submit="Update status" className="space-y-2">
            <input type="hidden" name="ticketId" value={ticket.id} />
            <input type="hidden" name="op" value="status" />
            <select name="status" defaultValue={ticket.status} className="input">
              {["OPEN", "IN_PROGRESS", "AWAITING_USER", "RESOLVED", "CLOSED"].map((s) => <option key={s} value={s}>{s.replace("_", " ").toLowerCase()}</option>)}
            </select>
            <textarea name="resolution" rows={2} className="input" placeholder="Resolution note (shown to members)" defaultValue={ticket.resolution ?? ""} />
          </ActionForm>
        </div>

        {people.length > 0 && (
          <div className="card p-5 space-y-3">
            <p className="eyebrow">Strike (proven misconduct only)</p>
            <p className="text-xs text-muted">Only after reviewing evidence and hearing both sides. {staff.role === "ADMIN" ? "As admin, your strike applies immediately." : "An admin must confirm it."}</p>
            <ActionForm action={proposeStrike} submit={staff.role === "ADMIN" ? "Give strike" : "Propose strike"} variant="danger" className="space-y-2">
              <input type="hidden" name="ticketId" value={ticket.id} />
              <select name="userId" className="input" required>
                {people.map((p) => <option key={p.rep.user.id} value={p.rep.user.id}>{p.label}: {p.rep.user.name}</option>)}
              </select>
              <textarea name="reason" rows={3} className="input" required placeholder="What was proven, and by which evidence?" />
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="proven" required /> Evidence reviewed and both sides heard</label>
              <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="fraud" /> Fraud, counterfeit or harming a minor (immediate ban)</label>
            </ActionForm>
            {ticket.strikes.length > 0 && (
              <ul className="text-xs text-muted space-y-1">
                {ticket.strikes.map((s) => <li key={s.id}>{s.status.toLowerCase()}: {s.reason}</li>)}
              </ul>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}
