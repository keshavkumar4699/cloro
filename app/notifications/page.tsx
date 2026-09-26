import Link from "next/link";
import { Bell } from "lucide-react";
import { db } from "@/lib/db";
import { requireMember } from "@/lib/session";
import { formatDateTime } from "@/lib/format";
import { markNotificationsRead } from "@/app/actions/account";

export const metadata = { title: "Alerts" };

export default async function NotificationsPage() {
  const user = await requireMember({ allowAgedOut: true, next: "/notifications" });
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <div className="mx-auto max-w-2xl px-4 md:px-6 py-8 md:py-12">
      <div className="flex items-end justify-between gap-4">
        <h1 className="text-4xl md:text-5xl">Alerts</h1>
        {items.some((n) => !n.read) && (
          <form action={markNotificationsRead}>
            <button className="btn btn-ghost btn-sm">Mark all read</button>
          </form>
        )}
      </div>
      <ul className="mt-6 card !shadow-none divide-y divide-line overflow-hidden">
        {items.length === 0 && (
          <li className="py-14 text-center">
            <Bell className="w-8 h-8 mx-auto text-muted" aria-hidden />
            <p className="mt-3 font-semibold">All quiet for now</p>
            <p className="text-sm text-muted mt-1">Outbid alerts, wins and messages will show up here.</p>
          </li>
        )}
        {items.map((n) => (
          <li key={n.id}>
            <Link href={`/notifications/${n.id}`} className={`flex gap-3 p-4 hover:bg-paper ${n.read ? "" : "bg-gold-soft/30"}`}>
              <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.read ? "bg-transparent" : "bg-gold"}`} aria-hidden />
              <span className="flex-1 text-sm leading-relaxed">
                {n.text}
                <span className="block text-xs text-muted mt-1">{formatDateTime(n.createdAt)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
