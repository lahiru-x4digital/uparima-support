/** Backend DTOs for `/support-desk/ratings/*`. Dates arrive as ISO strings. */

import type { PageMeta } from "@/types/ticket";

export type DisputeStatus = "none" | "disputed" | "resolved";

/**
 * One rating row with its ride, rider and driver context. Staff can never edit `stars` or
 * `comment` — the original content a rider/driver submitted — only the moderation fields below.
 */
export interface Rating {
  id: number;
  ride_id: string;
  rated_by: "rider" | "driver";
  stars: number;
  comment: string | null;
  created_at: string;

  dispute_status: DisputeStatus;
  dispute_reason: string | null;
  disputed_by_user_id: number | null;
  disputed_at: string | null;
  resolution_note: string | null;
  resolved_by_user_id: number | null;
  resolved_at: string | null;
  /** Hidden (soft-deleted) by staff; excluded from the driver's average and the default list. */
  deleted_at: string | null;

  driver_id: number | null;
  rider_user_id: number | null;
  ride_status: string;
  ride_created_at: string;
  fare_lkr: string | null;
  rider_display_name: string | null;
  rider_phone: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  driver_missing: boolean;
  vehicle_number: string | null;
  vehicle_type_name: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
}

export interface RatingListParams {
  page?: number;
  perPage?: number;
  ratedBy?: "rider" | "driver";
  stars?: number;
  driverId?: number;
  riderUserId?: number;
  from?: string;
  to?: string;
  search?: string;
  withComment?: boolean;
  disputeStatus?: DisputeStatus;
  includeDeleted?: boolean;
}

export interface RatingDirectionSummary {
  count: number;
  average: number | null;
  lowStars: number;
}

export interface RatingsMeta extends PageMeta {
  summary: {
    ofDrivers: RatingDirectionSummary;
    ofRiders: RatingDirectionSummary;
  };
}

export interface RatingsPage {
  data: Rating[];
  meta: RatingsMeta;
}

export interface FlagRatingBody {
  reason: string;
}

export interface ResolveRatingBody {
  outcome: "upheld" | "dismissed";
  note: string;
  hide?: boolean;
}

export interface HideRatingBody {
  reason: string;
}
