import { notFound } from "next/navigation";
import { DriverEdit } from "@/components/drivers/driver-edit";
import { isDriverSectionKey } from "@/lib/driver-form-rules";

export default async function EditDriverPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string | string[] }>;
}) {
  const id = (await params).id;
  if (!/^\d+$/.test(id)) notFound();
  const section = (await searchParams).section;
  // ?section=license opens the form at that section (from a card's pencil on the driver page).
  return <DriverEdit id={id} section={typeof section === "string" && isDriverSectionKey(section) ? section : undefined} />;
}
