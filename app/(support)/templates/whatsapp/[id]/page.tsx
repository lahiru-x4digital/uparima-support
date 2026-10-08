import { notFound } from "next/navigation";
import { WhatsappTemplateFormPage } from "@/components/templates/whatsapp/whatsapp-template-form";

export default async function EditWhatsappTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  return <WhatsappTemplateFormPage templateId={id} />;
}
