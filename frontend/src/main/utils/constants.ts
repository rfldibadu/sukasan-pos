export const ITEM_TYPES = ["MAIN", "ADD_ON", "CONSIGNMENT"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const MAIN_CATEGORIES = [
  "COFFEE",
  "NON_COFFEE",
  "SNACKS",
  "FOODS",
  "CUSTOM"
] as const;
export type MainCategory = (typeof MAIN_CATEGORIES)[number];