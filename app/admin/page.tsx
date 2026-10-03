import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { ticketCategoryLabel } from "@/lib/catalog";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Support desk" };

const SLA_MS = 48 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000);
const isOverdue = (createdAt: Date) => Date.now() - createdAt.getTime() > SLA_MS;
const PRIORITY_ORDER: Record<string, number> = { URGENT: 0, HIGH: 1, NORMAL: 2 };

export default async function AdminTickets({ searchParams }: PageProps<"/admin">) {
  const user = await requireStaff();
  const sp = await searchParams;
  const view = typeof sp.view === "string" ? sp.view : "open";
  const where: Prisma.TicketWhereInput =
    view === "mine" ? { assignedToId: user.id, status: { notIn: ["RESOLVED", "CLOSED"] } }
    : view === "closed" ? { status: { in: ["RESOLVED", "CLOSED"] } }
    : { status: { notIn: ["RESOLVED", "CLOSED"] } };

  const tickets = await db.ticket.findMany({
    where,
    include: { user: { select: { name: true } }, assignedTo: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
  const weekAgo = daysAgo(7);
  const [newMembers, verified, liveItems, dealsDone, openTickets, overdue, strikesWeek, frozen] = await Promise.all([
    db.user.count({ where: { createdAt: { gte: weekAgo } } }),
    db.user.count({ where: { aadhaarVerifiedAt: { not: null } } }),
    db.listing.count({ where: { status: "LIVE" } }),
    db.deal.count({ where: { status: "COMPLETED", updatedAt: { gte: weekAgo } } }),
    db.ticket.count({ where: { status: { notIn: ["RESOLVED", "CLOSED"] } } }),
    db.ticket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] }, createdAt: { lt: daysAgo(2) } } }),
    db.strike.count({ where: { status: "CONFIRMED", confirmedAt: { gte: weekAgo } } }),
    db.user.count({ where: { status: "FROZEN" } }),
  ]);
  const stats: [string, number, string?][] = [
    ["New members (7 days)", newMembers],
    ["Verified members", verified],
    ["Live items", liveItems],
    ["Deals done (7 days)", dealsDone],
    ["Open tickets", openTickets],
    ["Waiting over 48h", overdue, overdue > 0 ? "text-red-700" : undefined],
    ["Strikes (7 days)", strikesWeek],
    ["Frozen members", frozen],
  ];

  tickets.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.createdAt.getTime() - b.createdAt.getTime());

  return (
    <div>
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map(([label, value, cls]) => (
          <div key={label} className="card !shadow-none p-4">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className={`serif text-3xl mt-1 ${cls ?? ""}`}>{value.toLocaleString("en-IN")}</dd>
          </div>
        ))}
      </dl>
      <h2 className="section-title mt-10">Tickets</h2>
      <div className="mt-4 flex gap-2 text-sm">
        {[["open", "Open"], ["mine", "Assigned to me"], ["closed", "Resolved"]].map(([v, label]) => (
          <Link key={v} href={`/admin?view=${v}`} className={`chip !py-1.5 ${view === v ? "chip-active" : ""}`}>{label}</Link>
        ))}
      </div>
      <div className="mt-4 card !shadow-none overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-muted">
          <tr className="bg-paper"><th className="p-3">Priority</th><th>Subject</th><th>Category</th><th>From</th><th>Assigned</th><th>Age</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {tickets.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-muted">Inbox zero 🎉</td></tr>}
          {tickets.map((t) => {
            const overdue = view !== "closed" && isOverdue(t.createdAt) && t.status !== "AWAITING_USER";
            return (
              <tr key={t.id} className="hover:bg-ivory">
                <td className="p-3">
                  <span className={`badge ${t.priority === "URGENT" ? "!bg-red-700 !text-white !border-red-700" : t.priority === "HIGH" ? "badge-gold" : ""}`}>{t.priority}</span>
                </td>
                <td><Link href={`/admin/tickets/${t.id}`} className="link">{t.subject}</Link><span className="block text-xs text-muted">{t.status.replace("_", " ").toLowerCase()}</span></td>
                <td>{ticketCategoryLabel(t.category)}</td>
                <td><Link href={`/admin/users/${t.userId}`} className="link">{t.user.name}</Link></td>
                <td>{t.assignedTo?.name ?? "—"}</td>
                <td className={overdue ? "text-red-700 font-medium" : "text-muted"}>{formatDateTime(t.createdAt)}{overdue && " · over 48h"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
