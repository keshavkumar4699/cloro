// Search-friendly copy for the category landing pages (/c/[slug]).
// Each page targets the phrases people actually type when they want to sell or buy that kind of item.

export type CategorySeo = {
  slug: string;
  categoryId: string;
  title: string; // <title>
  h1: string;
  description: string; // meta description, ~150 characters
  intro: string;
  tips: string[];
  faqs: [string, string][];
};

const sharedFaqs: [string, string][] = [
  [
    "How does an online auction get me the right price?",
    "You set a starting bid, and buyers bid against each other until the timer ends. Instead of guessing a fixed price, the item sells for what people are really willing to pay — often more than a fixed-price listing.",
  ],
  [
    "Is it safe to buy and sell on Cloro?",
    "Every member who trades is verified with Aadhaar, so there are no fake accounts. Sizes and measurements are required, chats stay on Cloro, and a real support team steps in if a deal goes wrong.",
  ],
  ["Who pays for shipping?", "The buyer. Each listing shows an estimated shipping cost, and you can also meet in a public place to hand it over."],
];

export const CATEGORY_SEO: CategorySeo[] = [
  {
    slug: "clothes",
    categoryId: "fashion",
    title: "Sell Old Clothes Online & Bid on Pre-loved Fashion in India",
    h1: "Pre-loved fashion, sold by auction",
    description: "Sell your old clothes online at the right price, or bid on pre-loved jackets, dresses, jeans and tops with real measurements. Verified sellers across India.",
    intro:
      "Wardrobe full of clothes you don't wear? List them on Cloro and let buyers bid — you get a fair market price instead of a lowball offer. Buyers see true sizes and real measurements, so what they win actually fits.",
    tips: ["Lay the piece flat and photograph it in daylight.", "Add chest, length and waist in centimetres.", "Mention any marks or loose threads — honesty sells."],
    faqs: sharedFaqs,
  },
  {
    slug: "streetwear",
    categoryId: "streetwear",
    title: "Buy & Sell Streetwear Online by Auction — Hoodies, Tees, Caps | Cloro",
    h1: "Streetwear auctions",
    description: "Bid on streetwear drops and sell your hoodies, oversized tees and caps at the right price. Honest sizes, verified members, auctions that end fairly.",
    intro:
      "From oversized tees to limited hoodies, streetwear holds its value — and auctions find it. Start low, let the bids climb, and get what your piece is really worth.",
    tips: ["Show the tag and any print close-ups.", "Say if it runs oversized.", "Add the original bill or tags if you have them for a trust badge."],
    faqs: sharedFaqs,
  },
  {
    slug: "sneakers",
    categoryId: "sneakers",
    title: "Sell Sneakers Online for the Best Price — Sneaker Auctions in India | Cloro",
    h1: "Sneaker auctions",
    description: "Sell second-hand sneakers online at the best price or bid on Nike, Adidas, Puma and more. Insole length on every pair, verified sellers, fair auctions.",
    intro:
      "Sneaker prices move fast — an auction lets the market decide. Sellers list with the insole length so buyers know the real fit, and late bids extend the timer so nobody gets sniped.",
    tips: ["Photograph the soles, heels and the size label.", "Add the insole length in cm.", "Keep the box? Tick the box badge — it raises bids."],
    faqs: sharedFaqs,
  },
  {
    slug: "bags",
    categoryId: "bags",
    title: "Sell Used Bags Online — Pre-loved Handbags & Backpacks by Auction | Cloro",
    h1: "Pre-loved bags",
    description: "Sell your used handbags, backpacks and messenger bags online at the right price, or bid on pre-loved bags with exact dimensions. Verified members only.",
    intro: "Bags last for years, so a good one deserves a second owner. List it with its dimensions and let buyers bid it up to a fair price.",
    tips: ["Show the inside lining and corners.", "Add width, height and depth.", "Mention the brand's dust bag or card if included."],
    faqs: sharedFaqs,
  },
  {
    slug: "watches",
    categoryId: "watches",
    title: "Sell Watches Online by Auction — Pre-owned Watches in India | Cloro",
    h1: "Pre-owned watches",
    description: "Sell your pre-owned watch online for its real value or bid on Casio, Titan, Fossil and more. Case size listed, bills welcome, verified sellers.",
    intro:
      "A watch's value depends on condition, papers and demand — an auction weighs all three. List with the case size and any bill or box, and let collectors bid.",
    tips: ["Photograph the dial, back and clasp.", "Add the case diameter in mm.", "Show the serial number and bill to buyers on a video call."],
    faqs: sharedFaqs,
  },
  {
    slug: "accessories",
    categoryId: "accessories",
    title: "Sell Accessories Online — Sunglasses, Jewellery & Belts by Auction | Cloro",
    h1: "Accessories",
    description: "Sell sunglasses, belts, jewellery and accessories online at the right price, or bid on pre-loved pieces from verified members across India.",
    intro: "Small things, real value. Sunglasses, belts and jewellery sell quickly when buyers can bid — list in two minutes.",
    tips: ["Use a plain background.", "Add measurements like frame width or belt length.", "Show any scratches clearly."],
    faqs: sharedFaqs,
  },
  {
    slug: "gadgets",
    categoryId: "gadgets",
    title: "Sell Used Gadgets Online at the Right Price — Headphones, Speakers & More | Cloro",
    h1: "Pre-owned gadgets",
    description: "Sell your old headphones, speakers, smartwatches and gadgets online by auction and get the right price. Verified buyers, honest condition, real support.",
    intro: "Upgraded your headphones? Your old ones are worth more than you think. Let buyers bid and sell to a verified member — no spam calls, no time-wasters.",
    tips: ["Show it powered on.", "List what's in the box (charger, cables).", "Mention battery health if relevant."],
    faqs: sharedFaqs,
  },
  {
    slug: "other",
    categoryId: "other",
    title: "Sell Old Stuff Online by Auction — Books, Decor & More | Cloro",
    h1: "Everything else",
    description: "Sell old stuff online at the right price — books, decor, collectibles and more. Buyers bid, you get the market price. Verified members across India.",
    intro: "Books, posters, collectibles, room decor — if someone would love it, someone will bid on it.",
    tips: ["Describe it exactly as it is.", "Add dimensions where they matter.", "Set a starting bid you'd be happy with."],
    faqs: sharedFaqs,
  },
];

export const seoForSlug = (slug: string) => CATEGORY_SEO.find((c) => c.slug === slug);
export const slugForCategory = (categoryId: string) => CATEGORY_SEO.find((c) => c.categoryId === categoryId)?.slug ?? "other";
