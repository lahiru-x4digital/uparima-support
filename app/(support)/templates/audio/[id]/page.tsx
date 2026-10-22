import { notFound } from "next/navigation";
import { AudioTemplateFormPage } from "@/components/templates/audio/audio-template-form";

export default async function EditAudioTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id < 1) notFound();
  return <AudioTemplateFormPage templateId={id} />;
}
