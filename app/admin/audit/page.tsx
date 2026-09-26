import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Audit log" };

export default async function AuditPage() {
  await requireStaff("ADMIN");
  const logs = await db.auditLog.findMany({ include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div>
      <p className="text-sm text-muted">Every moderation action and every time staff open a private chat is recorded here.</p>
      <table className="mt-6 w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-muted">
          <tr><th className="py-2">When</th><th>Who</th><th>Action</th><th>Target</th><th>Details</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {logs.map((l) => (
            <tr key={l.id}>
              <td className="py-2 whitespace-nowrap">{formatDateTime(l.createdAt)}</td>
              <td>{l.actor.name}</td>
              <td>{l.action}</td>
              <td className="text-xs text-muted">{l.target}</td>
              <td className="text-xs">{l.details}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
