import { notFound } from "next/navigation";
import { TemplateFormPage } from "@/components/templates/template-form";

export default async function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  return <TemplateFormPage templateId={id} />;
}
