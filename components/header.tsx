import Link from "next/link";
import { signOut } from "@/auth";
import { db } from "@/lib/db";
import { getCurrentUser, isStaff } from "@/lib/session";

export async function Header() {
  const user = await getCurrentUser();
  const unread = user ? await db.notification.count({ where: { userId: user.id, read: false } }) : 0;

  return (
    <header className="sticky top-0 z-30 bg-ink text-ivory">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center gap-8">
        <Link href="/" className="serif text-2xl tracking-[0.35em]" aria-label="Cloro home">
          CLORO
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-[0.72rem] tracking-[0.18em] uppercase text-ivory/80">
          <Link href="/browse" className="hover:text-gold-soft">Browse</Link>
          <Link href="/listings/new" className="hover:text-gold-soft">Sell</Link>
          {user && <Link href="/messages" className="hover:text-gold-soft">Messages</Link>}
          {user && <Link href="/dashboard" className="hover:text-gold-soft">My Cloro</Link>}
          {isStaff(user) && <Link href="/admin" className="text-gold-soft">Admin</Link>}
        </nav>
        <div className="ml-auto flex items-center gap-5 text-[0.72rem] tracking-[0.18em] uppercase">
          {user ? (
            <>
              <Link href="/notifications" className="relative mr-3 hover:text-gold-soft" aria-label={`${unread} unread notifications`}>
                Alerts
                {unread > 0 && (
                  <span className="absolute -top-2 -right-4 min-w-5 h-5 px-1 rounded-full bg-gold text-[0.65rem] tracking-normal flex items-center justify-center">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="hover:text-gold-soft uppercase tracking-[0.18em]">Sign out</button>
              </form>
            </>
          ) : (
            <Link href="/signin" className="border border-ivory/40 px-4 py-2 hover:border-gold-soft hover:text-gold-soft">
              Sign in
            </Link>
          )}
        </div>
      </div>
      <nav className="md:hidden flex justify-around border-t border-ivory/10 py-2 text-[0.65rem] tracking-[0.16em] uppercase text-ivory/80">
        <Link href="/browse">Browse</Link>
        <Link href="/listings/new">Sell</Link>
        {user && <Link href="/messages">Messages</Link>}
        {user && <Link href="/dashboard">My Cloro</Link>}
        {isStaff(user) && <Link href="/admin">Admin</Link>}
      </nav>
    </header>
  );
}
