import { Bike, Car, Mail, MessageCircle, Phone, type LucideIcon } from "lucide-react";
import type { Channel, ConversationStatus, Priority, Product } from "@/types/inbox";

export const CHANNELS: Record<Channel, { label: string; icon: LucideIcon; className: string }> = {
  rider_app: { label: "Rider app", icon: Bike, className: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
  driver_app: { label: "Driver app", icon: Car, className: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" },
  phone: { label: "Phone", icon: Phone, className: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300" },
  email: { label: "Email", icon: Mail, className: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
};

export const PRODUCTS: Record<Product, { label: string; className: string }> = {
  riders: { label: "Riders", className: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
  drivers: { label: "Drivers", className: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
  ads: { label: "Ads", className: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  hire: { label: "Hire", className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300" },
  mart: { label: "Mart", className: "bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300" },
};

// Mirrors the backend SupportTicketStatus enum, plus the synthetic
// "bot_only" status for a WhatsApp conversation with no ticket yet.
export const STATUSES: Record<ConversationStatus, { label: string; dot: string }> = {
  pending: { label: "Pending", dot: "bg-amber-500" },
  in_review: { label: "In review", dot: "bg-sky-500" },
  completed: { label: "Completed", dot: "bg-emerald-500" },
  bot_only: { label: "No ticket", dot: "bg-muted-foreground" },
};

export const PRIORITIES: Record<Priority, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
  normal: { label: "Normal", className: "bg-secondary text-secondary-foreground" },
  high: { label: "High", className: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
  urgent: { label: "Urgent", className: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
};

/** Help topics the WhatsApp bot offers; stored on the ticket as `topic`. */
export const TOPICS: Record<string, string> = {
  docs: "Documents",
  pay: "Payments and plan",
  ride: "Ride problem",
  safety: "Safety",
  app: "App problem",
  person: "Talk to a person",
};

export const LANGUAGES: Record<string, string> = { en: "English", si: "Sinhala", ta: "Tamil" };

export const topicLabel = (topic: string | null) => (topic ? (TOPICS[topic] ?? topic) : null);
export const languageLabel = (code: string | null) => (code ? (LANGUAGES[code] ?? code) : null);

export const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
