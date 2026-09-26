import Link from "next/link";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { formatDate } from "@/lib/format";
import { ageOn } from "@/lib/rules";
import { ActionForm } from "@/components/action-form";
import { moderateUser } from "@/app/actions/support";

export const metadata = { title: "Members" };

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  await requireStaff("ADMIN");
  const q = typeof (await searchParams).q === "string" ? ((await searchParams).q as string).trim() : "";
  const users = await db.user.findMany({
    where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div>
      <form className="flex gap-2 max-w-md">
        <input name="q" defaultValue={q} className="input" placeholder="Search name or email" />
        <button className="btn btn-primary">Search</button>
      </form>
      <table className="mt-6 w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wider text-muted">
          <tr><th className="py-2">Member</th><th>Age</th><th>Verified</th><th>Status</th><th>Role</th><th>Actions</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {users.map((u) => (
            <tr key={u.id} className="align-top">
              <td className="py-3"><Link href={`/u/${u.id}`} className="link">{u.name}</Link><span className="block text-xs text-muted">{u.email} · joined {formatDate(u.createdAt)}</span></td>
              <td>{u.dob ? ageOn(u.dob) : "—"}</td>
              <td>{u.aadhaarVerifiedAt ? `✓ ···${u.aadhaarLast4}` : "—"}</td>
              <td>{u.status.toLowerCase()}</td>
              <td>
                <ActionForm action={moderateUser} submit="Set" variant="ghost" className="flex gap-1">
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="op" value="role" />
                  <select name="role" defaultValue={u.role} className="input !py-1 !w-auto">
                    <option value="USER">user</option>
                    <option value="MODERATOR">moderator</option>
                    <option value="ADMIN">admin</option>
                  </select>
                </ActionForm>
              </td>
              <td>
                {u.status === "ACTIVE" ? (
                  <ActionForm action={moderateUser} submit="Ban" variant="danger" confirm={`Ban ${u.name}? Their Aadhaar stays blocked from new accounts.`}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="op" value="ban" />
                  </ActionForm>
                ) : (
                  <ActionForm action={moderateUser} submit="Reinstate" variant="ghost">
                    <input type="hidden" name="userId" value={u.id} />
                    <input type="hidden" name="op" value="reinstate" />
                  </ActionForm>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
