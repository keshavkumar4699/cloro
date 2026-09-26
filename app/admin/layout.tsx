import Link from "next/link";
import { requireStaff } from "@/lib/session";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireStaff();
  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center gap-6 border-b border-line pb-4 text-xs tracking-[0.16em] uppercase">
        <span className="serif text-2xl normal-case tracking-normal">Support desk</span>
        <Link href="/admin" className="hover:text-gold">Tickets</Link>
        <Link href="/admin/strikes" className="hover:text-gold">Strikes</Link>
        {user.role === "ADMIN" && <Link href="/admin/users" className="hover:text-gold">Members</Link>}
        {user.role === "ADMIN" && <Link href="/admin/audit" className="hover:text-gold">Audit log</Link>}
        <span className="ml-auto badge">{user.role.toLowerCase()}</span>
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
