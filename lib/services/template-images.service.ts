import { apiPost } from "@/lib/api";
import type { UploadedTemplateImage } from "@/types/message-template";

/** Uploads to the riders S3 bucket; `url` is a permanent public link usable in emails. */
export function uploadTemplateImage(file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiPost<UploadedTemplateImage>("/support-desk/templates/images", form, {
    headers: { "Content-Type": undefined },
  });
}
