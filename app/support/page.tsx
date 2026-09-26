import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { formatDateTime } from "@/lib/format";
import { ticketCategoryLabel } from "@/lib/catalog";

export const metadata = { title: "Support" };

const STATUS: Record<string, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  AWAITING_USER: "Waiting for you",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

export default async function SupportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin?next=/support");
  const tickets = await db.ticket.findMany({
    where: { OR: [{ userId: user.id }, { againstId: user.id, againstInvitedAt: { not: null } }] },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <div className="flex items-end justify-between">
        <div>
          <p className="eyebrow">We&apos;re here to help</p>
          <h1 className="text-5xl mt-2">Support</h1>
        </div>
        <Link href="/support/new" className="btn btn-primary">New ticket</Link>
      </div>
      <p className="mt-4 text-sm text-muted">Real people reply, usually within 48 hours. Urgent safety reports are reviewed first.</p>
      <ul className="mt-10 divide-y divide-line border-y border-line">
        {tickets.length === 0 && <li className="py-10 text-center text-muted">No tickets. Check the <Link href="/help" className="link">help centre</Link> for quick answers.</li>}
        {tickets.map((t) => (
          <li key={t.id}>
            <Link href={`/support/${t.id}`} className="flex justify-between gap-4 py-4 px-2 hover:bg-ivory">
              <span>
                <span className="serif text-xl">{t.subject}</span>
                <span className="block text-xs text-muted">{ticketCategoryLabel(t.category)}{t.userId !== user.id && " · reported about you"}</span>
              </span>
              <span className="text-right text-sm">
                <span className={t.status === "AWAITING_USER" ? "text-gold" : "text-muted"}>{STATUS[t.status]}</span>
                <span className="block text-xs text-muted">{formatDateTime(t.updatedAt)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
