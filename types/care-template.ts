export type CareFieldType = "text" | "number" | "date" | "file";
export type CareTemplateStatus = "active" | "inactive";

export interface CareTemplateField {
  key: string;
  label: string;
  type: CareFieldType;
  required: boolean;
}

/** A care template as returned by `/support-desk/care-templates`. */
export interface CareTemplate {
  id: number;
  name: string;
  requestType: string;
  description: string | null;
  priority: string | null;
  status: CareTemplateStatus;
  ticketTitle: string | null;
  ticketDescription: string | null;
  fields: CareTemplateField[];
  createdAt: string;
  updatedAt: string;
}

/** Body for create / update. */
export interface CareTemplateInput {
  name: string;
  requestType: string;
  description: string | null;
  priority: string | null;
  status: CareTemplateStatus;
  ticketTitle: string | null;
  ticketDescription: string | null;
  fields: CareTemplateField[];
}

/** A custom-field row in the form; `id` is a local React key only. */
export interface CareFieldRow extends CareTemplateField {
  id: string;
}

export interface CareTemplateForm {
  name: string;
  requestType: string;
  description: string;
  priority: string;
  status: CareTemplateStatus;
  ticketTitle: string;
  ticketDescription: string;
  fields: CareFieldRow[];
}
