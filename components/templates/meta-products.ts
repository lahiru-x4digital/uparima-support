import type { TemplateProduct } from "@/types/message-template";

export const PRODUCT_OPTIONS: { value: TemplateProduct | ""; label: string }[] = [
  { value: "", label: "Any product" },
  { value: "riders", label: "Riders" },
  { value: "drivers", label: "Drivers" },
  { value: "ads", label: "Ads" },
  { value: "hire", label: "Hire" },
];

export const productLabel = (p: TemplateProduct | null) => PRODUCT_OPTIONS.find((o) => o.value === p)?.label ?? null;
