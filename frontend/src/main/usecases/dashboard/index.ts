export * from "./schema";
export * from "./interface";

export const formatIDR = (val: number = 0) =>
  `Rp${val.toLocaleString("id-ID", { minimumFractionDigits: 0 })}`;