import type { NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSession, handleApiError } from "@/auth";

// Client-side Blob upload token endpoint.
// The frontend calls this to get an upload token, then uploads directly to Blob,
// then includes the returned URL in the claim creation request.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      // Auth runs only during token generation (browser request).
      // The blob.upload-completed callback comes from Vercel's CDN with no
      // session cookie, so checking auth here instead of before handleUpload
      // prevents the callback from hitting a 401 and killing the upload.
      onBeforeGenerateToken: async (_pathname) => {
        const user = await getSession();
        if (!user) throw new Error("Not authenticated");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"],
          maximumSizeInBytes: 10 * 1024 * 1024, // 10 MB
        };
      },
      onUploadCompleted: async () => {
        // No-op for prototype
      },
    });

    return Response.json(jsonResponse);
  } catch (error) {
    return handleApiError(error);
  }
}
