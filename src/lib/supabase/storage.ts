import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const BUCKET = "attachments";

export async function ensureBucket() {
  const { data } = await supabaseAdmin.storage.getBucket(BUCKET);
  if (!data) {
    await supabaseAdmin.storage.createBucket(BUCKET, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
      ],
    });
  }
}

export async function uploadFile(
  path: string,
  file: Buffer,
  contentType: string
): Promise<{ url: string } | { error: string }> {
  await ensureBucket();

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, file, { contentType, upsert: true });

  if (error) return { error: error.message };

  const { data: signedData, error: signedError } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);

  if (signedError || !signedData) {
    return { error: signedError?.message || "Failed to create signed URL" };
  }
  return { url: signedData.signedUrl };
}

export async function getSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);

  if (error || !data) return null;
  return data.signedUrl;
}

export async function deleteFile(path: string): Promise<boolean> {
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
  return !error;
}
