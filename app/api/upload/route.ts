import type { NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSession, handleApiError } from "@/auth";

// Client-side Blob upload token endpoint.
// The frontend calls this to get an upload token, then uploads directly to Blob,
// then includes the returned URL in the claim creation request.
export async function POST(request: NextRequest) {
  try {
    const user = await getSession();
    if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname) => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"],
        maximumSizeInBytes: 10 * 1024 * 1024, // 10 MB
      }),
      onUploadCompleted: async () => {
        // No-op for prototype; production would link the blob to a pending upload record
      },
    });

    return Response.json(jsonResponse);
  } catch (error) {
    return handleApiError(error);
  }
}
