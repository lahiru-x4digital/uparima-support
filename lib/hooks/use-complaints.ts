"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { listComplaints } from "@/lib/services/complaints.service";
import type { ComplaintListParams } from "@/types/complaint";
import { complaintKeys } from "./query-keys";

/** One page of complaints; the previous page stays on screen while the next loads. */
export function useComplaints(params: ComplaintListParams) {
  const { user } = useAuth();
  return useQuery({
    queryKey: complaintKeys.list(params),
    queryFn: () => listComplaints(params),
    enabled: !!user,
    placeholderData: keepPreviousData,
  });
}
