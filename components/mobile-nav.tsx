"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Home, MessageCircle, Plus, User } from "lucide-react";

const TABS = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { href: "/browse", label: "Explore", icon: Compass, match: (p: string) => p.startsWith("/browse") },
  { href: "/listings/new", label: "Sell", icon: Plus, match: (p: string) => p === "/listings/new", primary: true },
  { href: "/messages", label: "Chats", icon: MessageCircle, match: (p: string) => p.startsWith("/messages") },
  { href: "/dashboard", label: "Me", icon: User, match: (p: string) => p.startsWith("/dashboard") || p.startsWith("/deals") },
];

export function MobileNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  if (pathname.startsWith("/messages/")) return null; // the chat composer takes this space
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-paper/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]" aria-label="Main">
      <ul className="grid grid-cols-5 h-16">
        {TABS.map((t) => {
          const active = t.match(pathname);
          const href = !signedIn && (t.href === "/messages" || t.href === "/dashboard") ? `/signin?next=${t.href}` : t.href;
          return (
            <li key={t.href}>
              <Link href={href} className={`h-full flex flex-col items-center justify-center gap-0.5 text-[0.7rem] font-medium ${active ? "text-brand" : "text-muted"}`} aria-current={active ? "page" : undefined}>
                {t.primary ? (
                  <span className="w-12 h-12 -mt-6 rounded-full bg-brand text-white flex items-center justify-center shadow-lift ring-4 ring-paper transition-transform active:scale-90">
                    <t.icon className="w-5 h-5" aria-hidden />
                  </span>
                ) : (
                  <span className={`px-4 py-1 rounded-full transition-all duration-300 ${active ? "bg-brand-soft scale-105" : "scale-100"}`}>
                    <t.icon className="w-5 h-5" aria-hidden />
                  </span>
                )}
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
