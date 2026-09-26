import Link from "next/link";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/session";
import { formatDateTime } from "@/lib/format";
import { markNotificationsRead } from "@/app/actions/account";

export const metadata = { title: "Alerts" };

export default async function NotificationsPage() {
  const user = await requireMember();
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <div className="flex items-end justify-between">
        <div>
          <p className="eyebrow">In-app alerts</p>
          <h1 className="text-5xl mt-2">Alerts</h1>
        </div>
        {items.some((n) => !n.read) && (
          <form action={markNotificationsRead}>
            <button className="btn btn-ghost">Mark all read</button>
          </form>
        )}
      </div>
      <ul className="mt-10 divide-y divide-line border-y border-line">
        {items.length === 0 && <li className="py-10 text-center text-muted">Nothing yet. Outbid alerts, wins and messages show up here.</li>}
        {items.map((n) => (
          <li key={n.id} className={n.read ? "" : "bg-ivory"}>
            <Link href={n.link ?? "#"} className="flex justify-between gap-4 py-4 px-3">
              <span className="flex gap-3">
                {!n.read && <span className="mt-2 w-1.5 h-1.5 rounded-full bg-gold shrink-0" />}
                {n.text}
              </span>
              <span className="text-xs text-muted whitespace-nowrap">{formatDateTime(n.createdAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
