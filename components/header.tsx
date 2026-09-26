import Link from "next/link";
import { Bell, MessageCircle, Plus, Search, Shield } from "lucide-react";
import { signOut } from "@/auth";
import { db } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/session";
import { Avatar } from "@/components/avatar";

export async function Header() {
  const user = await getCurrentUser();
  const [unread, unreadChats] = user
    ? await Promise.all([
        db.notification.count({ where: { userId: user.id, read: false } }),
        db.notification.count({ where: { userId: user.id, read: false, link: { startsWith: "/messages/" } } }),
      ])
    : [0, 0];

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 md:px-6 h-16 flex items-center gap-4 md:gap-8">
        <Link href="/" className="serif text-[1.75rem] leading-none tracking-tight" aria-label="Cloro home">
          cloro<span className="text-gold">.</span>
        </Link>

        <form action="/browse" className="hidden md:flex flex-1 max-w-md relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input name="q" placeholder="Search sneakers, jackets, brands…" className="input !min-h-10 !py-2 !pl-10 !rounded-full !bg-white/80" aria-label="Search" />
        </form>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-ink-soft">
          <Link href="/browse" className="hover:text-ink">Explore</Link>
          <Link href="/help" className="hover:text-ink">How it works</Link>
          {isStaff(user) && (
            <Link href="/admin" className="inline-flex items-center gap-1 text-brand hover:text-brand-dark">
              <Shield className="w-4 h-4" aria-hidden /> Desk
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:gap-3">
          {user ? (
            <>
              <Link href="/listings/new" className="hidden md:inline-flex btn btn-primary btn-sm">
                <Plus className="w-4 h-4" aria-hidden /> Sell
              </Link>
              <IconLink href="/messages" label="Messages" count={unreadChats} className="hidden md:inline-flex">
                <MessageCircle className="w-5 h-5" />
              </IconLink>
              <IconLink href="/notifications" label="Alerts" count={unread}>
                <Bell className="w-5 h-5" />
              </IconLink>
              <details className="relative group">
                <summary className="list-none cursor-pointer rounded-full ring-2 ring-transparent hover:ring-gold-soft" aria-label="Account menu">
                  <Avatar name={user.name} image={user.image} size={36} />
                </summary>
                <div className="absolute right-0 mt-3 w-60 card p-2 text-sm">
                  <div className="px-3 py-2 border-b border-line mb-1">
                    <p className="font-semibold truncate">{user.name ?? "Member"}</p>
                    <p className="text-xs text-muted truncate">{user.email}</p>
                  </div>
                  <MenuLink href="/dashboard">My Cloro</MenuLink>
                  <MenuLink href={`/u/${user.id}`}>My public profile</MenuLink>
                  <MenuLink href="/messages">Messages</MenuLink>
                  <MenuLink href="/support">Help &amp; support</MenuLink>
                  {isStaff(user) && <MenuLink href="/admin">Support desk</MenuLink>}
                  <form
                    action={async () => {
                      "use server";
                      await signOut({ redirectTo: "/" });
                    }}
                  >
                    <button className="w-full text-left px-3 py-2 rounded-lg hover:bg-ivory text-muted">Sign out</button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <>
              <Link href="/browse" className="md:hidden p-2" aria-label="Search">
                <Search className="w-5 h-5" />
              </Link>
              <Link href="/signin" className="btn btn-primary btn-sm">Sign in</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function IconLink({ href, label, count, children, className = "" }: { href: string; label: string; count: number; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={`relative inline-flex p-2 rounded-full hover:bg-ivory ${className}`} aria-label={count ? `${label} (${count} unread)` : label}>
      {children}
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-gold text-white text-[0.65rem] font-bold flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="block px-3 py-2 rounded-lg hover:bg-ivory">
      {children}
    </Link>
  );
}
