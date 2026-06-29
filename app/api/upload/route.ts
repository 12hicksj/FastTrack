import type { NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { handleApiError } from "@/auth";

// Client-side Blob upload token endpoint.
// Security is provided by the short-lived signed vercel_blob_client_* token
// that this handler generates — no app-level session check is needed or
// possible here, since @vercel/blob's internal fetch does not carry browser
// cookies. The real auth gate is at POST /api/claims where the URLs are used.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"],
        maximumSizeInBytes: 10 * 1024 * 1024, // 10 MB
      }),
      onUploadCompleted: async () => {
        // No-op for prototype
      },
    });

    return Response.json(jsonResponse);
  } catch (error) {
    return handleApiError(error);
  }
}
