/*
  Browser-side audio upload.

  The file goes straight from the browser to Supabase Storage using a signed
  upload URL minted by /api/lectures. XMLHttpRequest is used rather than fetch
  because it reports real upload progress — a lecture can be tens of megabytes,
  and a progress bar that reflects actual bytes sent beats a spinner that
  guesses.

  The request shape mirrors what supabase-js sends for a raw body, so the whole
  Supabase client does not have to ship to the browser for one PUT. The anon key
  travels as the gateway's apikey; the write itself is authorised only by the
  signed token in the URL.
*/

export class UploadError extends Error {}

export function putToSignedUrl({
  uploadUrl,
  blob,
  contentType,
  onProgress,
}: {
  uploadUrl: string;
  blob: Blob;
  contentType: string;
  onProgress?: (fraction: number) => void;
}): Promise<void> {
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    return Promise.reject(
      new UploadError(
        "This site is missing its Supabase configuration, so audio cannot be uploaded.",
      ),
    );
  }

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("content-type", contentType);
    xhr.setRequestHeader("cache-control", "max-age=3600");
    xhr.setRequestHeader("x-upsert", "true");
    xhr.setRequestHeader("apikey", anonKey);
    xhr.setRequestHeader("authorization", `Bearer ${anonKey}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress?.(event.loaded / event.total);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1);
        resolve();
        return;
      }
      if (xhr.status === 413) {
        reject(new UploadError("Storage rejected the file for being too large."));
        return;
      }
      if (xhr.status === 415) {
        reject(new UploadError("Storage rejected that audio format."));
        return;
      }
      reject(
        new UploadError(
          "The upload was rejected by storage. Please try submitting again.",
        ),
      );
    };

    xhr.onerror = () =>
      reject(
        new UploadError(
          "The upload failed — check your connection and try again.",
        ),
      );
    xhr.ontimeout = () =>
      reject(new UploadError("The upload timed out. Please try again."));
    xhr.onabort = () => reject(new UploadError("The upload was cancelled."));

    xhr.send(blob);
  });
}
