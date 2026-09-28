import Link from "next/link";
import { requireStaff } from "@/lib/session";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireStaff();
  return (
    <div className="mx-auto max-w-6xl px-4 md:px-6 py-8 md:py-10">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line pb-4 text-sm font-medium">
        <span className="serif text-2xl">Support desk</span>
        <Link href="/admin" className="hover:text-gold">Overview &amp; tickets</Link>
        <Link href="/admin/strikes" className="hover:text-gold">Strikes</Link>
        {user.role === "ADMIN" && <Link href="/admin/users" className="hover:text-gold">Members</Link>}
        {user.role === "ADMIN" && <Link href="/admin/audit" className="hover:text-gold">Audit log</Link>}
        <span className="ml-auto badge">{user.role.toLowerCase()}</span>
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
