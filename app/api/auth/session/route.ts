import { getSession } from "@/auth";

export async function GET() {
  const user = await getSession();
  if (!user) return Response.json(null);
  return Response.json(user);
}
