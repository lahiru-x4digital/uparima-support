import { Suspense } from "react";
import { RideHistory } from "@/components/rides/ride-history";

// useSearchParams (the ?driverId= filter) needs a Suspense boundary in the App Router.
export default function RidesPage() {
  return (
    <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading…</div>}>
      <RideHistory />
    </Suspense>
  );
}
