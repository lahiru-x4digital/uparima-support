// The admin dashboard (uparima-classified-dashbord/lib/phone-search.ts) has the same rule.

/**
 * Whether a search term names this phone number. Phones are stored as 94XXXXXXXXX, but staff type
 * them the way they are dialled: 07X…, +94 7X…, with spaces or dashes.
 */
export function phoneMatches(phone: string | null | undefined, term: string): boolean {
  const typed = term.replace(/[\s()+-]/g, "");
  if (!/^\d{3,}$/.test(typed)) return false;
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.includes(typed)) return true;
  // The leading 0 of a local number stands in for the country code.
  return typed.startsWith("0") && digits.includes(`94${typed.slice(1)}`);
}
