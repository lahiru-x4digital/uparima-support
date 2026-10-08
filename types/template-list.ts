/** Query for the paginated template lists (care, email, WhatsApp). */
export interface TemplateListParams {
  q?: string;
  page: number;
  perPage?: number;
  /** Email / WhatsApp: this product plus "any product" templates. */
  product?: string;
  /** WhatsApp only, e.g. "approved". */
  status?: string;
}
