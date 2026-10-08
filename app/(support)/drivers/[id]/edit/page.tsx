import { notFound } from "next/navigation";
import { DriverEdit } from "@/components/drivers/driver-edit";

export default async function EditDriverPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  if (!/^\d+$/.test(id)) notFound();
  return <DriverEdit id={id} />;
}
