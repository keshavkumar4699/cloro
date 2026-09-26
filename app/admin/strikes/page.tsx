import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { formatDateTime } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { decideStrike } from "@/app/actions/support";

export const metadata = { title: "Strikes" };

export default async function StrikesPage() {
  const staff = await requireStaff();
  const [proposed, appeals, recent] = await Promise.all([
    db.strike.findMany({ where: { status: "PROPOSED" }, include: { user: { select: { name: true } }, proposedBy: { select: { name: true } } }, orderBy: { createdAt: "asc" } }),
    db.strike.findMany({ where: { status: "CONFIRMED", appealedAt: { not: null } }, include: { user: { select: { name: true } } }, orderBy: { appealedAt: "asc" } }),
    db.strike.findMany({ where: { status: { in: ["CONFIRMED", "REJECTED", "OVERTURNED"] } }, include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const isAdmin = staff.role === "ADMIN";

  const Decide = ({ id, ops }: { id: string; ops: [string, string, "gold" | "danger" | "ghost"][] }) =>
    isAdmin ? (
      <div className="flex gap-2 mt-3">
        {ops.map(([op, label, variant]) => (
          <ActionForm key={op} action={decideStrike} submit={label} variant={variant}>
            <input type="hidden" name="strikeId" value={id} />
            <input type="hidden" name="op" value={op} />
          </ActionForm>
        ))}
      </div>
    ) : null;

  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-3xl">Waiting for confirmation</h2>
        {!isAdmin && <p className="text-sm text-muted mt-1">Only an admin can confirm strikes.</p>}
        <ul className="mt-4 space-y-3">
          {proposed.length === 0 && <li className="text-muted">None.</li>}
          {proposed.map((s) => (
            <li key={s.id} className="card p-5">
              <p className="text-sm text-muted">{formatDateTime(s.createdAt)} · proposed by {s.proposedBy.name} · against <Link href={`/u/${s.userId}`} className="link">{s.user.name}</Link>{s.fraud && " · FRAUD"}</p>
              <p className="mt-1">{s.reason}</p>
              {s.ticketId && <Link href={`/admin/tickets/${s.ticketId}`} className="link text-sm">Open ticket</Link>}
              <Decide id={s.id} ops={[["confirm", "Confirm", "danger"], ["reject", "Reject", "ghost"]]} />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-3xl">Appeals</h2>
        <ul className="mt-4 space-y-3">
          {appeals.length === 0 && <li className="text-muted">None.</li>}
          {appeals.map((s) => (
            <li key={s.id} className="card p-5">
              <p className="text-sm text-muted">{s.user.name} · strike: {s.reason}</p>
              <p className="mt-2"><strong>Appeal:</strong> {s.appealText}</p>
              <Decide id={s.id} ops={[["overturn", "Accept appeal (remove strike)", "gold"]]} />
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-3xl">Recent decisions</h2>
        <ul className="mt-4 text-sm divide-y divide-line">
          {recent.map((s) => (
            <li key={s.id} className="py-2">{formatDateTime(s.createdAt)} · {s.user.name} · {s.status.toLowerCase()} · {s.reason}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
