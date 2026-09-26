import { auth } from "@/auth";
import { db } from "@/lib/db";
import { conversationAccess } from "@/lib/chat";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: RouteContext<"/api/conversations/[id]">) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const access = await conversationAccess(id, userId);
  if (!access?.canRead) return Response.json({ error: "Not found" }, { status: 404 });

  const after = new URL(req.url).searchParams.get("after");
  const messages = await db.message.findMany({
    where: { conversationId: id, ...(after ? { createdAt: { gt: new Date(after) } } : {}) },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, senderId: true, body: true, flagged: true, createdAt: true },
  });
  return Response.json({ messages, canSend: access.canSend, reason: access.reason });
}
