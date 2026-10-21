import { apiGetPage } from "@/lib/api";
import type { Complaint, ComplaintListParams, ComplaintsPage } from "@/types/complaint";

// Complaint Report — the backend's `/support-desk/complaints` (needs incident.view). The same
// list as the classified dashboard's Rides → Reports → Complaint Report.

const BASE = "/support-desk/complaints";

/** One page of complaints, newest first; `meta.totals` carries the counts for the range. */
export async function listComplaints(params: ComplaintListParams): Promise<ComplaintsPage> {
  return (await apiGetPage<Complaint>(BASE, { params })) as ComplaintsPage;
}
