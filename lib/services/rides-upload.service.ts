import { apiPost } from "@/lib/api";

/**
 * Uploads a file to the rides bucket through the backend's presign / confirm flow
 * (`/rides/upload/riders/*`), which any signed-in staff account may use. `context` must be one of
 * the backend's RIDERS_UPLOAD_CONTEXTS keys (e.g. "bankSlip"). Returns the stored S3 key.
 */
export async function uploadRidesFile(
  file: File,
  context: string,
  entityId: string = crypto.randomUUID(),
): Promise<string> {
  const { uploadUrl, s3Key } = await apiPost<{ uploadUrl: string; s3Key: string }>(
    "/rides/upload/riders/presign",
    { context, contentType: file.type, entityId, fileName: file.name },
  );

  const put = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!put.ok) throw new Error("Failed to upload file to storage");

  await apiPost("/rides/upload/riders/confirm", { s3Key, context });
  return s3Key;
}
