import Link from "next/link";
import { BadgeCheck, ChevronRight, Star } from "lucide-react";
import type { Reputation } from "@/lib/reputation";
import { Avatar } from "@/components/avatar";

export function MemberBadges({ rep }: { rep: Reputation }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {rep.verified && <span className="badge badge-brand"><BadgeCheck className="w-3.5 h-3.5" aria-hidden /> Verified</span>}
      {rep.trusted && <span className="badge badge-gold">★ Trusted member</span>}
      {rep.is24Plus && <span className="badge">24+</span>}
      {rep.provenStrikes > 0 && <span className="badge badge-red">{rep.provenStrikes} proven complaint{rep.provenStrikes > 1 ? "s" : ""}</span>}
      {rep.user.status === "BANNED" && <span className="badge badge-red">Banned</span>}
    </div>
  );
}

export function MemberCard({ rep, label }: { rep: Reputation; label: string }) {
  return (
    <Link href={`/u/${rep.user.id}`} className="card !shadow-none p-4 flex items-center gap-4 hover:border-ink/30 transition-colors">
      <Avatar name={rep.user.name} image={rep.user.image} size={48} />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="font-semibold truncate">{rep.user.name ?? "Member"}</p>
        <p className="text-sm text-muted flex items-center gap-1">
          {rep.ratingAvg ? (
            <>
              <Star className="w-3.5 h-3.5 fill-gold text-gold" aria-hidden /> {rep.ratingAvg} ({rep.ratingCount})
            </>
          ) : (
            "New member"
          )}
          <span aria-hidden>·</span> {rep.dealsCompleted} deal{rep.dealsCompleted === 1 ? "" : "s"}
        </p>
        <div className="mt-2">
          <MemberBadges rep={rep} />
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-muted" aria-hidden />
    </Link>
  );
}
