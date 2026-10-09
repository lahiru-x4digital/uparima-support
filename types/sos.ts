/** Backend DTOs for `/support-desk/sos/*` and the `sos:triggered` / `sos:updated` socket events. */

export type SosStatus = "open" | "acknowledged" | "resolved" | "cancelled";

/** Shape of every SOS list / detail response and of the live socket events. */
export interface SosAlert {
  id: string;
  ride_id: string;
  status: SosStatus;
  triggered_by_role: "rider" | "driver";
  triggered_by_user_id: number;
  /** Where the SOS was pressed. */
  lat: number | null;
  lng: number | null;
  ride_status_at_trigger: string;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  cancelled_at: string | null;
  rider_user_id: number | null;
  driver_id: number | null;
  ride_status: string | null;
  pickup_address: string | null;
  pickup_lat: string | null;
  pickup_lng: string | null;
  dropoff_address: string | null;
  dropoff_lat: string | null;
  dropoff_lng: string | null;
  rider_name: string | null;
  rider_phone: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  vehicle_number: string | null;
  vehicle_type_name: string | null;
  acknowledged_by_name: string | null;
  resolved_by_name: string | null;
}

/** The detail view adds the vehicle's live position. */
export interface SosAlertDetail extends SosAlert {
  driver_lat: number | null;
  driver_lng: number | null;
  /** Epoch milliseconds of the vehicle's last location. */
  driver_location_updated_at: number | null;
}

/** Still needs someone: not yet resolved or cancelled by the person who raised it. */
export const SOS_ACTIVE: SosStatus[] = ["open", "acknowledged"];

export const SOS_TABS = [
  { key: "active", label: "Active" },
  { key: "", label: "All" },
  { key: "resolved", label: "Resolved" },
  { key: "cancelled", label: "Cancelled" },
] as const;
export type SosTab = (typeof SOS_TABS)[number]["key"];
