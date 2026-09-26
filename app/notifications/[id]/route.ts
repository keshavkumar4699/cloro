import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { safeNext } from "@/lib/session";

/** Opening an alert marks it read, then goes to what it's about. */
export async function GET(_req: Request, ctx: RouteContext<"/notifications/[id]">) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/signin?next=/notifications");
  const { id } = await ctx.params;
  const n = await db.notification.findUnique({ where: { id } });
  if (!n || n.userId !== userId) redirect("/notifications");
  if (!n.read) await db.notification.update({ where: { id }, data: { read: true } });
  redirect(safeNext(n.link, "/notifications"));
}
