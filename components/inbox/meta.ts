import { Bike, Car, Mail, MessageCircle, Phone, type LucideIcon } from "lucide-react";
import type { Channel, ConversationStatus, Priority } from "@/types/inbox";

export const CHANNELS: Record<Channel, { label: string; icon: LucideIcon; className: string }> = {
  rider_app: { label: "Rider app", icon: Bike, className: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
  driver_app: { label: "Driver app", icon: Car, className: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  email: { label: "Email", icon: Mail, className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  phone: { label: "Phone", icon: Phone, className: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
};

export const STATUSES: Record<ConversationStatus, { label: string; dot: string }> = {
  open: { label: "Open", dot: "bg-emerald-500" },
  pending: { label: "Pending", dot: "bg-amber-500" },
  resolved: { label: "Resolved", dot: "bg-sky-500" },
  closed: { label: "Closed", dot: "bg-zinc-400" },
};

export const PRIORITIES: Record<Priority, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
  normal: { label: "Normal", className: "bg-secondary text-secondary-foreground" },
  high: { label: "High", className: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  urgent: { label: "Urgent", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
};

export const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
