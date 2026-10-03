import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type Client = Prisma.TransactionClient | typeof db;

export async function notify(userId: string, text: string, link?: string, client: Client = db) {
  await client.notification.create({ data: { userId, text, link } });
}

export async function audit(actorId: string, action: string, target?: string, details?: string) {
  await db.auditLog.create({ data: { actorId, action, target, details } });
}
