import Link from "next/link";
import type { Reputation } from "@/lib/reputation";

export function MemberBadges({ rep }: { rep: Reputation }) {
  return (
    <div className="flex flex-wrap gap-2">
      {rep.verified && <span className="badge badge-gold">Aadhaar verified</span>}
      {rep.trusted && <span className="badge badge-gold">Trusted member</span>}
      {rep.is24Plus && <span className="badge">24+</span>}
      {rep.provenStrikes > 0 && <span className="badge text-red-800 border-red-200">{rep.provenStrikes} proven complaint{rep.provenStrikes > 1 ? "s" : ""}</span>}
      {rep.user.status === "BANNED" && <span className="badge text-red-800 border-red-200">Banned</span>}
    </div>
  );
}

export function MemberCard({ rep, label }: { rep: Reputation; label: string }) {
  return (
    <div className="card p-5">
      <p className="eyebrow">{label}</p>
      <Link href={`/u/${rep.user.id}`} className="serif text-2xl mt-1 block hover:text-gold">{rep.user.name ?? "Member"}</Link>
      <p className="text-sm text-muted mt-1">
        {rep.ratingAvg ? `★ ${rep.ratingAvg} (${rep.ratingCount})` : "No ratings yet"} · {rep.dealsCompleted} deal{rep.dealsCompleted === 1 ? "" : "s"} done
      </p>
      <div className="mt-3">
        <MemberBadges rep={rep} />
      </div>
    </div>
  );
}
