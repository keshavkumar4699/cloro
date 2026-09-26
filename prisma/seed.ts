// Seeds an admin account, a few verified members and sample live lots for local development.
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const now = new Date();
const days = (n: number) => new Date(now.getTime() + n * 86400000);
const verified = { onboardedAt: now, aadhaarVerifiedAt: now, dobSource: "AADHAAR" as const };

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@cloro.local";
  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: { email: adminEmail, name: "Cloro Admin", role: "ADMIN", dob: new Date(Date.UTC(2001, 4, 10)), city: "Delhi", pincode: "110001", ...verified },
  });

  const members = await Promise.all(
    [
      { email: "aarav@cloro.local", name: "Aarav Sharma", dob: new Date(Date.UTC(2003, 7, 15)), city: "Pune", pincode: "411038" },
      { email: "diya@cloro.local", name: "Diya Iyer", dob: new Date(Date.UTC(2005, 1, 2)), city: "Bengaluru", pincode: "560034" },
      { email: "kabir@cloro.local", name: "Kabir Mehta", dob: new Date(Date.UTC(1999, 10, 20)), city: "Mumbai", pincode: "400050" },
    ].map((m) => db.user.upsert({ where: { email: m.email }, update: {}, create: { ...m, ...verified } })),
  );

  if (await db.listing.count()) {
    console.log("Listings already exist — skipping sample lots.");
    return;
  }

  const lots = [
    { seller: 0, title: "Vintage Levi's trucker jacket", brand: "Levi's", category: "fashion", size: "M", sizeSystem: "Letter (XS–XXL)", m: { chest_cm: 54, length_cm: 64 }, price: 1800, img: "jacket", curated: true, d: 2 },
    { seller: 1, title: "Nike Dunk Low Panda", brand: "Nike", category: "sneakers", size: "UK 8", sizeSystem: "UK", m: { insole_cm: 27 }, price: 5500, img: "sneakers", curated: true, d: 1 },
    { seller: 2, title: "Tan leather messenger bag", brand: "Hidesign", category: "bags", size: "One size", sizeSystem: "Dimensions", m: { width_cm: 38, height_cm: 29, depth_cm: 9 }, price: 2400, img: "bag", curated: true, d: 3 },
    { seller: 0, title: "Casio vintage A168 watch", brand: "Casio", category: "watches", size: "One size", sizeSystem: "One size", m: { case_mm: 36 }, price: 900, img: "watch", curated: false, d: 1 },
    { seller: 1, title: "Oversized heavyweight hoodie", brand: "Bewakoof", category: "streetwear", size: "L", sizeSystem: "Letter (XS–XXL)", m: { chest_cm: 62, length_cm: 72 }, price: 600, img: "hoodie", curated: true, d: 5 },
    { seller: 2, title: "Ray-Ban Wayfarer sunglasses", brand: "Ray-Ban", category: "accessories", size: "50 mm", sizeSystem: "Dimensions", m: { length_cm: 14 }, price: 3200, img: "shades", curated: false, d: 2 },
    { seller: 0, title: "Band graphic tee", brand: null, category: "fashion", size: "S", sizeSystem: "Letter (XS–XXL)", m: { chest_cm: 48, length_cm: 68 }, price: 250, img: "tee", curated: false, d: 3 },
    { seller: 1, title: "Sony WH-CH720N headphones", brand: "Sony", category: "gadgets", size: "One size", sizeSystem: "One size", m: {}, price: 3500, img: "headphones", curated: false, d: 7 },
  ];

  for (const lot of lots) {
    const seller = members[lot.seller];
    await db.listing.create({
      data: {
        sellerId: seller.id,
        title: lot.title,
        description: `${lot.title}. Gently used and well looked after — see photos for details. Happy to do a video call before you bid.`,
        category: lot.category,
        brand: lot.brand,
        condition: "LIKE_NEW",
        size: lot.size,
        sizeSystem: lot.sizeSystem,
        measurements: lot.m,
        startPrice: lot.price,
        currentPrice: lot.price,
        reserveMet: true,
        endsAt: days(lot.d),
        originalEndsAt: days(lot.d),
        shippingEstimate: 90,
        city: seller.city!,
        pincode: seller.pincode!,
        curated: lot.curated,
        hasBox: lot.category === "sneakers",
        images: { create: [{ url: `/seed/${lot.img}.svg`, position: 0 }] },
      },
    });
  }
  console.log(`Seeded admin (${admin.email}), ${members.length} members and ${lots.length} lots.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
