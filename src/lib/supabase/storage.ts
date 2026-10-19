import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const BUCKET = "attachments";

let bucketReady: Promise<void> | null = null;

function ensureBucketOnce() {
  bucketReady ??= ensureBucket().catch((e) => {
    bucketReady = null;
    throw e;
  });
  return bucketReady;
}

async function ensureBucket() {
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
  await ensureBucketOnce();

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

export async function getSignedUrls(paths: string[]): Promise<Map<string, string | null>> {
  const urls = new Map<string, string | null>();
  if (paths.length === 0) return urls;

  const { data } = await supabaseAdmin.storage.from(BUCKET).createSignedUrls(paths, 3600);
  for (const entry of data || []) {
    if (entry.path) urls.set(entry.path, entry.error ? null : entry.signedUrl);
  }
  return urls;
}

export async function deleteFile(path: string): Promise<boolean> {
  const { error } = await supabaseAdmin.storage.from(BUCKET).remove([path]);
  return !error;
}
