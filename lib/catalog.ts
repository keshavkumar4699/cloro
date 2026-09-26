export const CATEGORIES = [
  { id: "fashion", label: "Fashion", measurements: ["chest_cm", "length_cm", "waist_cm"] },
  { id: "streetwear", label: "Streetwear", measurements: ["chest_cm", "length_cm", "waist_cm"] },
  { id: "sneakers", label: "Sneakers", measurements: ["insole_cm"] },
  { id: "bags", label: "Bags", measurements: ["width_cm", "height_cm", "depth_cm"] },
  { id: "watches", label: "Watches", measurements: ["case_mm", "strap_cm"] },
  { id: "accessories", label: "Accessories", measurements: ["length_cm"] },
  { id: "gadgets", label: "Gadgets", measurements: ["screen_in"] },
  { id: "other", label: "Other", measurements: [] as string[] },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const FEATURED_CATEGORIES: CategoryId[] = ["fashion", "streetwear", "sneakers", "watches", "bags"];

export const MEASUREMENT_LABELS: Record<string, string> = {
  chest_cm: "Chest (cm)",
  length_cm: "Length (cm)",
  waist_cm: "Waist (cm)",
  insole_cm: "Insole length (cm)",
  width_cm: "Width (cm)",
  height_cm: "Height (cm)",
  depth_cm: "Depth (cm)",
  case_mm: "Case diameter (mm)",
  strap_cm: "Strap length (cm)",
  screen_in: "Screen (inches)",
};

export const CONDITIONS = [
  { id: "NEW_WITH_TAGS", label: "New with tags" },
  { id: "LIKE_NEW", label: "Like new" },
  { id: "GOOD", label: "Good" },
  { id: "FAIR", label: "Fair" },
] as const;

export const SIZE_SYSTEMS = ["Letter (XS–XXL)", "IN", "UK", "US", "EU", "Waist (in)", "One size", "Dimensions"] as const;

export const DURATIONS_DAYS = [1, 2, 3, 5, 7] as const;

export const TICKET_CATEGORIES = [
  { id: "WRONG_ITEM", label: "Wrong item received" },
  { id: "NOT_RECEIVED", label: "Item not received" },
  { id: "NOT_AS_DESCRIBED", label: "Not as described / wrong size" },
  { id: "NO_SHOW", label: "No-show at meetup" },
  { id: "HARASSMENT", label: "Harassment or inappropriate behaviour" },
  { id: "SCAM", label: "Scam or fraud attempt" },
  { id: "COUNTERFEIT", label: "Counterfeit item" },
  { id: "ACCOUNT", label: "Account or verification help" },
  { id: "OTHER", label: "Something else" },
] as const;

export const categoryLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;
export const conditionLabel = (id: string) => CONDITIONS.find((c) => c.id === id)?.label ?? id;
export const ticketCategoryLabel = (id: string) => TICKET_CATEGORIES.find((c) => c.id === id)?.label ?? id;
