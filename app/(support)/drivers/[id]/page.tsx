import { notFound } from "next/navigation";
import { DriverDetail } from "@/components/drivers/driver-detail";

export default async function DriverPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  if (!/^\d+$/.test(id)) notFound();
  return <DriverDetail id={id} />;
}
