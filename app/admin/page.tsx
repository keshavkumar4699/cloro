import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { ticketCategoryLabel } from "@/lib/catalog";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Support desk" };

const SLA_MS = 48 * 60 * 60 * 1000;
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
  tickets.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.createdAt.getTime() - b.createdAt.getTime());

  return (
    <div>
      <div className="flex gap-3 text-sm">
        {[["open", "Open"], ["mine", "Assigned to me"], ["closed", "Resolved"]].map(([v, label]) => (
          <Link key={v} href={`/admin?view=${v}`} className={`px-3 py-1 border ${view === v ? "bg-ink text-ivory border-ink" : "border-line"}`}>{label}</Link>
        ))}
      </div>
      <table className="mt-6 w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-muted">
          <tr><th className="py-2">Priority</th><th>Subject</th><th>Category</th><th>From</th><th>Assigned</th><th>Age</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {tickets.length === 0 && <tr><td colSpan={6} className="py-10 text-center text-muted">Inbox zero 🎉</td></tr>}
          {tickets.map((t) => {
            const overdue = view !== "closed" && isOverdue(t.createdAt) && t.status !== "AWAITING_USER";
            return (
              <tr key={t.id} className="hover:bg-ivory">
                <td className="py-3">
                  <span className={`badge ${t.priority === "URGENT" ? "!bg-red-700 !text-white !border-red-700" : t.priority === "HIGH" ? "badge-gold" : ""}`}>{t.priority}</span>
                </td>
                <td><Link href={`/admin/tickets/${t.id}`} className="link">{t.subject}</Link><span className="block text-xs text-muted">{t.status.replace("_", " ").toLowerCase()}</span></td>
                <td>{ticketCategoryLabel(t.category)}</td>
                <td>{t.user.name}</td>
                <td>{t.assignedTo?.name ?? "—"}</td>
                <td className={overdue ? "text-red-700 font-medium" : "text-muted"}>{formatDateTime(t.createdAt)}{overdue && " · over 48h"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
