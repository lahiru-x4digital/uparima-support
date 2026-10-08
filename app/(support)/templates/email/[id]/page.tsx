import { notFound } from "next/navigation";
import { EmailTemplateEditorPage } from "@/components/templates/email/email-template-editor";

export default async function EditEmailTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  return <EmailTemplateEditorPage templateId={id} />;
}
