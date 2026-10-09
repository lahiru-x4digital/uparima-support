import { notFound } from "next/navigation";
import { SosAlertDetail } from "@/components/sos/sos-alert-detail";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function SosAlertPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  if (!UUID.test(id)) notFound();
  return <SosAlertDetail id={id} />;
}
