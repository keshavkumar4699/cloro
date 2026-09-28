import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { formatDate, formatDateTime, formatINR } from "@/lib/format";
import { ageBand, ageOn, rankBidders } from "@/lib/rules";
import { ticketCategoryLabel } from "@/lib/catalog";
import { getReputation } from "@/lib/reputation";
import { Avatar } from "@/components/avatar";
import { MemberBadges } from "@/components/member-card";
import { ActionForm } from "@/components/action-form";
import { addStaffNote, freezeUser, moderateUser, resetVerification } from "@/app/actions/support";

export const metadata = { title: "Member file" };

const BAND: Record<string, string> = { UNDER_MIN: "Under 13", MINOR: "Under 18", CORE: "18–23", ADULT_24_30: "24–30", OVER_MAX: "Over 30" };

function Panel({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="card !shadow-none">
      <h2 className="font-sans text-sm font-bold tracking-normal px-4 pt-4">{title}{count !== undefined && <span className="text-muted font-normal"> · {count}</span>}</h2>
      <div className="p-4 pt-2 text-sm">{children}</div>
    </section>
  );
}

export default async function MemberFilePage({ params }: PageProps<"/admin/users/[id]">) {
  const { id } = await params;
  const staff = await requireStaff();
  const isAdmin = staff.role === "ADMIN";
  const user = await db.user.findUnique({ where: { id } });
  if (!user) notFound();

  const [rep, listings, bidRows, deals, filed, against, strikes, notes, blockedBy, guardian] = await Promise.all([
    getReputation(id),
    db.listing.findMany({ where: { sellerId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.bid.findMany({ where: { bidderId: id }, distinct: ["listingId"], orderBy: { createdAt: "desc" }, take: 20, select: { listingId: true } }),
    db.deal.findMany({ where: { OR: [{ buyerId: id }, { sellerId: id }] }, include: { listing: { select: { title: true } } }, orderBy: { updatedAt: "desc" }, take: 20 }),
    db.ticket.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.ticket.findMany({ where: { againstId: id }, orderBy: { createdAt: "desc" }, take: 20, include: { user: { select: { name: true } } } }),
    db.strike.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, include: { proposedBy: { select: { name: true } } } }),
    db.staffNote.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } }),
    db.block.count({ where: { blockedId: id } }),
    db.guardianRequest.findFirst({ where: { minorId: id, status: "APPROVED" }, include: { guardian: { select: { name: true, email: true } } } }),
  ]);
  const bidListings = await db.listing.findMany({
    where: { id: { in: bidRows.map((b) => b.listingId) } },
    include: { bids: { select: { bidderId: true, amount: true, createdAt: true } } },
  });
  const band = user.dob ? ageBand(ageOn(user.dob)) : null;
  const frozenNow = user.status === "FROZEN" && (!user.frozenUntil || user.frozenUntil > new Date());
  const self = staff.id === user.id;

  return (
    <div className="space-y-6">
      <Link href={isAdmin ? "/admin/users" : "/admin"} className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><ChevronLeft className="w-4 h-4" /> Back</Link>

      <div className="card p-5 md:p-6 flex flex-col md:flex-row gap-5 md:items-center">
        <Avatar name={user.name} image={user.image} size={72} />
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl">{user.name ?? "Member"}</h1>
          <p className="text-sm text-muted">{user.email} · joined {formatDate(user.createdAt)} · {user.city ?? "no city"}</p>
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            {rep && <MemberBadges rep={rep} />}
            <span className={`badge ${user.status === "BANNED" ? "badge-red" : frozenNow ? "badge-gold" : ""}`}>
              {user.status === "BANNED" ? "Banned" : frozenNow ? `Frozen${user.frozenUntil ? ` until ${formatDateTime(user.frozenUntil)}` : " (until reviewed)"}` : "Active"}
            </span>
            <span className="badge">{user.role.toLowerCase()}</span>
          </div>
        </div>
        <Link href={`/u/${user.id}`} className="btn btn-ghost btn-sm">Public profile</Link>
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <div className="space-y-6">
          <Panel title="Identity">
            <dl className="grid grid-cols-2 gap-y-2">
              <dt className="text-muted">Age</dt>
              <dd>{user.dob ? `${ageOn(user.dob)} (${BAND[band!]}) · born ${formatDate(user.dob)}` : "Unknown"} <span className="text-xs text-muted">from {user.dobSource?.toLowerCase() ?? "—"}</span></dd>
              <dt className="text-muted">Aadhaar</dt>
              <dd>{user.aadhaarVerifiedAt ? ["Verified " + formatDate(user.aadhaarVerifiedAt), user.aadhaarName, user.aadhaarLast4 && `···${user.aadhaarLast4}`].filter(Boolean).join(" · ") : "Not verified"}</dd>
              {band === "MINOR" && (
                <>
                  <dt className="text-muted">Guardian</dt>
                  <dd>{user.guardianApprovedAt ? `Approved ${formatDate(user.guardianApprovedAt)} by ${guardian?.guardian?.name ?? user.guardianEmail} (${guardian?.relationship ?? "—"})` : "Not approved"}</dd>
                </>
              )}
              {band === "ADULT_24_30" && (
                <>
                  <dt className="text-muted">Listing pass</dt>
                  <dd>{user.listingPassUntil ? `Until ${formatDate(user.listingPassUntil)}` : user.freeListingUsed ? "None" : "Free listing unused"}</dd>
                </>
              )}
              <dt className="text-muted">Blocked by</dt>
              <dd>{blockedBy} member{blockedBy === 1 ? "" : "s"}</dd>
            </dl>
          </Panel>

          <Panel title="Items listed" count={listings.length}>
            {listings.length === 0 ? <p className="text-muted">None.</p> : (
              <ul className="divide-y divide-line">
                {listings.map((l) => (
                  <li key={l.id} className="py-2 flex justify-between gap-3">
                    <Link href={`/listings/${l.id}`} className="link truncate">{l.title}</Link>
                    <span className="text-muted whitespace-nowrap">{formatINR(l.currentPrice)} · {l.status.toLowerCase()}{l.removedReason ? " (removed)" : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Bids" count={bidListings.length}>
            {bidListings.length === 0 ? <p className="text-muted">None.</p> : (
              <ul className="divide-y divide-line">
                {bidListings.map((l) => {
                  const ranked = rankBidders(l.bids);
                  const pos = ranked.findIndex((b) => b.bidderId === id) + 1;
                  return (
                    <li key={l.id} className="py-2 flex justify-between gap-3">
                      <Link href={`/listings/${l.id}`} className="link truncate">{l.title}</Link>
                      <span className="text-muted whitespace-nowrap">#{pos} · {formatINR(ranked[pos - 1]?.amount ?? 0)} · {l.status.toLowerCase()}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Deals" count={deals.length}>
            {deals.length === 0 ? <p className="text-muted">None.</p> : (
              <ul className="divide-y divide-line">
                {deals.map((d) => (
                  <li key={d.id} className="py-2 flex justify-between gap-3">
                    <span className="truncate">{d.buyerId === id ? "Bought" : "Sold"} · {d.listing.title}</span>
                    <span className="text-muted whitespace-nowrap">{formatINR(d.amount)} · {d.status.toLowerCase()}{d.cancelReason ? ` — ${d.cancelReason}` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Reports about this member" count={against.length}>
            {against.length === 0 ? <p className="text-muted">None.</p> : (
              <ul className="divide-y divide-line">
                {against.map((t) => (
                  <li key={t.id} className="py-2 flex justify-between gap-3">
                    <Link href={`/admin/tickets/${t.id}`} className="link truncate">{t.subject}</Link>
                    <span className="text-muted whitespace-nowrap">{ticketCategoryLabel(t.category)} · by {t.user.name} · {t.status.toLowerCase()}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Tickets they opened" count={filed.length}>
            {filed.length === 0 ? <p className="text-muted">None.</p> : (
              <ul className="divide-y divide-line">
                {filed.map((t) => (
                  <li key={t.id} className="py-2 flex justify-between gap-3">
                    <Link href={`/admin/tickets/${t.id}`} className="link truncate">{t.subject}</Link>
                    <span className="text-muted whitespace-nowrap">{formatDate(t.createdAt)} · {t.status.toLowerCase()}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Staff notes" count={notes.length}>
            <p className="text-xs text-muted">Only staff can see these.</p>
            <ActionForm action={addStaffNote} submit="Add note" size="sm" className="mt-3 space-y-2">
              <input type="hidden" name="userId" value={user.id} />
              <textarea name="body" rows={2} className="input" placeholder="e.g. Warned in chat about sharing phone numbers." required />
            </ActionForm>
            <ul className="mt-4 space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="rounded-xl bg-paper p-3">
                  <p className="whitespace-pre-wrap">{n.body}</p>
                  <p className="text-xs text-muted mt-1">{n.author.name} · {formatDateTime(n.createdAt)}</p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Strikes" count={strikes.length}>
            {strikes.length === 0 ? <p className="text-muted">None.</p> : (
              <ul className="space-y-2">
                {strikes.map((s) => (
                  <li key={s.id} className="rounded-xl bg-paper p-3">
                    <p><span className="badge mr-1">{s.status.toLowerCase()}</span>{s.fraud && <span className="badge badge-red mr-1">fraud</span>}{s.reason}</p>
                    <p className="text-xs text-muted mt-1">{formatDate(s.createdAt)} · proposed by {s.proposedBy.name}{s.appealText ? " · appealed" : ""}</p>
                  </li>
                ))}
              </ul>
            )}
            <Link href="/admin/strikes" className="link text-xs mt-3 inline-block">Review strikes & appeals</Link>
          </Panel>

          {isAdmin && !self && (
            <Panel title="Actions">
              <div className="space-y-5">
                {user.status !== "BANNED" && (frozenNow ? (
                  <ActionForm action={freezeUser} submit="Unfreeze" variant="ghost" size="sm">
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="op" value="unfreeze" />
                  </ActionForm>
                ) : (
                  <ActionForm action={freezeUser} submit="Freeze trading" variant="ghost" size="sm" className="space-y-2">
                    <p className="font-semibold">Pause while you investigate</p>
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="op" value="freeze" />
                    <select name="duration" className="input" defaultValue="24h" aria-label="How long">
                      <option value="24h">24 hours</option>
                      <option value="7d">7 days</option>
                      <option value="review">Until reviewed</option>
                    </select>
                    <input name="reason" className="input" placeholder="Reason (for the audit log)" required />
                  </ActionForm>
                ))}

                {user.aadhaarVerifiedAt && (
                  <ActionForm action={resetVerification} submit="Reset verification" variant="ghost" size="sm" className="space-y-2"
                    confirm="Reset this member's Aadhaar verification? They'll be read-only until they verify again.">
                    <p className="font-semibold">Wrong person verified?</p>
                    <input type="hidden" name="userId" value={user.id} />
                    <input name="reason" className="input" placeholder="Reason, e.g. used a sibling's Aadhaar" required />
                  </ActionForm>
                )}

                <ActionForm action={moderateUser} submit="Set role" variant="ghost" size="sm" className="flex gap-2 items-center">
                  <input type="hidden" name="userId" value={user.id} />
                  <input type="hidden" name="op" value="role" />
                  <select name="role" defaultValue={user.role} className="input" aria-label="Role">
                    <option value="USER">Member</option>
                    <option value="MODERATOR">Moderator</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </ActionForm>

                {user.status === "BANNED" ? (
                  <ActionForm action={moderateUser} submit="Reinstate" variant="ghost" size="sm">
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="op" value="reinstate" />
                  </ActionForm>
                ) : (
                  <ActionForm action={moderateUser} submit="Ban permanently" variant="danger" size="sm" className="space-y-2"
                    confirm={`Ban ${user.name}? Their live items are withdrawn, open deals cancelled, and their Aadhaar can't make a new account.`}>
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="op" value="ban" />
                    <input name="reason" className="input" placeholder="Reason (for the audit log)" required />
                  </ActionForm>
                )}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
