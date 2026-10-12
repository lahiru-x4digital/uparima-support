/** The longest message the backend accepts (single or bulk). */
export const SMS_MAX_LENGTH = 1000;

/**
 * Roughly how many SMS one message is billed as. Plain Latin text fits 160 characters in one SMS
 * and 153 in each part of a longer one; anything else (Sinhala, Tamil, emoji) is sent as Unicode,
 * which fits 70, or 67 per part. An estimate: providers count a few symbols double.
 */
export function smsParts(message: string): number {
  if (message.length === 0) return 0;
  // Counted the way the network does: one unit per UTF-16 code unit, so an emoji is two.
  const unicode = /[^\x00-\x7F]/.test(message);
  const [single, perPart] = unicode ? [70, 67] : [160, 153];
  return message.length <= single ? 1 : Math.ceil(message.length / perPart);
}

/** The most customers one bulk batch can go to — the backend's SMS_BULK_MAX_RECIPIENTS. */
export const BULK_SMS_MAX_RECIPIENTS = 5000;
