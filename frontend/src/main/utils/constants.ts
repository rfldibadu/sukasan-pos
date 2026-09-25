export const ITEM_TYPES = ["main", "add_on", "consignment"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const MAIN_CATEGORIES = [
  "coffee",
  "non-coffee",
  "snacks",
  "foods",
] as const;
export type MainCategory = (typeof MAIN_CATEGORIES)[number];