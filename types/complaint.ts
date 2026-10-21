import type { PageMeta } from "@/types/ticket";

// Mirrors ComplaintReport in uparima-backend rides-complaint-report.service.ts.

/** Who complained: rider = complaints about drivers, driver = complaints about riders. */
export type ComplaintReporter = "all" | "rider" | "driver";

export interface Complaint {
  kind: "incident" | "ticket";
  id: string;
  createdAt: string;
  rideId: string | null;
  reporterType: "rider" | "driver";
  reporterUserId: number | null;
  reporterDriverId: number | null;
  reporterName: string | null;
  reporterMobile: string | null;
  against: "driver" | "rider";
  againstDriverId: number | null;
  againstRiderUserId: number | null;
  againstName: string | null;
  againstMobile: string | null;
  againstVehicleNumber: string | null;
  category: string;
  subject: string | null;
  detail: string | null;
  /** Incident severity (low…critical) or ticket priority (low…urgent). */
  level: string;
  status: string;
  isOpen: boolean;
  source: string | null;
  ticketId: string | null;
  ticketNumber: string | null;
}

export interface ComplaintTotals {
  all: number;
  byRiders: number;
  byDrivers: number;
  open: number;
  driversComplainedAbout: number;
  ridersComplainedAbout: number;
  /** Person history only: complaints about that person vs. complaints they made. */
  received: number;
  made: number;
}

/** The person a history list is about. */
export interface ComplaintPerson {
  role: "driver" | "rider";
  id: number;
  name: string | null;
  mobile: string | null;
  vehicleNumber: string | null;
}

export interface ComplaintListParams {
  from?: string;
  to?: string;
  reporter?: ComplaintReporter;
  search?: string;
  /** Person history: every complaint about or by this driver / rider, all time (from/to ignored). */
  driverId?: number;
  riderUserId?: number;
  page: number;
  perPage: number;
}

export interface ComplaintsPage {
  data: Complaint[];
  meta: PageMeta & {
    from: string;
    to: string;
    reporter: ComplaintReporter;
    totals: ComplaintTotals;
    person: ComplaintPerson | null;
  };
}
