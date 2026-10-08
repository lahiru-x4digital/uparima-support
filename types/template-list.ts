/** Query for the paginated template lists (care, email, WhatsApp). */
export interface TemplateListParams {
  q?: string;
  page: number;
  perPage?: number;
}
