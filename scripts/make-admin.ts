// Promote an existing member to admin. Sign in on the site with Google once first, then run:
//   npm run make-admin -- you@gmail.com
// (In Docker: docker compose -f docker-compose.prod.yml exec app node scripts/make-admin.mjs you@gmail.com)
import { PrismaClient } from "@prisma/client";

const email = process.argv[2]?.trim().toLowerCase();
const db = new PrismaClient();

async function main() {
  if (!email) throw new Error("Usage: npm run make-admin -- you@gmail.com");
  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No member with email ${email}. Sign in on the site with that Google account first.`);
  await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  console.log(`${email} is now an admin. Refresh the site to see the Desk link.`);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
