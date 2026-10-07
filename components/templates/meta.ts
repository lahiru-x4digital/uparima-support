export const REQUEST_TYPES = [
  { value: "complaint", label: "Complaint" },
  { value: "refund", label: "Refund" },
  { value: "lost_item", label: "Lost item" },
  { value: "safety", label: "Safety" },
  { value: "payment", label: "Payment" },
  { value: "other", label: "Other" },
];

export const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const requestTypeLabel = (value: string) => REQUEST_TYPES.find((t) => t.value === value)?.label ?? value;
