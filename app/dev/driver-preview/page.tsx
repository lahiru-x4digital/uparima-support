import { notFound } from "next/navigation";
import { DriverPreview } from "@/components/dev/driver-preview";

/**
 * Dev-only playground for the driver dialog and form, rendered with mock data and no sign-in.
 * Never served by a production build.
 */
export default function DriverPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DriverPreview />;
}
