import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { ageOn, ageBand, type AgeBand } from "@/lib/rules";
import { Avatar } from "@/components/avatar";

export const metadata = { title: "Members" };

const PAGE = 50;
const BAND_LABEL: Record<AgeBand, string> = { UNDER_MIN: "Under 13", MINOR: "13–17", CORE: "18–23", ADULT_24_30: "24–30", OVER_MAX: "Over 30" };

/** Date-of-birth range for an age band, as of today. */
function dobRange(band: string): Prisma.DateTimeNullableFilter | undefined {
  const now = new Date();
  const yearsAgo = (y: number) => new Date(Date.UTC(now.getUTCFullYear() - y, now.getUTCMonth(), now.getUTCDate()));
  const ranges: Record<string, [number, number]> = { MINOR: [13, 18], CORE: [18, 24], ADULT_24_30: [24, 31], OVER_MAX: [31, 200] };
  const r = ranges[band];
  return r ? { lte: yearsAgo(r[0]), gt: yearsAgo(r[1]) } : undefined;
}

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requireStaff("ADMIN");
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim().slice(0, 100) : "");
  const q = str("q");
  const page = Math.max(1, Math.min(Number(str("page")) || 1, 1000));

  const where: Prisma.UserWhereInput = {};
  if (q) where.OR = [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { aadhaarLast4: q }];
  if (["ACTIVE", "FROZEN", "BANNED"].includes(str("status"))) where.status = str("status") as "ACTIVE";
  if (["USER", "MODERATOR", "ADMIN"].includes(str("role"))) where.role = str("role") as "USER";
  if (str("verified") === "yes") where.aadhaarVerifiedAt = { not: null };
  if (str("verified") === "no") where.aadhaarVerifiedAt = null;
  const dob = dobRange(str("age"));
  if (dob) where.dob = dob;
  const days = Number(str("joined"));
  if (days > 0) where.createdAt = { gte: new Date(Date.now() - days * 86400000) };

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
      include: { _count: { select: { strikes: { where: { status: "CONFIRMED" } }, ticketsAgainst: true } } },
    }),
    db.user.count({ where }),
  ]);

  const href = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v) params.set(k, v);
    params.set("page", String(p));
    return `/admin/users?${params}`;
  };
  const select = (name: string, label: string, options: [string, string][]) => (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <select id={name} name={name} defaultValue={str(name)} className="input">
        <option value="">Any</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );

  return (
    <div>
      <form className="card !shadow-none p-4 grid grid-cols-2 md:grid-cols-7 gap-3 items-end">
        <div className="col-span-2">
          <label className="label" htmlFor="q">Search</label>
          <input id="q" name="q" defaultValue={q} className="input" placeholder="Name, email or Aadhaar last 4" />
        </div>
        {select("status", "Status", [["ACTIVE", "Active"], ["FROZEN", "Frozen"], ["BANNED", "Banned"]])}
        {select("verified", "Verified", [["yes", "Verified"], ["no", "Not verified"]])}
        {select("age", "Age", [["MINOR", "13–17"], ["CORE", "18–23"], ["ADULT_24_30", "24–30"], ["OVER_MAX", "Over 30"]])}
        {select("role", "Role", [["USER", "Member"], ["MODERATOR", "Moderator"], ["ADMIN", "Admin"]])}
        {select("joined", "Joined", [["1", "Last 24 hours"], ["7", "Last 7 days"], ["30", "Last 30 days"]])}
        <div className="col-span-2 md:col-span-7 flex gap-2 justify-end">
          <Link href="/admin/users" className="btn btn-ghost btn-sm">Clear</Link>
          <button className="btn btn-primary btn-sm">Apply</button>
        </div>
      </form>

      <p className="mt-5 text-sm text-muted">{total.toLocaleString("en-IN")} member{total === 1 ? "" : "s"}</p>
      <div className="mt-3 card !shadow-none overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted bg-paper">
            <tr><th className="p-3">Member</th><th>Age</th><th>Verified</th><th>Status</th><th>Role</th><th>Strikes</th><th>Reports</th><th>Joined</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted">No members match.</td></tr>}
            {users.map((u) => {
              const band = u.dob ? ageBand(ageOn(u.dob)) : null;
              return (
                <tr key={u.id} className="hover:bg-paper">
                  <td className="p-3">
                    <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3">
                      <Avatar name={u.name} image={u.image} size={32} />
                      <span className="min-w-0"><span className="font-semibold block truncate">{u.name ?? "—"}</span><span className="text-xs text-muted block truncate">{u.email}</span></span>
                    </Link>
                  </td>
                  <td>{u.dob ? `${ageOn(u.dob)}` : "—"}{band && <span className="block text-xs text-muted">{BAND_LABEL[band]}</span>}</td>
                  <td>{u.aadhaarVerifiedAt ? <span className="badge badge-brand">✓{u.aadhaarLast4 ? ` ···${u.aadhaarLast4}` : ""}</span> : <span className="text-muted">—</span>}</td>
                  <td><span className={`badge ${u.status === "BANNED" ? "badge-red" : u.status === "FROZEN" ? "badge-gold" : ""}`}>{u.status.toLowerCase()}</span></td>
                  <td className="text-xs">{u.role.toLowerCase()}</td>
                  <td>{u._count.strikes || "—"}</td>
                  <td>{u._count.ticketsAgainst || "—"}</td>
                  <td className="text-xs text-muted whitespace-nowrap">{formatDate(u.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(page > 1 || total > page * PAGE) && (
        <nav className="mt-6 flex items-center justify-center gap-3">
          {page > 1 && <Link href={href(page - 1)} className="btn btn-ghost btn-sm"><ChevronLeft className="w-4 h-4" /> Previous</Link>}
          <span className="text-sm text-muted">Page {page} of {Math.ceil(total / PAGE)}</span>
          {total > page * PAGE && <Link href={href(page + 1)} className="btn btn-ghost btn-sm">Next <ChevronRight className="w-4 h-4" /></Link>}
        </nav>
      )}
    </div>
  );
}
